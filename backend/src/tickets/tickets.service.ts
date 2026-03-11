import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, CreateCommentDto } from './dto/update-ticket.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AutomationService } from '../automation/automation.service';

const TICKET_SELECT = {
  id: true,
  ticketNumber: true,
  title: true,
  description: true,
  type: true,
  status: true,
  priority: true,
  slaBreached: true,
  dueAt: true,
  resolvedAt: true,
  closedAt: true,
  createdAt: true,
  updatedAt: true,
  createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
  department: { select: { id: true, name: true } },
  slaPolicy: { select: { id: true, name: true, responseTimeHours: true, resolutionTimeHours: true } },
  tags: true,
  _count: { select: { comments: true, attachments: true } },
};

@Injectable()
export class TicketsService {
  // Shared counter for ticket numbering (in production, use DB sequence)
  private static counter: number = 1000;

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
    private automationService: AutomationService,
  ) {}

  private async generateTicketNumber(type: string): Promise<string> {
    const prefix = { INCIDENT: 'INC', REQUEST: 'REQ', CHANGE: 'CHG' }[type] || 'TKT';
    const count = await this.prisma.ticket.count();
    return `${prefix}-${String(count + 1001).padStart(4, '0')}`;
  }

  async create(dto: CreateTicketDto, createdById: string) {
    const ticketNumber = await this.generateTicketNumber(dto.type);

    // Auto-assign SLA based on priority if not provided
    let slaId = dto.slaId;
    if (!slaId) {
      const sla = await this.prisma.slaPolicy.findFirst({
        where: { priority: dto.priority, isActive: true },
      });
      slaId = sla?.id;
    }

    const slaPolicy = slaId
      ? await this.prisma.slaPolicy.findUnique({ where: { id: slaId } })
      : null;

    const dueAt = slaPolicy
      ? new Date(Date.now() + slaPolicy.resolutionTimeHours * 3600000)
      : undefined;

    const { tags, ...rest } = dto;
    const ticket = await this.prisma.ticket.create({
      data: {
        ...rest,
        slaId,
        dueAt,
        ticketNumber,
        createdById,
        tags: tags
          ? { create: tags.map(tag => ({ tag })) }
          : undefined,
      },
      select: TICKET_SELECT,
    });

    await this.auditService.log({
      userId: createdById,
      action: 'create',
      resource: 'tickets',
      resourceId: ticket.id,
      newValues: { ticketNumber, type: dto.type, priority: dto.priority },
    });

    // Fire automation rules asynchronously
    this.automationService.processEvent('ticket.created', ticket).catch(() => {});

    // Notify assigned agent if assigned
    if (dto.assignedToId) {
      await this.notificationsService.create({
        userId: dto.assignedToId,
        title: 'New ticket assigned',
        message: `Ticket ${ticketNumber} has been assigned to you`,
        type: 'TICKET_ASSIGNED',
        metadata: { ticketId: ticket.id },
      });
    }

    return ticket;
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    priority?: string;
    type?: string;
    assignedToId?: string;
    createdById?: string;
    departmentId?: string;
    slaBreached?: boolean;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }) {
    const {
      page = 1, limit = 20, search, status, priority, type,
      assignedToId, createdById, departmentId, slaBreached,
      sortBy = 'createdAt', sortOrder = 'desc',
    } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { ticketNumber: { contains: search } },
        { description: { contains: search } },
      ];
    }
    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (assignedToId) where.assignedToId = assignedToId;
    if (createdById) where.createdById = createdById;
    if (departmentId) where.departmentId = departmentId;
    if (slaBreached !== undefined) where.slaBreached = slaBreached;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        select: TICKET_SELECT,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id, deletedAt: null },
      include: {
        createdBy: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        department: true,
        slaPolicy: true,
        tags: true,
        comments: {
          where: { deletedAt: null },
          orderBy: { createdAt: 'asc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
          },
        },
        attachments: { orderBy: { createdAt: 'desc' } },
      },
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, actorId: string, actorRole: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const data: any = { ...dto };

    // Auto-set timestamps on status change
    if (dto.status === 'RESOLVED' && ticket.status !== 'RESOLVED') {
      data.resolvedAt = new Date();
    }
    if (dto.status === 'CLOSED' && ticket.status !== 'CLOSED') {
      data.closedAt = new Date();
    }

    // Handle tags update
    const { tags, ...updateData } = data;
    if (tags) {
      await this.prisma.ticketTag.deleteMany({ where: { ticketId: id } });
      updateData.tags = { create: tags.map((tag: string) => ({ tag })) };
    }

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: updateData,
      select: TICKET_SELECT,
    });

    await this.auditService.log({
      userId: actorId,
      action: 'update',
      resource: 'tickets',
      resourceId: id,
      oldValues: { status: ticket.status, priority: ticket.priority, assignedToId: ticket.assignedToId },
      newValues: dto,
    });

    // Notify assignee if assignment changed
    if (dto.assignedToId && dto.assignedToId !== ticket.assignedToId) {
      await this.notificationsService.create({
        userId: dto.assignedToId,
        title: 'Ticket assigned to you',
        message: `Ticket ${ticket.ticketNumber} has been assigned to you`,
        type: 'TICKET_ASSIGNED',
        metadata: { ticketId: id },
      });
    }

    this.automationService.processEvent('ticket.updated', updated).catch(() => {});

    return updated;
  }

  async remove(id: string, actorId: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    await this.prisma.ticket.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditService.log({ userId: actorId, action: 'delete', resource: 'tickets', resourceId: id });
  }

  // ── Comments ─────────────────────────────────────────────
  async addComment(ticketId: string, dto: CreateCommentDto, userId: string) {
    const ticket = await this.prisma.ticket.findFirst({ where: { id: ticketId, deletedAt: null } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const comment = await this.prisma.ticketComment.create({
      data: { ticketId, userId, content: dto.content, isInternal: dto.isInternal || false },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
      },
    });

    // Notify ticket creator if they're not the commenter
    if (ticket.createdById !== userId) {
      await this.notificationsService.create({
        userId: ticket.createdById,
        title: 'New comment on your ticket',
        message: `A new comment was added to ticket ${ticket.ticketNumber}`,
        type: 'TICKET_UPDATED',
        metadata: { ticketId },
      });
    }

    return comment;
  }

  async deleteComment(commentId: string, userId: string, userRole: string) {
    const comment = await this.prisma.ticketComment.findUnique({ where: { id: commentId } });
    if (!comment) throw new NotFoundException('Comment not found');

    if (comment.userId !== userId && userRole !== 'Admin') {
      throw new ForbiddenException('Cannot delete another user\'s comment');
    }

    await this.prisma.ticketComment.update({ where: { id: commentId }, data: { deletedAt: new Date() } });
  }

  // ── Stats for dashboard ──────────────────────────────────
  async getStats() {
    const [total, open, inProgress, resolved, critical, slaBreached] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where: { deletedAt: null } }),
      this.prisma.ticket.count({ where: { status: 'OPEN', deletedAt: null } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS', deletedAt: null } }),
      this.prisma.ticket.count({ where: { status: 'RESOLVED', deletedAt: null } }),
      this.prisma.ticket.count({ where: { priority: 'CRITICAL', status: { not: 'CLOSED' }, deletedAt: null } }),
      this.prisma.ticket.count({ where: { slaBreached: true, deletedAt: null } }),
    ]);

    return { total, open, inProgress, resolved, critical, slaBreached };
  }
}

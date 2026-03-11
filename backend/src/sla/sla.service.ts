import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class SlaService {
  private readonly logger = new Logger(SlaService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    @InjectQueue('sla') private slaQueue: Queue,
  ) {}

  /** Called on app start – schedules SLA check job */
  async scheduleSlaChecks() {
    // Remove existing repeatable jobs
    const jobs = await this.slaQueue.getRepeatableJobs();
    for (const job of jobs) {
      await this.slaQueue.removeRepeatableByKey(job.key);
    }
    // Check every 5 minutes
    await this.slaQueue.add('check-sla', {}, { repeat: { cron: '*/5 * * * *' }, removeOnComplete: true });
    this.logger.log('SLA check job scheduled (every 5 minutes)');
  }

  /** Main SLA check – identifies breaches and warnings */
  async checkSlaBreach() {
    const now = new Date();

    // Find tickets that have breached SLA (overdue but not yet marked)
    const breachedTickets = await this.prisma.ticket.findMany({
      where: {
        deletedAt: null,
        slaBreached: false,
        dueAt: { lt: now },
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
      include: {
        assignedTo: true,
        createdBy: true,
        slaPolicy: true,
      },
      take: 100,
    });

    for (const ticket of breachedTickets) {
      await this.prisma.ticket.update({
        where: { id: ticket.id },
        data: { slaBreached: true },
      });

      // Notify assigned agent
      if (ticket.assignedToId) {
        await this.notificationsService.create({
          userId: ticket.assignedToId,
          title: '🚨 SLA Breach',
          message: `Ticket ${ticket.ticketNumber} has breached its SLA. Immediate action required.`,
          type: 'SLA_BREACH',
          metadata: { ticketId: ticket.id },
        });
      }

      // Notify ticket creator
      await this.notificationsService.create({
        userId: ticket.createdById,
        title: 'SLA Breach on your ticket',
        message: `Your ticket ${ticket.ticketNumber} has exceeded its SLA resolution time.`,
        type: 'SLA_BREACH',
        metadata: { ticketId: ticket.id },
      });

      this.logger.warn(`SLA breached: ${ticket.ticketNumber}`);
    }

    return { processed: breachedTickets.length };
  }

  async getSlaPolicies() {
    return this.prisma.slaPolicy.findMany({ orderBy: { priority: 'asc' } });
  }

  async createSlaPolicy(dto: { name: string; priority: any; responseTimeHours: number; resolutionTimeHours: number }) {
    return this.prisma.slaPolicy.create({ data: dto });
  }

  async updateSlaPolicy(id: string, dto: any) {
    return this.prisma.slaPolicy.update({ where: { id }, data: dto });
  }

  async deleteSlaPolicy(id: string) {
    return this.prisma.slaPolicy.update({ where: { id }, data: { isActive: false } });
  }

  /** SLA Compliance metrics for the last 30 days */
  async getSlaMetrics(days: number = 30) {
    const since = new Date(Date.now() - days * 86400000);

    const [total, breached, resolved] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where: { createdAt: { gte: since }, deletedAt: null, slaId: { not: null } } }),
      this.prisma.ticket.count({ where: { createdAt: { gte: since }, slaBreached: true, deletedAt: null } }),
      this.prisma.ticket.count({ where: { createdAt: { gte: since }, status: { in: ['RESOLVED', 'CLOSED'] }, deletedAt: null } }),
    ]);

    const compliance = total > 0 ? Math.round(((total - breached) / total) * 100) : 100;

    // By priority
    const byPriority = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where: { createdAt: { gte: since }, deletedAt: null },
      _count: { id: true },
    });

    return { total, breached, resolved, compliance, byPriority, days };
  }

  /** Tickets at risk of SLA breach in next 2 hours */
  async getAtRiskTickets() {
    const warningWindow = new Date(Date.now() + 2 * 3600000);
    return this.prisma.ticket.findMany({
      where: {
        deletedAt: null,
        slaBreached: false,
        dueAt: { lt: warningWindow, gt: new Date() },
        status: { notIn: ['RESOLVED', 'CLOSED'] },
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true, email: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        slaPolicy: true,
      },
      orderBy: { dueAt: 'asc' },
      take: 50,
    });
  }
}

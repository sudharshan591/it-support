import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface AuditLogDto {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
}

const parseJson = (s: string | null | undefined) => {
  if (!s) return undefined;
  try { return JSON.parse(s); } catch { return undefined; }
};

@Injectable()
export class AuditService {
  constructor(private prisma: PrismaService) {}

  async log(dto: AuditLogDto) {
    return this.prisma.auditLog.create({
      data: {
        ...dto,
        oldValues: dto.oldValues ? JSON.stringify(dto.oldValues) : undefined,
        newValues: dto.newValues ? JSON.stringify(dto.newValues) : undefined,
      },
    });
  }

  async findAll(query: {
    page?: number;
    limit?: number;
    userId?: string;
    resource?: string;
    action?: string;
    startDate?: Date;
    endDate?: Date;
  }) {
    const { page = 1, limit = 20, userId, resource, action, startDate, endDate } = query;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (userId) where.userId = userId;
    if (resource) where.resource = { contains: resource };
    if (action) where.action = { contains: action };
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = startDate;
      if (endDate) where.createdAt.lte = endDate;
    }

    const [data, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    return {
      data: data.map(log => ({
        ...log,
        oldValues: parseJson(log.oldValues as string),
        newValues: parseJson(log.newValues as string),
      })),
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  /** Dashboard KPIs */
  async getDashboardKPIs() {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000);

    const [
      totalTickets, openTickets, inProgressTickets, resolvedThisMonth,
      criticalOpen, slaBreached, totalAssets, assignedAssets,
    ] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where: { deletedAt: null } }),
      this.prisma.ticket.count({ where: { status: 'OPEN', deletedAt: null } }),
      this.prisma.ticket.count({ where: { status: 'IN_PROGRESS', deletedAt: null } }),
      this.prisma.ticket.count({ where: { status: { in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
      this.prisma.ticket.count({ where: { priority: 'CRITICAL', status: { not: 'CLOSED' }, deletedAt: null } }),
      this.prisma.ticket.count({ where: { slaBreached: true, deletedAt: null } }),
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'ASSIGNED', deletedAt: null } }),
    ]);

    // Week-over-week comparison
    const [ticketsThisWeek, ticketsLastWeek] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),
      this.prisma.ticket.count({ where: { createdAt: { gte: new Date(sevenDaysAgo.getTime() - 7 * 86400000), lt: sevenDaysAgo }, deletedAt: null } }),
    ]);

    return {
      totalTickets,
      openTickets,
      inProgressTickets,
      resolvedThisMonth,
      criticalOpen,
      slaBreached,
      totalAssets,
      assignedAssets,
      weekOverWeek: {
        thisWeek: ticketsThisWeek,
        lastWeek: ticketsLastWeek,
        change: ticketsLastWeek > 0 ? Math.round(((ticketsThisWeek - ticketsLastWeek) / ticketsLastWeek) * 100) : 0,
      },
    };
  }

  /** Ticket volume by day for the past N days */
  async getTicketVolume(days: number = 30) {
    const since = new Date(Date.now() - days * 86400000);

    const tickets = await this.prisma.ticket.findMany({
      where: { createdAt: { gte: since }, deletedAt: null },
      select: { createdAt: true, status: true, type: true, priority: true },
    });

    // Group by date
    const grouped: Record<string, { date: string; total: number; incidents: number; requests: number; changes: number }> = {};

    tickets.forEach(t => {
      const date = t.createdAt.toISOString().split('T')[0];
      if (!grouped[date]) {
        grouped[date] = { date, total: 0, incidents: 0, requests: 0, changes: 0 };
      }
      grouped[date].total++;
      if (t.type === 'INCIDENT') grouped[date].incidents++;
      if (t.type === 'REQUEST') grouped[date].requests++;
      if (t.type === 'CHANGE') grouped[date].changes++;
    });

    return Object.values(grouped).sort((a, b) => a.date.localeCompare(b.date));
  }

  /** Tickets by status distribution */
  async getTicketsByStatus() {
    const data = await this.prisma.ticket.groupBy({
      by: ['status'],
      where: { deletedAt: null },
      _count: { id: true },
    });
    return data.map(d => ({ status: d.status, count: d._count.id }));
  }

  /** Tickets by priority distribution */
  async getTicketsByPriority() {
    const data = await this.prisma.ticket.groupBy({
      by: ['priority'],
      where: { deletedAt: null },
      _count: { id: true },
    });
    return data.map(d => ({ priority: d.priority, count: d._count.id }));
  }

  /** Agent performance – ticket counts per agent */
  async getAgentPerformance(days: number = 30) {
    const since = new Date(Date.now() - days * 86400000);

    const agents = await this.prisma.user.findMany({
      where: { role: { name: { in: ['Agent', 'Manager'] } }, isActive: true, deletedAt: null },
      select: {
        id: true, firstName: true, lastName: true, email: true,
        assignedTickets: {
          where: { createdAt: { gte: since }, deletedAt: null },
          select: { status: true, priority: true, resolvedAt: true, createdAt: true, slaBreached: true },
        },
      },
    });

    return agents.map(agent => {
      const tickets = agent.assignedTickets;
      const resolved = tickets.filter(t => ['RESOLVED', 'CLOSED'].includes(t.status));
      const avgResolutionMs = resolved.length > 0
        ? resolved.reduce((acc, t) => acc + (t.resolvedAt ? t.resolvedAt.getTime() - t.createdAt.getTime() : 0), 0) / resolved.length
        : 0;
      const avgResolutionHours = Math.round(avgResolutionMs / 3600000);

      return {
        agentId: agent.id,
        name: `${agent.firstName} ${agent.lastName}`,
        email: agent.email,
        totalAssigned: tickets.length,
        resolved: resolved.length,
        open: tickets.filter(t => t.status === 'OPEN').length,
        inProgress: tickets.filter(t => t.status === 'IN_PROGRESS').length,
        slaBreached: tickets.filter(t => t.slaBreached).length,
        avgResolutionHours,
        resolutionRate: tickets.length > 0 ? Math.round((resolved.length / tickets.length) * 100) : 0,
      };
    }).sort((a, b) => b.resolved - a.resolved);
  }

  /** MTTR (Mean Time to Resolve) */
  async getMTTR(days: number = 30) {
    const since = new Date(Date.now() - days * 86400000);

    const resolved = await this.prisma.ticket.findMany({
      where: { status: { in: ['RESOLVED', 'CLOSED'] }, resolvedAt: { gte: since }, deletedAt: null },
      select: { priority: true, createdAt: true, resolvedAt: true },
    });

    const byPriority: Record<string, number[]> = {};
    resolved.forEach(t => {
      if (!byPriority[t.priority]) byPriority[t.priority] = [];
      if (t.resolvedAt) {
        byPriority[t.priority].push(t.resolvedAt.getTime() - t.createdAt.getTime());
      }
    });

    const result = Object.entries(byPriority).map(([priority, times]) => ({
      priority,
      avgHours: times.length > 0 ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) / 3600000 * 10) / 10 : 0,
      count: times.length,
    }));

    const overall = resolved.length > 0
      ? Math.round(resolved.reduce((acc, t) => acc + (t.resolvedAt ? t.resolvedAt.getTime() - t.createdAt.getTime() : 0), 0) / resolved.length / 3600000 * 10) / 10
      : 0;

    return { overall, byPriority: result, total: resolved.length, days };
  }

  /** Asset utilization */
  async getAssetUtilization() {
    const byType = await this.prisma.asset.groupBy({
      by: ['type', 'status'],
      where: { deletedAt: null },
      _count: { id: true },
    });

    const typeMap: Record<string, any> = {};
    byType.forEach(item => {
      if (!typeMap[item.type]) {
        typeMap[item.type] = { type: item.type, total: 0, available: 0, assigned: 0, inRepair: 0, retired: 0 };
      }
      typeMap[item.type].total += item._count.id;
      if (item.status === 'AVAILABLE') typeMap[item.type].available += item._count.id;
      if (item.status === 'ASSIGNED') typeMap[item.type].assigned += item._count.id;
      if (item.status === 'IN_REPAIR') typeMap[item.type].inRepair += item._count.id;
      if (item.status === 'RETIRED') typeMap[item.type].retired += item._count.id;
    });

    return Object.values(typeMap).map(t => ({
      ...t,
      utilizationRate: t.total > 0 ? Math.round((t.assigned / t.total) * 100) : 0,
    }));
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';

const parseJson = (s: string) => { try { return JSON.parse(s); } catch { return {}; } };

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private prisma: PrismaService,
    @InjectQueue('automation') private automationQueue: Queue,
  ) {}

  async create(dto: CreateRuleDto) {
    const data: any = { ...dto };
    if (dto.trigger) data.trigger = JSON.stringify(dto.trigger);
    if (dto.conditions) data.conditions = JSON.stringify(dto.conditions);
    if (dto.actions) data.actions = JSON.stringify(dto.actions);
    return this.parseRule(await this.prisma.automationRule.create({ data }));
  }

  async findAll(query: { page?: number; limit?: number; isActive?: boolean }) {
    const { page = 1, limit = 20, isActive } = query;
    const skip = (page - 1) * limit;
    const where: any = {};
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.automationRule.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
      this.prisma.automationRule.count({ where }),
    ]);

    return { data: data.map(this.parseRule), meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    return rule ? this.parseRule(rule) : null;
  }

  async update(id: string, dto: Partial<CreateRuleDto>) {
    const data: any = { ...dto };
    if (dto.trigger) data.trigger = JSON.stringify(dto.trigger);
    if (dto.conditions) data.conditions = JSON.stringify(dto.conditions);
    if (dto.actions) data.actions = JSON.stringify(dto.actions);
    return this.parseRule(await this.prisma.automationRule.update({ where: { id }, data }));
  }

  async remove(id: string) {
    return this.prisma.automationRule.delete({ where: { id } });
  }

  async toggleActive(id: string) {
    const rule = await this.prisma.automationRule.findUnique({ where: { id } });
    return this.parseRule(await this.prisma.automationRule.update({
      where: { id },
      data: { isActive: !rule.isActive },
    }));
  }

  private parseRule(rule: any) {
    return {
      ...rule,
      trigger: typeof rule.trigger === 'string' ? parseJson(rule.trigger) : rule.trigger,
      conditions: typeof rule.conditions === 'string' ? parseJson(rule.conditions) : rule.conditions,
      actions: typeof rule.actions === 'string' ? parseJson(rule.actions) : rule.actions,
    };
  }

  async processEvent(event: string, ticketData: any) {
    try {
      await this.automationQueue.add('process-rules', { event, ticketData }, {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
      });
    } catch (err) {
      this.logger.warn(`Failed to queue automation event: ${err.message}`);
    }
  }

  async evaluateRules(event: string, ticketData: any) {
    const rules = await this.prisma.automationRule.findMany({ where: { isActive: true } });

    for (const rule of rules) {
      const trigger = parseJson(rule.trigger as string);
      if (trigger.event !== event) continue;

      const conditions = parseJson(rule.conditions as string);
      const conditionsMet = this.evaluateConditions(Array.isArray(conditions) ? conditions : [], ticketData);

      if (conditionsMet) {
        const actions = parseJson(rule.actions as string);
        await this.executeActions(Array.isArray(actions) ? actions : [], ticketData, rule.id);
      }
    }
  }

  private evaluateConditions(conditions: any[], data: any): boolean {
    if (!conditions || conditions.length === 0) return true;

    return conditions.every(condition => {
      const fieldValue = this.getNestedValue(data, condition.field);

      switch (condition.operator) {
        case 'equals':      return fieldValue === condition.value;
        case 'not_equals':  return fieldValue !== condition.value;
        case 'contains':    return String(fieldValue).includes(condition.value);
        case 'in':          return Array.isArray(condition.value) && condition.value.includes(fieldValue);
        case 'not_in':      return Array.isArray(condition.value) && !condition.value.includes(fieldValue);
        case 'is_null':     return fieldValue === null || fieldValue === undefined;
        case 'is_not_null': return fieldValue !== null && fieldValue !== undefined;
        default:            return false;
      }
    });
  }

  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((acc, key) => acc?.[key], obj);
  }

  private async executeActions(actions: any[], ticketData: any, ruleId: string) {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'assign':
            if (action.params.userId) {
              await this.prisma.ticket.update({
                where: { id: ticketData.id },
                data: { assignedToId: action.params.userId, status: 'IN_PROGRESS' },
              });
            }
            break;

          case 'update_status':
            await this.prisma.ticket.update({
              where: { id: ticketData.id },
              data: { status: action.params.status },
            });
            break;

          case 'update_priority':
            await this.prisma.ticket.update({
              where: { id: ticketData.id },
              data: { priority: action.params.priority },
            });
            break;

          case 'notify':
            if (action.params.userId) {
              await this.prisma.notification.create({
                data: {
                  userId: action.params.userId,
                  title: 'Automation Alert',
                  message: action.params.message || 'An automation rule was triggered',
                  type: 'SYSTEM',
                  metadata: JSON.stringify({ ruleId, ticketId: ticketData.id }),
                },
              });
            }
            break;

          case 'add_tag':
            if (action.params.tag) {
              await this.prisma.ticketTag.upsert({
                where: { ticketId_tag: { ticketId: ticketData.id, tag: action.params.tag } },
                update: {},
                create: { ticketId: ticketData.id, tag: action.params.tag },
              });
            }
            break;
        }
      } catch (err) {
        this.logger.error(`Failed to execute action ${action.type}: ${err.message}`);
      }
    }

    await this.prisma.automationRule.update({
      where: { id: ruleId },
      data: { executedCount: { increment: 1 }, lastExecutedAt: new Date() },
    });
  }
}

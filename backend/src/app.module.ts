import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TicketsModule } from './tickets/tickets.module';
import { AssetsModule } from './assets/assets.module';
import { SlaModule } from './sla/sla.module';
import { AutomationModule } from './automation/automation.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReportsModule } from './reports/reports.module';
import { KnowledgeBaseModule } from './knowledge-base/kb.module';
import { AuditModule } from './audit/audit.module';

@Module({
  imports: [
    // Rate limiting
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 100 },
      { name: 'long', ttl: 60000, limit: 500 },
    ]),

    // BullMQ queues via Redis
    BullModule.forRoot({
      redis: process.env.REDIS_URL || 'redis://localhost:6379',
    }),

    PrismaModule,
    AuthModule,
    UsersModule,
    TicketsModule,
    AssetsModule,
    SlaModule,
    AutomationModule,
    NotificationsModule,
    ReportsModule,
    KnowledgeBaseModule,
    AuditModule,
  ],
})
export class AppModule {}

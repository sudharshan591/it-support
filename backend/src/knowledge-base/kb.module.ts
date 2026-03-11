import { Module } from '@nestjs/common';
import { KbController } from './kb.controller';
import { KbService } from './kb.service';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [AuditModule],
  controllers: [KbController],
  providers: [KbService],
  exports: [KbService],
})
export class KnowledgeBaseModule {}

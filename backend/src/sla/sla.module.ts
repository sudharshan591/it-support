import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { SlaController } from './sla.controller';
import { SlaService } from './sla.service';
import { SlaProcessor } from './sla.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'sla' }),
    NotificationsModule,
  ],
  controllers: [SlaController],
  providers: [SlaService, SlaProcessor],
  exports: [SlaService],
})
export class SlaModule {}

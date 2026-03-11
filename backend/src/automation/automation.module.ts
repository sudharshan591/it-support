import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { AutomationController } from './automation.controller';
import { AutomationService } from './automation.service';
import { AutomationProcessor } from './automation.processor';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'automation' }),
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationProcessor],
  exports: [AutomationService],
})
export class AutomationModule {}

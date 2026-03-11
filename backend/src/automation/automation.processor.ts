import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { AutomationService } from './automation.service';

@Processor('automation')
export class AutomationProcessor {
  private readonly logger = new Logger(AutomationProcessor.name);

  constructor(private automationService: AutomationService) {}

  @Process('process-rules')
  async handleProcessRules(job: Job<{ event: string; ticketData: any }>) {
    const { event, ticketData } = job.data;
    this.logger.debug(`Processing automation rules for event: ${event}, ticket: ${ticketData?.id}`);

    try {
      await this.automationService.evaluateRules(event, ticketData);
    } catch (err) {
      this.logger.error(`Automation processing failed: ${err.message}`, err.stack);
      throw err;
    }
  }
}

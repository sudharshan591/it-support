import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { SlaService } from './sla.service';

@Processor('sla')
export class SlaProcessor {
  private readonly logger = new Logger(SlaProcessor.name);

  constructor(private slaService: SlaService) {}

  @Process('check-sla')
  async handleSlaCheck(job: Job) {
    this.logger.debug('Running SLA breach check...');
    const result = await this.slaService.checkSlaBreach();
    this.logger.debug(`SLA check complete. Breaches detected: ${result.processed}`);
  }
}

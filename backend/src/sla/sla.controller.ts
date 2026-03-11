import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { SlaService } from './sla.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('SLA')
@ApiBearerAuth()
@Controller('sla')
export class SlaController {
  constructor(private slaService: SlaService) {}

  @Get('policies')
  @ApiOperation({ summary: 'List SLA policies' })
  getPolicies() {
    return this.slaService.getSlaPolicies();
  }

  @Post('policies')
  @Roles('sla:manage', 'Admin')
  @ApiOperation({ summary: 'Create SLA policy' })
  create(@Body() dto: any) {
    return this.slaService.createSlaPolicy(dto);
  }

  @Patch('policies/:id')
  @Roles('sla:manage', 'Admin')
  @ApiOperation({ summary: 'Update SLA policy' })
  update(@Param('id') id: string, @Body() dto: any) {
    return this.slaService.updateSlaPolicy(id, dto);
  }

  @Delete('policies/:id')
  @Roles('sla:manage', 'Admin')
  @ApiOperation({ summary: 'Deactivate SLA policy' })
  remove(@Param('id') id: string) {
    return this.slaService.deleteSlaPolicy(id);
  }

  @Get('metrics')
  @Roles('reports:read', 'Manager', 'Admin')
  @ApiOperation({ summary: 'SLA compliance metrics' })
  getMetrics(@Query('days') days?: number) {
    return this.slaService.getSlaMetrics(days ? +days : 30);
  }

  @Get('at-risk')
  @Roles('tickets:read')
  @ApiOperation({ summary: 'Tickets at risk of SLA breach' })
  getAtRisk() {
    return this.slaService.getAtRiskTickets();
  }
}

import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Reports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private reportsService: ReportsService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Dashboard KPI data' })
  getDashboard() {
    return this.reportsService.getDashboardKPIs();
  }

  @Get('ticket-volume')
  @Roles('reports:read', 'Manager', 'Admin')
  @ApiOperation({ summary: 'Ticket volume over time' })
  getTicketVolume(@Query('days') days?: number) {
    return this.reportsService.getTicketVolume(days ? +days : 30);
  }

  @Get('tickets-by-status')
  @ApiOperation({ summary: 'Tickets by status distribution' })
  getByStatus() {
    return this.reportsService.getTicketsByStatus();
  }

  @Get('tickets-by-priority')
  @ApiOperation({ summary: 'Tickets by priority distribution' })
  getByPriority() {
    return this.reportsService.getTicketsByPriority();
  }

  @Get('agent-performance')
  @Roles('reports:read', 'Manager', 'Admin')
  @ApiOperation({ summary: 'Agent performance metrics' })
  getAgentPerformance(@Query('days') days?: number) {
    return this.reportsService.getAgentPerformance(days ? +days : 30);
  }

  @Get('mttr')
  @Roles('reports:read', 'Manager', 'Admin')
  @ApiOperation({ summary: 'Mean time to resolve (MTTR)' })
  getMTTR(@Query('days') days?: number) {
    return this.reportsService.getMTTR(days ? +days : 30);
  }

  @Get('asset-utilization')
  @Roles('reports:read', 'Manager', 'Admin')
  @ApiOperation({ summary: 'Asset utilization by type' })
  getAssetUtilization() {
    return this.reportsService.getAssetUtilization();
  }
}

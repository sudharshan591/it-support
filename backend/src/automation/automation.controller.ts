import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { CreateRuleDto } from './dto/create-rule.dto';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Automation')
@ApiBearerAuth()
@Controller('automation/rules')
export class AutomationController {
  constructor(private automationService: AutomationService) {}

  @Post()
  @Roles('automation:manage', 'Admin')
  @ApiOperation({ summary: 'Create automation rule' })
  create(@Body() dto: CreateRuleDto) {
    return this.automationService.create(dto);
  }

  @Get()
  @Roles('automation:manage', 'Admin', 'Manager')
  @ApiOperation({ summary: 'List automation rules' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('isActive') isActive?: string,
  ) {
    return this.automationService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get(':id')
  @Roles('automation:manage', 'Admin')
  @ApiOperation({ summary: 'Get rule by ID' })
  findOne(@Param('id') id: string) {
    return this.automationService.findOne(id);
  }

  @Patch(':id')
  @Roles('automation:manage', 'Admin')
  @ApiOperation({ summary: 'Update rule' })
  update(@Param('id') id: string, @Body() dto: Partial<CreateRuleDto>) {
    return this.automationService.update(id, dto);
  }

  @Patch(':id/toggle')
  @Roles('automation:manage', 'Admin')
  @ApiOperation({ summary: 'Toggle rule active/inactive' })
  toggle(@Param('id') id: string) {
    return this.automationService.toggleActive(id);
  }

  @Delete(':id')
  @Roles('automation:manage', 'Admin')
  @ApiOperation({ summary: 'Delete rule' })
  remove(@Param('id') id: string) {
    return this.automationService.remove(id);
  }
}

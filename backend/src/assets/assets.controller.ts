import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AssetsService } from './assets.service';
import { CreateAssetDto, AssignAssetDto } from './dto/create-asset.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Assets')
@ApiBearerAuth()
@Controller('assets')
export class AssetsController {
  constructor(private assetsService: AssetsService) {}

  @Post()
  @Roles('assets:create')
  @ApiOperation({ summary: 'Create asset' })
  create(@Body() dto: CreateAssetDto, @CurrentUser('id') actorId: string) {
    return this.assetsService.create(dto, actorId);
  }

  @Get()
  @Roles('assets:read')
  @ApiOperation({ summary: 'List assets with filters' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('type') type?: string,
    @Query('status') status?: string,
  ) {
    return this.assetsService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      search, type, status,
    });
  }

  @Get('stats')
  @Roles('assets:read')
  @ApiOperation({ summary: 'Asset statistics' })
  getStats() {
    return this.assetsService.getStats();
  }

  @Get(':id')
  @Roles('assets:read')
  @ApiOperation({ summary: 'Get asset by ID' })
  findOne(@Param('id') id: string) {
    return this.assetsService.findOne(id);
  }

  @Patch(':id')
  @Roles('assets:update')
  @ApiOperation({ summary: 'Update asset' })
  update(@Param('id') id: string, @Body() dto: any, @CurrentUser('id') actorId: string) {
    return this.assetsService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('assets:delete')
  @ApiOperation({ summary: 'Delete asset' })
  remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.assetsService.remove(id, actorId);
  }

  @Post(':id/assign')
  @Roles('assets:update')
  @ApiOperation({ summary: 'Assign asset to user' })
  assign(@Param('id') id: string, @Body() dto: AssignAssetDto, @CurrentUser('id') actorId: string) {
    return this.assetsService.assign(id, dto, actorId);
  }

  @Post(':id/unassign')
  @Roles('assets:update')
  @ApiOperation({ summary: 'Return asset (unassign)' })
  unassign(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.assetsService.unassign(id, actorId);
  }
}

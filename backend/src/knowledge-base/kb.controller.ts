import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { KbService } from './kb.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Knowledge Base')
@ApiBearerAuth()
@Controller('kb')
export class KbController {
  constructor(private kbService: KbService) {}

  @Post()
  @Roles('kb:create')
  @ApiOperation({ summary: 'Create KB article' })
  create(@Body() dto: CreateArticleDto, @CurrentUser('id') authorId: string) {
    return this.kbService.create(dto, authorId);
  }

  @Get()
  @Roles('kb:read')
  @ApiOperation({ summary: 'List KB articles' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('isPublished') isPublished?: string,
    @CurrentUser('roleName') roleName?: string,
  ) {
    return this.kbService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      search,
      category,
      isPublished: isPublished !== undefined ? isPublished === 'true' : undefined,
      isAdmin: ['Admin', 'Manager', 'Agent'].includes(roleName || ''),
    });
  }

  @Get('popular')
  @Roles('kb:read')
  @ApiOperation({ summary: 'Most viewed articles' })
  getPopular(@Query('limit') limit?: number) {
    return this.kbService.getPopular(limit ? +limit : 5);
  }

  @Get(':id')
  @Roles('kb:read')
  @ApiOperation({ summary: 'Get article by ID' })
  findOne(@Param('id') id: string, @CurrentUser('roleName') roleName: string) {
    return this.kbService.findOne(id, ['Admin', 'Manager', 'Agent'].includes(roleName));
  }

  @Patch(':id')
  @Roles('kb:update')
  @ApiOperation({ summary: 'Update KB article' })
  update(
    @Param('id') id: string,
    @Body() dto: Partial<CreateArticleDto>,
    @CurrentUser('id') actorId: string,
  ) {
    return this.kbService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('kb:delete')
  @ApiOperation({ summary: 'Delete KB article' })
  remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.kbService.remove(id, actorId);
  }
}

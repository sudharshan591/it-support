import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
  UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto, CreateCommentDto } from './dto/update-ticket.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(
    private ticketsService: TicketsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @Roles('tickets:create')
  @ApiOperation({ summary: 'Create a ticket' })
  create(@Body() dto: CreateTicketDto, @CurrentUser('id') userId: string) {
    return this.ticketsService.create(dto, userId);
  }

  @Get()
  @Roles('tickets:read')
  @ApiOperation({ summary: 'List tickets with filters' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('type') type?: string,
    @Query('assignedToId') assignedToId?: string,
    @Query('createdById') createdById?: string,
    @Query('departmentId') departmentId?: string,
    @Query('slaBreached') slaBreached?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    return this.ticketsService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      search,
      status,
      priority,
      type,
      assignedToId,
      createdById,
      departmentId,
      slaBreached: slaBreached !== undefined ? slaBreached === 'true' : undefined,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  @Roles('tickets:read')
  @ApiOperation({ summary: 'Get ticket statistics' })
  getStats() {
    return this.ticketsService.getStats();
  }

  @Get(':id')
  @Roles('tickets:read')
  @ApiOperation({ summary: 'Get ticket by ID' })
  findOne(@Param('id') id: string) {
    return this.ticketsService.findOne(id);
  }

  @Patch(':id')
  @Roles('tickets:update')
  @ApiOperation({ summary: 'Update ticket' })
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser('id') userId: string,
    @CurrentUser('roleName') roleName: string,
  ) {
    return this.ticketsService.update(id, dto, userId, roleName);
  }

  @Delete(':id')
  @Roles('tickets:delete')
  @ApiOperation({ summary: 'Delete ticket' })
  remove(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.ticketsService.remove(id, userId);
  }

  // ── Comments ──────────────────────────────────────────────
  @Post(':id/comments')
  @Roles('tickets:read')
  @ApiOperation({ summary: 'Add comment to ticket' })
  addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('id') userId: string,
  ) {
    return this.ticketsService.addComment(id, dto, userId);
  }

  @Delete(':id/comments/:commentId')
  @ApiOperation({ summary: 'Delete comment' })
  deleteComment(
    @Param('commentId') commentId: string,
    @CurrentUser('id') userId: string,
    @CurrentUser('roleName') roleName: string,
  ) {
    return this.ticketsService.deleteComment(commentId, userId, roleName);
  }

  // ── File Upload ───────────────────────────────────────────
  @Post(':id/attachments')
  @Roles('tickets:read')
  @ApiOperation({ summary: 'Upload attachment to ticket' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: join(process.cwd(), 'uploads', 'tickets'),
        filename: (_, file, cb) => {
          const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, unique + extname(file.originalname));
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
    }),
  )
  async uploadAttachment(
    @Param('id') ticketId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.prisma.attachment.create({
      data: {
        ticketId,
        fileName: file.originalname,
        fileUrl: `/uploads/tickets/${file.filename}`,
        fileSize: file.size,
        mimeType: file.mimetype,
      },
    });
  }

  // ── SLA Policies ──────────────────────────────────────────
  @Get('/meta/sla-policies')
  @ApiOperation({ summary: 'List SLA policies' })
  getSLAPolicies() {
    return this.prisma.slaPolicy.findMany({ where: { isActive: true }, orderBy: { priority: 'asc' } });
  }
}

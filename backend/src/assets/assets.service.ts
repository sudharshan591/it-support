import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAssetDto, AssignAssetDto } from './dto/create-asset.dto';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class AssetsService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async create(dto: CreateAssetDto, actorId: string) {
    const existing = await this.prisma.asset.findUnique({ where: { assetTag: dto.assetTag } });
    if (existing) throw new ConflictException(`Asset tag ${dto.assetTag} already exists`);

    const asset = await this.prisma.asset.create({
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : undefined,
      },
    });

    await this.auditService.log({ userId: actorId, action: 'create', resource: 'assets', resourceId: asset.id, newValues: { assetTag: asset.assetTag, name: asset.name, type: asset.type } });
    return asset;
  }

  async findAll(query: { page?: number; limit?: number; search?: string; type?: string; status?: string }) {
    const { page = 1, limit = 20, search, type, status } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { assetTag: { contains: search } },
        { serialNumber: { contains: search } },
      ];
    }
    if (type) where.type = type;
    if (status) where.status = status;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.asset.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          assignments: {
            where: { returnedAt: null },
            include: {
              user: { select: { id: true, firstName: true, lastName: true, email: true } },
            },
            take: 1,
            orderBy: { assignedAt: 'desc' },
          },
        },
      }),
      this.prisma.asset.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const asset = await this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      include: {
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
    });
    if (!asset) throw new NotFoundException('Asset not found');
    return asset;
  }

  async update(id: string, dto: Partial<CreateAssetDto> & { status?: string }, actorId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');

    const updated = await this.prisma.asset.update({
      where: { id },
      data: {
        ...dto,
        purchaseDate: dto.purchaseDate ? new Date(dto.purchaseDate) : undefined,
        warrantyEnd: dto.warrantyEnd ? new Date(dto.warrantyEnd) : undefined,
      },
    });

    await this.auditService.log({ userId: actorId, action: 'update', resource: 'assets', resourceId: id, oldValues: { status: asset.status }, newValues: dto });
    return updated;
  }

  async remove(id: string, actorId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');
    await this.prisma.asset.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.auditService.log({ userId: actorId, action: 'delete', resource: 'assets', resourceId: id });
  }

  async assign(id: string, dto: AssignAssetDto, actorId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');
    if (asset.status === 'ASSIGNED') throw new BadRequestException('Asset is already assigned');

    await this.prisma.$transaction([
      this.prisma.assetAssignment.create({
        data: { assetId: id, userId: dto.userId, notes: dto.notes },
      }),
      this.prisma.asset.update({ where: { id }, data: { status: 'ASSIGNED' } }),
    ]);

    await this.notificationsService.create({
      userId: dto.userId,
      title: 'Asset assigned to you',
      message: `${asset.name} (${asset.assetTag}) has been assigned to you`,
      type: 'ASSET_ASSIGNED',
      metadata: { assetId: id },
    });

    await this.auditService.log({ userId: actorId, action: 'assign', resource: 'assets', resourceId: id, newValues: { assignedTo: dto.userId } });
    return this.findOne(id);
  }

  async unassign(id: string, actorId: string) {
    const asset = await this.prisma.asset.findFirst({ where: { id, deletedAt: null } });
    if (!asset) throw new NotFoundException('Asset not found');

    const activeAssignment = await this.prisma.assetAssignment.findFirst({
      where: { assetId: id, returnedAt: null },
    });

    if (!activeAssignment) throw new BadRequestException('Asset is not currently assigned');

    await this.prisma.$transaction([
      this.prisma.assetAssignment.update({
        where: { id: activeAssignment.id },
        data: { returnedAt: new Date() },
      }),
      this.prisma.asset.update({ where: { id }, data: { status: 'AVAILABLE' } }),
    ]);

    await this.auditService.log({ userId: actorId, action: 'unassign', resource: 'assets', resourceId: id });
    return this.findOne(id);
  }

  async getStats() {
    const [total, available, assigned, inRepair, retired] = await this.prisma.$transaction([
      this.prisma.asset.count({ where: { deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'AVAILABLE', deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'ASSIGNED', deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'IN_REPAIR', deletedAt: null } }),
      this.prisma.asset.count({ where: { status: 'RETIRED', deletedAt: null } }),
    ]);
    return { total, available, assigned, inRepair, retired };
  }
}

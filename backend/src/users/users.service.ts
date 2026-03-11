import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuditService } from '../audit/audit.service';

const USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatarUrl: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: { select: { id: true, name: true } },
  department: { select: { id: true, name: true } },
};

@Injectable()
export class UsersService {
  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async create(dto: CreateUserDto, actorId?: string) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (existing) throw new ConflictException('Email already in use');

    const hashed = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: { ...dto, email: dto.email.toLowerCase(), password: hashed },
      select: USER_SELECT,
    });

    await this.auditService.log({ userId: actorId, action: 'create', resource: 'users', resourceId: user.id, newValues: { email: user.email } });
    return user;
  }

  async findAll(query: { page?: number; limit?: number; search?: string; roleId?: string; departmentId?: string; isActive?: boolean }) {
    const { page = 1, limit = 20, search, roleId, departmentId, isActive } = query;
    const skip = (page - 1) * limit;

    const where: any = { deletedAt: null };
    if (search) {
      where.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { email: { contains: search } },
      ];
    }
    if (roleId) where.roleId = roleId;
    if (departmentId) where.departmentId = departmentId;
    if (isActive !== undefined) where.isActive = isActive;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' }, select: USER_SELECT }),
      this.prisma.user.count({ where }),
    ]);

    return { data, meta: { total, page, limit, totalPages: Math.ceil(total / limit) } };
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: { ...USER_SELECT, _count: { select: { createdTickets: true, assignedTickets: true, assetAssignments: true } } },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async update(id: string, dto: UpdateUserDto, actorId?: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    const data: any = { ...dto };
    if (dto.password) data.password = await argon2.hash(dto.password);
    if (dto.email) data.email = dto.email.toLowerCase();

    const updated = await this.prisma.user.update({ where: { id }, data, select: USER_SELECT });

    await this.auditService.log({
      userId: actorId,
      action: 'update',
      resource: 'users',
      resourceId: id,
      oldValues: { email: user.email, isActive: user.isActive },
      newValues: dto,
    });

    return updated;
  }

  async remove(id: string, actorId?: string) {
    const user = await this.prisma.user.findFirst({ where: { id, deletedAt: null } });
    if (!user) throw new NotFoundException('User not found');

    await this.prisma.user.update({ where: { id }, data: { deletedAt: new Date(), isActive: false } });
    await this.auditService.log({ userId: actorId, action: 'delete', resource: 'users', resourceId: id });
  }

  // ── Roles & Departments ────────────────────────────────────
  async getRoles() {
    return this.prisma.role.findMany({
      include: { _count: { select: { users: true } }, permissions: { include: { permission: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async getDepartments() {
    return this.prisma.department.findMany({
      include: { _count: { select: { users: true, tickets: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async createDepartment(name: string) {
    return this.prisma.department.create({ data: { name } });
  }

  async getPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ resource: 'asc' }, { action: 'asc' }] });
  }
}

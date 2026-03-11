import {
  Controller, Get, Post, Patch, Delete, Body, Param, Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post()
  @Roles('users:create', 'Admin')
  @ApiOperation({ summary: 'Create a new user' })
  create(@Body() dto: CreateUserDto, @CurrentUser('id') actorId: string) {
    return this.usersService.create(dto, actorId);
  }

  @Get()
  @Roles('users:read')
  @ApiOperation({ summary: 'List users with filters and pagination' })
  findAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('roleId') roleId?: string,
    @Query('departmentId') departmentId?: string,
    @Query('isActive') isActive?: string,
  ) {
    return this.usersService.findAll({
      page: page ? +page : 1,
      limit: limit ? +limit : 20,
      search,
      roleId,
      departmentId,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
    });
  }

  @Get('roles')
  @Roles('users:read')
  @ApiOperation({ summary: 'List all roles' })
  getRoles() {
    return this.usersService.getRoles();
  }

  @Get('departments')
  @ApiOperation({ summary: 'List all departments' })
  getDepartments() {
    return this.usersService.getDepartments();
  }

  @Get('permissions')
  @Roles('Admin')
  @ApiOperation({ summary: 'List all permissions' })
  getPermissions() {
    return this.usersService.getPermissions();
  }

  @Get(':id')
  @Roles('users:read')
  @ApiOperation({ summary: 'Get a user by ID' })
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(':id')
  @Roles('users:update')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() dto: UpdateUserDto, @CurrentUser('id') actorId: string) {
    return this.usersService.update(id, dto, actorId);
  }

  @Delete(':id')
  @Roles('users:delete', 'Admin')
  @ApiOperation({ summary: 'Soft delete user' })
  remove(@Param('id') id: string, @CurrentUser('id') actorId: string) {
    return this.usersService.remove(id, actorId);
  }

  @Post('departments')
  @Roles('Admin')
  @ApiOperation({ summary: 'Create department' })
  createDepartment(@Body('name') name: string) {
    return this.usersService.createDepartment(name);
  }
}

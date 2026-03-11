import { IsString, IsEnum, IsOptional, IsUUID } from 'class-validator';

const TICKET_STATUSES = ['OPEN', 'IN_PROGRESS', 'PENDING', 'RESOLVED', 'CLOSED'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(TICKET_STATUSES)
  status?: string;

  @IsOptional()
  @IsEnum(PRIORITIES)
  priority?: string;

  @IsOptional()
  @IsUUID()
  assignedToId?: string;

  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @IsOptional()
  @IsUUID()
  slaId?: string;

  @IsOptional()
  tags?: string[];
}

export class CreateCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  isInternal?: boolean = false;
}

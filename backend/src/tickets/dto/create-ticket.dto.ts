import { IsString, IsEnum, IsOptional, IsUUID, MinLength } from 'class-validator';

const TICKET_TYPES = ['INCIDENT', 'REQUEST', 'CHANGE'] as const;
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;

export class CreateTicketDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(10)
  description: string;

  @IsEnum(TICKET_TYPES)
  type: string;

  @IsEnum(PRIORITIES)
  priority: string;

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

import { IsString, IsBoolean, IsOptional, IsObject, IsArray } from 'class-validator';

export class CreateRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsObject()
  trigger: {
    event: 'ticket.created' | 'ticket.updated' | 'ticket.resolved' | 'ticket.sla_warning';
  };

  @IsArray()
  conditions: Array<{
    field: string;
    operator: 'equals' | 'not_equals' | 'contains' | 'in' | 'not_in' | 'is_null' | 'is_not_null';
    value: any;
  }>;

  @IsArray()
  actions: Array<{
    type: 'assign' | 'notify' | 'update_status' | 'update_priority' | 'add_tag';
    params: Record<string, any>;
  }>;
}

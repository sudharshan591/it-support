import { IsString, IsEnum, IsOptional, IsDateString } from 'class-validator';

const ASSET_TYPES = ['LAPTOP', 'DESKTOP', 'SERVER', 'NETWORK', 'PHONE', 'PRINTER', 'SOFTWARE', 'OTHER'] as const;

export class CreateAssetDto {
  @IsString()
  assetTag: string;

  @IsString()
  name: string;

  @IsEnum(ASSET_TYPES)
  type: string;

  @IsOptional()
  @IsString()
  manufacturer?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsString()
  serialNumber?: string;

  @IsOptional()
  @IsDateString()
  purchaseDate?: string;

  @IsOptional()
  @IsDateString()
  warrantyEnd?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  ipAddress?: string;

  @IsOptional()
  @IsString()
  macAddress?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class AssignAssetDto {
  @IsString()
  userId: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

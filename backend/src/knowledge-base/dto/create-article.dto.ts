import { IsString, IsBoolean, IsOptional, IsArray, MinLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(5)
  title: string;

  @IsString()
  @MinLength(20)
  content: string;

  @IsString()
  category: string;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsBoolean()
  isPublished?: boolean = false;
}

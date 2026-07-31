import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';

export class NewsQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Substring filter (case-insensitive) — matches News.title',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by a specific NewsTag id' })
  @IsOptional()
  @IsString()
  tagId?: string;
}

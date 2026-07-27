import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description:
      'Substring filter (case-insensitive) — matches Profile.name or any AuthMethod.identifier',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

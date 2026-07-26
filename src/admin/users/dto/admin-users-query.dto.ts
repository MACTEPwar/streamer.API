import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';
import { PaginationQueryDto } from '../../../shared/dto/pagination-query.dto';

export class AdminUsersQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({
    description: 'Login substring filter (case-insensitive)',
  })
  @IsOptional()
  @IsString()
  login?: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

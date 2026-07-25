import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import { Role } from '../../../generated/prisma/enums';

const ASSIGNABLE_ROLES = [Role.USER, Role.ADMIN] as const;

export class UpdateUserRoleDto {
  @ApiProperty({ enum: ASSIGNABLE_ROLES, example: Role.ADMIN })
  @IsIn(ASSIGNABLE_ROLES)
  role: Role;
}

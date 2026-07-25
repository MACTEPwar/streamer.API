import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../../generated/prisma/enums';

export class AdminUserDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  login: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: 'local', nullable: true })
  provider: string | null;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2026-01-01T00:00:00.000Z' })
  updatedAt: Date;
}

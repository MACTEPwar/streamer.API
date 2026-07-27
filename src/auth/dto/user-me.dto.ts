import { ApiProperty } from '@nestjs/swagger';
import { AuthMethodType, Role } from '../../generated/prisma/enums';

export class AuthMethodSummaryDto {
  @ApiProperty({ enum: AuthMethodType, example: AuthMethodType.LOCAL })
  type: AuthMethodType;
}

export class UserMeDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'John Doe', nullable: true })
  name: string | null;

  @ApiProperty({ example: 'https://example.com/avatar.png', nullable: true })
  avatarUrl: string | null;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ type: [AuthMethodSummaryDto] })
  authMethods: AuthMethodSummaryDto[];
}

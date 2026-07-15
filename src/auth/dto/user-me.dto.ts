import { ApiProperty } from '@nestjs/swagger';
import { Role } from '../../generated/prisma/enums';

export class UserMeDto {
  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'johndoe' })
  login: string;

  @ApiProperty({ enum: Role, example: Role.USER })
  role: Role;

  @ApiProperty({ example: 'johndoe@example.com', nullable: true })
  email: string | null;
}

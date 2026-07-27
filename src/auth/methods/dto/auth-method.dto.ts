import { ApiProperty } from '@nestjs/swagger';
import { AuthMethodType } from '../../../generated/prisma/enums';

export class AuthMethodDto {
  @ApiProperty({ enum: AuthMethodType, example: AuthMethodType.LOCAL })
  type: AuthMethodType;

  @ApiProperty({ example: 'johndoe' })
  identifier: string;
}

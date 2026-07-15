import { ApiProperty } from '@nestjs/swagger';
import { Theme } from '../../generated/prisma/enums';

export class SettingsDto {
  @ApiProperty({ example: 'cly1a2b3c0002abcd1234efgh' })
  id: string;

  @ApiProperty({ example: 'cly1a2b3c0000abcd1234efgh' })
  userId: string;

  @ApiProperty({ enum: Theme, example: Theme.SYSTEM })
  theme: Theme;

  @ApiProperty({ example: true })
  receiveNotifications: boolean;
}

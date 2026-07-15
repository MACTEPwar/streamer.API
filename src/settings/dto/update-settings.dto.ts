import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { Theme } from '../../generated/prisma/enums';

export class UpdateSettingsDto {
  @ApiPropertyOptional({ enum: Theme, example: Theme.DARK })
  @IsOptional()
  @IsEnum(Theme)
  theme?: Theme;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  receiveNotifications?: boolean;
}

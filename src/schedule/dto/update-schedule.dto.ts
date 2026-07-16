import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class UpdateScheduleDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  isOnline: boolean;

  @ApiPropertyOptional({
    example: 'Совместный стрим',
    nullable: true,
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  eventTitle?: string;

  @ApiPropertyOptional({ example: '19:00', nullable: true })
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/, {
    message: 'time должно быть в формате HH:MM',
  })
  time?: string;
}

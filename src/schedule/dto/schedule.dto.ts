import { ApiProperty } from '@nestjs/swagger';
import { Weekday } from '../../generated/prisma/enums';

export class ScheduleDto {
  @ApiProperty({ example: 'cly1a2b3c0003abcd1234efgh' })
  id: string;

  @ApiProperty({ enum: Weekday, example: Weekday.MONDAY })
  weekday: Weekday;

  @ApiProperty({ example: true })
  isOnline: boolean;

  @ApiProperty({ example: 'Совместный стрим', nullable: true })
  eventTitle: string | null;

  @ApiProperty({ example: '19:00', nullable: true })
  time: string | null;
}

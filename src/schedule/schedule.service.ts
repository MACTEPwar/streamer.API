import { Injectable } from '@nestjs/common';
import { Schedule } from '../generated/prisma/client';
import { Weekday } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { WEEKDAY_ORDER } from './constants/weekday-order.constant';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class ScheduleService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(): Promise<Schedule[]> {
    const days = await this.prisma.schedule.findMany();
    const byWeekday = new Map(days.map((day) => [day.weekday, day]));

    return WEEKDAY_ORDER.map((weekday) => byWeekday.get(weekday)).filter(
      (day): day is Schedule => day !== undefined,
    );
  }

  update(weekday: Weekday, dto: UpdateScheduleDto): Promise<Schedule> {
    return this.prisma.schedule.update({
      where: { weekday },
      data: {
        isOnline: dto.isOnline,
        eventTitle: dto.isOnline ? (dto.eventTitle ?? null) : null,
        time: dto.isOnline ? (dto.time ?? null) : null,
      },
    });
  }
}

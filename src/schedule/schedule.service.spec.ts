import { Weekday } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ScheduleService } from './schedule.service';

describe('ScheduleService', () => {
  let service: ScheduleService;
  const prismaMock = {
    schedule: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ScheduleService(prismaMock as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns days ordered Monday through Sunday regardless of DB order', async () => {
      const unordered = [
        {
          id: '7',
          weekday: Weekday.SUNDAY,
          isOnline: false,
          eventTitle: null,
          time: null,
        },
        {
          id: '3',
          weekday: Weekday.WEDNESDAY,
          isOnline: false,
          eventTitle: null,
          time: null,
        },
        {
          id: '1',
          weekday: Weekday.MONDAY,
          isOnline: false,
          eventTitle: null,
          time: null,
        },
      ];
      prismaMock.schedule.findMany.mockResolvedValue(unordered);

      const result = await service.findAll();

      expect(result.map((d) => d.weekday)).toEqual([
        Weekday.MONDAY,
        Weekday.WEDNESDAY,
        Weekday.SUNDAY,
      ]);
    });
  });

  describe('update', () => {
    it('clears eventTitle and time when isOnline is false, even if provided', async () => {
      prismaMock.schedule.update.mockResolvedValue({});

      await service.update(Weekday.MONDAY, {
        isOnline: false,
        eventTitle: 'Should be ignored',
        time: '19:00',
      });

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { weekday: Weekday.MONDAY },
        data: { isOnline: false, eventTitle: null, time: null },
      });
    });

    it('keeps eventTitle and time when isOnline is true', async () => {
      prismaMock.schedule.update.mockResolvedValue({});

      await service.update(Weekday.MONDAY, {
        isOnline: true,
        eventTitle: 'Совместный стрим',
        time: '19:00',
      });

      expect(prismaMock.schedule.update).toHaveBeenCalledWith({
        where: { weekday: Weekday.MONDAY },
        data: {
          isOnline: true,
          eventTitle: 'Совместный стрим',
          time: '19:00',
        },
      });
    });
  });
});

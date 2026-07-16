import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Role, Weekday } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../shared/filters/http-exception.filter';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';

describe('ScheduleController (guards)', () => {
  let app: INestApplication;

  const scheduleService = {
    findAll: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({
      id: 's1',
      weekday: Weekday.MONDAY,
      isOnline: true,
      eventTitle: 'Совместный стрим',
      time: '19:00',
    }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ScheduleController],
      providers: [
        { provide: ScheduleService, useValue: scheduleService },
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: {} },
        JwtAuthGuard,
        RolesGuard,
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    await app.init();
  });

  afterEach(() => jest.clearAllMocks());

  afterAll(async () => {
    await app.close();
  });

  it('rejects PATCH without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/schedule/MONDAY')
      .send({ isOnline: true })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects PATCH from a non-ADMIN user with 403', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    const res = await request(app.getHttpServer())
      .patch('/schedule/MONDAY')
      .set('Cookie', 'access_token=fake')
      .send({ isOnline: true })
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
    expect(scheduleService.update).not.toHaveBeenCalled();
  });

  it('allows PATCH from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .patch('/schedule/MONDAY')
      .set('Cookie', 'access_token=fake')
      .send({ isOnline: true, eventTitle: 'Совместный стрим', time: '19:00' })
      .expect(200);

    expect(scheduleService.update).toHaveBeenCalledWith(Weekday.MONDAY, {
      isOnline: true,
      eventTitle: 'Совместный стрим',
      time: '19:00',
    });
  });
});

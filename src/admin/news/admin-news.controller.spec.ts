import { BadRequestException, INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../../shared/filters/http-exception.filter';
import { AdminNewsController } from './admin-news.controller';
import { AdminNewsService } from './admin-news.service';

describe('AdminNewsController (guards)', () => {
  let app: INestApplication;

  const validBody = {
    title: 'Открыт турнир',
    description: 'Описание',
    imageUrls: ['/uploads/existing.jpg'],
    tagIds: [],
  };

  const adminNewsService = {
    create: jest.fn().mockResolvedValue({ id: 'news-1' }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminNewsController],
      providers: [
        { provide: AdminNewsService, useValue: adminNewsService },
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

  it('rejects POST without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/admin/news')
      .send(validBody)
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects POST from a non-ADMIN user with 403', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    const res = await request(app.getHttpServer())
      .post('/admin/news')
      .set('Cookie', 'access_token=fake')
      .send(validBody)
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
    expect(adminNewsService.create).not.toHaveBeenCalled();
  });

  it('allows POST from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .post('/admin/news')
      .set('Cookie', 'access_token=fake')
      .send(validBody)
      .expect(201);

    expect(adminNewsService.create).toHaveBeenCalledWith(validBody);
  });

  it('returns 400 when image download/validation fails', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    adminNewsService.create.mockRejectedValueOnce(
      new BadRequestException('Ссылка на приватный/локальный адрес запрещена'),
    );

    const res = await request(app.getHttpServer())
      .post('/admin/news')
      .set('Cookie', 'access_token=fake')
      .send(validBody)
      .expect(400);

    expect((res.body as ErrorResponseDto).statusCode).toBe(400);
  });
});

import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../shared/filters/http-exception.filter';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

describe('ProfileController (guards)', () => {
  let app: INestApplication;

  const profileService = {
    findByUserId: jest.fn().mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      email: 'johndoe@example.com',
      name: 'John Doe',
      avatarUrl: null,
    }),
    update: jest.fn().mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      email: 'johndoe@example.com',
      name: 'John Doe',
      avatarUrl: null,
    }),
    updateAvatar: jest.fn().mockResolvedValue({
      id: 'p1',
      userId: 'u1',
      email: 'johndoe@example.com',
      name: 'John Doe',
      avatarUrl: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png',
    }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [
        { provide: ProfileService, useValue: profileService },
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: {} },
        JwtAuthGuard,
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

  it('rejects GET without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer()).get('/profile').expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects PATCH /profile without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/profile')
      .send({ name: 'John Doe' })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects PATCH /profile/avatar without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/profile/avatar')
      .send({ avatarUrl: '/uploads/preset-1.png' })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('updates name via PATCH /profile for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .patch('/profile')
      .set('Cookie', 'access_token=fake')
      .send({ name: 'John Doe' })
      .expect(200);

    expect(profileService.update).toHaveBeenCalledWith('u1', {
      name: 'John Doe',
    });
  });

  it('updates avatarUrl via PATCH /profile/avatar for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .patch('/profile/avatar')
      .set('Cookie', 'access_token=fake')
      .send({ avatarUrl: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png' })
      .expect(200);

    expect(profileService.updateAvatar).toHaveBeenCalledWith('u1', {
      avatarUrl: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png',
    });
  });
});

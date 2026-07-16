import { INestApplication } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import request from 'supertest';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../shared/filters/http-exception.filter';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import {
  AUTH_THROTTLE_LIMIT,
  AUTH_THROTTLE_TTL,
} from './constants/throttle.constant';
import { GoogleAuthService } from './google-auth.service';
import { LocalAuthService } from './local-auth.service';

describe('Auth throttling', () => {
  let app: INestApplication;

  const rawUser = {
    id: 'user-1',
    login: 'johndoe',
    role: Role.USER,
    provider: null,
    passwordHash: '$2b$10$hashedpassword',
    googleId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    profile: { email: null },
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        ThrottlerModule.forRoot([
          { ttl: AUTH_THROTTLE_TTL, limit: AUTH_THROTTLE_LIMIT },
        ]),
      ],
      controllers: [AuthController],
      providers: [
        ThrottlerGuard,
        {
          provide: AuthService,
          useValue: {
            issueToken: jest.fn().mockReturnValue('signed.jwt.token'),
            setAuthCookie: jest.fn(),
            clearAuthCookie: jest.fn(),
          },
        },
        {
          provide: LocalAuthService,
          useValue: {
            register: jest.fn().mockResolvedValue(rawUser),
            validateCredentials: jest.fn().mockResolvedValue(rawUser),
          },
        },
        { provide: GoogleAuthService, useValue: { authenticate: jest.fn() } },
        {
          provide: PrismaService,
          useValue: { user: { findUniqueOrThrow: jest.fn() } },
        },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 429 in the unified error format after exceeding the /auth/login attempt limit', async () => {
    for (let i = 0; i < AUTH_THROTTLE_LIMIT; i++) {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({ login: 'johndoe', password: 'secret123' })
        .expect(200);
    }

    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ login: 'johndoe', password: 'secret123' })
      .expect(429);

    const body = res.body as ErrorResponseDto;
    expect(body.statusCode).toBe(429);
    expect(body.path).toBe('/auth/login');
    expect(typeof body.error).toBe('string');
    expect(typeof body.timestamp).toBe('string');
  });

  it('returns 429 in the unified error format after exceeding the /auth/register attempt limit', async () => {
    for (let i = 0; i < AUTH_THROTTLE_LIMIT; i++) {
      await request(app.getHttpServer())
        .post('/auth/register')
        .send({ login: `user${i}`, password: 'secret123' })
        .expect(201);
    }

    const res = await request(app.getHttpServer())
      .post('/auth/register')
      .send({ login: 'one-more', password: 'secret123' })
      .expect(429);

    const body = res.body as ErrorResponseDto;
    expect(body.statusCode).toBe(429);
    expect(body.path).toBe('/auth/register');
    expect(typeof body.error).toBe('string');
    expect(typeof body.timestamp).toBe('string');
  });
});

import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import type { Response } from 'express';
import request from 'supertest';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { LocalAuthService } from './local-auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const rawUser = {
    id: 'user-1',
    login: 'johndoe',
    role: Role.USER,
    provider: null,
    passwordHash: '$2b$10$hashedpassword',
    googleId: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    profile: { email: 'johndoe@example.com' },
  };

  const authService = {
    issueToken: jest.fn().mockReturnValue('signed.jwt.token'),
    setAuthCookie: jest.fn(),
    clearAuthCookie: jest.fn(),
  };
  const localAuthService = {
    register: jest.fn().mockResolvedValue(rawUser),
    validateCredentials: jest.fn().mockResolvedValue(rawUser),
    changePassword: jest.fn().mockResolvedValue(undefined),
  };
  const googleAuthService = {
    authenticate: jest.fn().mockResolvedValue(rawUser),
  };
  const prismaService = {
    user: { findUniqueOrThrow: jest.fn().mockResolvedValue(rawUser) },
  };

  const res = {
    cookie: jest.fn(),
    clearCookie: jest.fn(),
  } as unknown as Response;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
      controllers: [AuthController],
      providers: [
        ThrottlerGuard,
        { provide: AuthService, useValue: authService },
        { provide: LocalAuthService, useValue: localAuthService },
        { provide: GoogleAuthService, useValue: googleAuthService },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    controller = module.get(AuthController);
  });

  const expectNoSensitiveFields = (result: unknown) => {
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(JSON.stringify(result)).not.toContain('hashedpassword');
    expect(JSON.stringify(result)).not.toContain('googleId');
  };

  it('register response does not leak passwordHash', async () => {
    const result = await controller.register(
      { login: 'johndoe', password: 'secret' },
      res,
    );

    expectNoSensitiveFields(result);
    expect(result).toEqual({
      id: 'user-1',
      login: 'johndoe',
      role: Role.USER,
      email: 'johndoe@example.com',
    });
  });

  it('login response does not leak passwordHash', async () => {
    const result = await controller.login(
      { login: 'johndoe', password: 'secret' },
      res,
    );

    expectNoSensitiveFields(result);
  });

  it('google response does not leak passwordHash', async () => {
    const result = await controller.google({ idToken: 'id-token' }, res);

    expectNoSensitiveFields(result);
  });

  it('me response does not leak passwordHash', async () => {
    const result = await controller.me({
      user: { id: 'user-1', role: Role.USER },
    } as never);

    expectNoSensitiveFields(result);
  });
});

describe('AuthController /auth/change-password', () => {
  let app: INestApplication;

  const authService = {
    verifyToken: jest.fn(),
  };
  const localAuthService = {
    changePassword: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 5 }])],
      controllers: [AuthController],
      providers: [
        ThrottlerGuard,
        { provide: AuthService, useValue: authService },
        { provide: LocalAuthService, useValue: localAuthService },
        { provide: GoogleAuthService, useValue: {} },
        { provide: PrismaService, useValue: {} },
        JwtAuthGuard,
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

  it('rejects a request without an auth cookie with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/change-password')
      .send({ currentPassword: 'old-secret', newPassword: 'new-secret-1' })
      .expect(401);

    expect(localAuthService.changePassword).not.toHaveBeenCalled();
  });

  it('rejects a request when currentPassword is wrong with 401', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'user-1',
      role: Role.USER,
    });
    localAuthService.changePassword.mockRejectedValue(
      new UnauthorizedException('Неверный логин или пароль'),
    );

    await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', 'access_token=fake')
      .send({ currentPassword: 'wrong-secret', newPassword: 'new-secret-1' })
      .expect(401);
  });

  it('changes the password with a valid currentPassword', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'user-1',
      role: Role.USER,
    });
    localAuthService.changePassword.mockResolvedValue(undefined);

    const res = await request(app.getHttpServer())
      .post('/auth/change-password')
      .set('Cookie', 'access_token=fake')
      .send({ currentPassword: 'old-secret', newPassword: 'new-secret-1' })
      .expect(200);

    expect(res.body).toEqual({ success: true });
    expect(localAuthService.changePassword).toHaveBeenCalledWith('user-1', {
      currentPassword: 'old-secret',
      newPassword: 'new-secret-1',
    });
  });
});

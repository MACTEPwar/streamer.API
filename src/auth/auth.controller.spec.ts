import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import type { Response } from 'express';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { GoogleAuthService } from './google-auth.service';
import { LocalAuthService } from './local-auth.service';

describe('AuthController', () => {
  let controller: AuthController;

  const rawUser = {
    id: 'user-1',
    role: Role.USER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    profile: { name: 'John Doe', avatarUrl: 'https://example.com/avatar.png' },
    authMethods: [{ type: 'LOCAL' }],
  };

  const authService = {
    issueToken: jest.fn().mockReturnValue('signed.jwt.token'),
    setAuthCookie: jest.fn(),
    clearAuthCookie: jest.fn(),
  };
  const localAuthService = {
    register: jest.fn().mockResolvedValue(rawUser),
    validateCredentials: jest.fn().mockResolvedValue(rawUser),
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
    expect(JSON.stringify(result)).not.toContain('googleId');
  };

  it('register response does not leak passwordHash and maps to UserMeDto', async () => {
    const result = await controller.register(
      { login: 'johndoe', password: 'secret' },
      res,
    );

    expectNoSensitiveFields(result);
    expect(result).toEqual({
      id: 'user-1',
      role: Role.USER,
      name: 'John Doe',
      avatarUrl: 'https://example.com/avatar.png',
      authMethods: [{ type: 'LOCAL' }],
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

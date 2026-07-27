import {
  ClassSerializerInterceptor,
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { APP_FILTER, Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../../auth/auth.service';
import { UserEntity } from '../../auth/entities/user.entity';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../../shared/filters/http-exception.filter';
import { AdminUsersController } from './admin-users.controller';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersController (guards)', () => {
  let app: INestApplication;

  const adminUsersService = {
    findAll: jest.fn().mockResolvedValue({
      items: [
        { id: 'u1', name: 'user1', role: Role.USER, authMethods: ['LOCAL'] },
      ],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    findOne: jest.fn().mockResolvedValue({
      id: 'u2',
      name: null,
      role: Role.USER,
      authMethods: ['LOCAL'],
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-01'),
      avatarUrl: null,
      gameAccounts: [],
      socialLinks: [],
    }),
    updateRole: jest.fn().mockResolvedValue({ id: 'u2', role: Role.ADMIN }),
    remove: jest.fn().mockResolvedValue({ id: 'u2', role: Role.USER }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        { provide: AdminUsersService, useValue: adminUsersService },
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

  it('rejects GET without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects GET from a non-ADMIN user with 403', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', 'access_token=fake')
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
    expect(adminUsersService.findAll).not.toHaveBeenCalled();
  });

  it('allows GET from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(adminUsersService.findAll).toHaveBeenCalled();
  });

  it('rejects GET /:id without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users/u2')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects GET /:id from a non-ADMIN user with 403', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    const res = await request(app.getHttpServer())
      .get('/admin/users/u2')
      .set('Cookie', 'access_token=fake')
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
    expect(adminUsersService.findOne).not.toHaveBeenCalled();
  });

  it('allows GET /:id from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .get('/admin/users/u2')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(adminUsersService.findOne).toHaveBeenCalledWith('u2');
  });

  it('returns 404 when getting a non-existent user by id', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    adminUsersService.findOne.mockRejectedValueOnce(
      new NotFoundException('Пользователь не найден'),
    );

    const res = await request(app.getHttpServer())
      .get('/admin/users/missing')
      .set('Cookie', 'access_token=fake')
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });

  it('allows PATCH role from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .patch('/admin/users/u2/role')
      .set('Cookie', 'access_token=fake')
      .send({ role: 'ADMIN' })
      .expect(200);

    expect(adminUsersService.updateRole).toHaveBeenCalledWith(
      'admin1',
      'u2',
      'ADMIN',
    );
  });

  it('returns 403 when an ADMIN tries to change own role', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    adminUsersService.updateRole.mockRejectedValueOnce(
      new ForbiddenException('Нельзя изменить роль или удалить самого себя'),
    );

    const res = await request(app.getHttpServer())
      .patch('/admin/users/admin1/role')
      .set('Cookie', 'access_token=fake')
      .send({ role: 'USER' })
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
  });

  it('returns 404 when updating role of a non-existent user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    adminUsersService.updateRole.mockRejectedValueOnce(
      new NotFoundException('Пользователь не найден'),
    );

    const res = await request(app.getHttpServer())
      .patch('/admin/users/missing/role')
      .set('Cookie', 'access_token=fake')
      .send({ role: 'USER' })
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });

  it('allows DELETE from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .delete('/admin/users/u2')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(adminUsersService.remove).toHaveBeenCalledWith('admin1', 'u2');
  });

  it('returns 403 when an ADMIN tries to delete self', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    adminUsersService.remove.mockRejectedValueOnce(
      new ForbiddenException('Нельзя изменить роль или удалить самого себя'),
    );

    const res = await request(app.getHttpServer())
      .delete('/admin/users/admin1')
      .set('Cookie', 'access_token=fake')
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
  });

  it('returns 404 when deleting a non-existent user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    adminUsersService.remove.mockRejectedValueOnce(
      new NotFoundException('Пользователь не найден'),
    );

    const res = await request(app.getHttpServer())
      .delete('/admin/users/missing')
      .set('Cookie', 'access_token=fake')
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });
});

describe('AdminUsersController (serialization)', () => {
  let app: INestApplication;

  const rawUser = {
    id: 'u2',
    role: Role.USER,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  const adminUsersService = {
    findAll: jest.fn().mockResolvedValue({
      items: [new UserEntity(rawUser)],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    }),
    updateRole: jest.fn().mockResolvedValue(new UserEntity(rawUser)),
    remove: jest.fn().mockResolvedValue(new UserEntity(rawUser)),
  };

  const authService = {
    verifyToken: jest
      .fn()
      .mockResolvedValue({ sub: 'admin1', role: Role.ADMIN }),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminUsersController],
      providers: [
        { provide: AdminUsersService, useValue: adminUsersService },
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: {} },
        JwtAuthGuard,
        RolesGuard,
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    app.use(cookieParser());
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('does not leak passwordHash/googleId in GET /admin/users', async () => {
    const res = await request(app.getHttpServer())
      .get('/admin/users')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('googleId');
  });

  it('does not leak passwordHash/googleId in PATCH /admin/users/:id/role', async () => {
    const res = await request(app.getHttpServer())
      .patch('/admin/users/u2/role')
      .set('Cookie', 'access_token=fake')
      .send({ role: 'ADMIN' })
      .expect(200);

    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('googleId');
  });

  it('does not leak passwordHash/googleId in DELETE /admin/users/:id', async () => {
    const res = await request(app.getHttpServer())
      .delete('/admin/users/u2')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(JSON.stringify(res.body)).not.toContain('passwordHash');
    expect(JSON.stringify(res.body)).not.toContain('googleId');
  });
});

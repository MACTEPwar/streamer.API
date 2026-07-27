import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  INestApplication,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { Role } from '../../generated/prisma/enums';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../../shared/filters/http-exception.filter';
import { AuthService } from '../auth.service';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { AuthMethodsController } from './auth-methods.controller';
import { AuthMethodsService } from './auth-methods.service';

describe('AuthMethodsController', () => {
  let app: INestApplication;

  const authMethodsService = {
    findAll: jest
      .fn()
      .mockResolvedValue([{ type: 'LOCAL', identifier: 'johndoe' }]),
    addLocal: jest.fn().mockResolvedValue(undefined),
    changeLocalPassword: jest.fn().mockResolvedValue(undefined),
    addGoogle: jest.fn().mockResolvedValue(undefined),
    remove: jest.fn().mockResolvedValue(undefined),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AuthMethodsController],
      providers: [
        { provide: AuthMethodsService, useValue: authMethodsService },
        { provide: AuthService, useValue: authService },
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

  const authCookie = () =>
    authService.verifyToken.mockResolvedValue({
      sub: 'user-1',
      role: Role.USER,
    });

  it('rejects GET /auth/methods without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/methods')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
    expect(authMethodsService.findAll).not.toHaveBeenCalled();
  });

  it('returns the current user methods for GET /auth/methods', async () => {
    authCookie();

    const res = await request(app.getHttpServer())
      .get('/auth/methods')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(res.body).toEqual([{ type: 'LOCAL', identifier: 'johndoe' }]);
    expect(authMethodsService.findAll).toHaveBeenCalledWith('user-1');
  });

  it('rejects POST /auth/methods/local without an auth cookie with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/methods/local')
      .send({ login: 'johndoe', password: 'secret123' })
      .expect(401);

    expect(authMethodsService.addLocal).not.toHaveBeenCalled();
  });

  it('returns 409 when the user already has a LOCAL method', async () => {
    authCookie();
    authMethodsService.addLocal.mockRejectedValueOnce(
      new ConflictException('У аккаунта уже есть локальный метод входа'),
    );

    await request(app.getHttpServer())
      .post('/auth/methods/local')
      .set('Cookie', 'access_token=fake')
      .send({ login: 'johndoe', password: 'secret123' })
      .expect(409);
  });

  it('adds a LOCAL method for an authenticated user', async () => {
    authCookie();

    const res = await request(app.getHttpServer())
      .post('/auth/methods/local')
      .set('Cookie', 'access_token=fake')
      .send({ login: 'johndoe', password: 'secret123' })
      .expect(201);

    expect(res.body).toEqual({ success: true });
    expect(authMethodsService.addLocal).toHaveBeenCalledWith('user-1', {
      login: 'johndoe',
      password: 'secret123',
    });
  });

  it('rejects PATCH /auth/methods/local/password without an auth cookie with 401', async () => {
    await request(app.getHttpServer())
      .patch('/auth/methods/local/password')
      .send({ currentPassword: 'old', newPassword: 'new-secret-1' })
      .expect(401);

    expect(authMethodsService.changeLocalPassword).not.toHaveBeenCalled();
  });

  it('returns 400 when the user has no LOCAL method', async () => {
    authCookie();
    authMethodsService.changeLocalPassword.mockRejectedValueOnce(
      new BadRequestException('У аккаунта нет локального метода входа'),
    );

    await request(app.getHttpServer())
      .patch('/auth/methods/local/password')
      .set('Cookie', 'access_token=fake')
      .send({ currentPassword: 'old', newPassword: 'new-secret-1' })
      .expect(400);
  });

  it('returns 401 when currentPassword is wrong', async () => {
    authCookie();
    authMethodsService.changeLocalPassword.mockRejectedValueOnce(
      new UnauthorizedException('Неверный текущий пароль'),
    );

    await request(app.getHttpServer())
      .patch('/auth/methods/local/password')
      .set('Cookie', 'access_token=fake')
      .send({ currentPassword: 'wrong', newPassword: 'new-secret-1' })
      .expect(401);
  });

  it('changes the LOCAL password with a valid currentPassword', async () => {
    authCookie();

    const res = await request(app.getHttpServer())
      .patch('/auth/methods/local/password')
      .set('Cookie', 'access_token=fake')
      .send({ currentPassword: 'old-secret', newPassword: 'new-secret-1' })
      .expect(200);

    expect(res.body).toEqual({ success: true });
  });

  it('rejects POST /auth/methods/google without an auth cookie with 401', async () => {
    await request(app.getHttpServer())
      .post('/auth/methods/google')
      .send({ idToken: 'token' })
      .expect(401);

    expect(authMethodsService.addGoogle).not.toHaveBeenCalled();
  });

  it('returns 409 when the googleId is already linked to another user', async () => {
    authCookie();
    authMethodsService.addGoogle.mockRejectedValueOnce(
      new ConflictException(
        'Этот Google-аккаунт уже привязан к другому пользователю',
      ),
    );

    await request(app.getHttpServer())
      .post('/auth/methods/google')
      .set('Cookie', 'access_token=fake')
      .send({ idToken: 'token' })
      .expect(409);
  });

  it('links Google for an authenticated user', async () => {
    authCookie();

    const res = await request(app.getHttpServer())
      .post('/auth/methods/google')
      .set('Cookie', 'access_token=fake')
      .send({ idToken: 'token' })
      .expect(200);

    expect(res.body).toEqual({ success: true });
  });

  it('rejects DELETE /auth/methods/:type without an auth cookie with 401', async () => {
    await request(app.getHttpServer())
      .delete('/auth/methods/LOCAL')
      .expect(401);

    expect(authMethodsService.remove).not.toHaveBeenCalled();
  });

  it('returns 400 on an invalid :type value', async () => {
    authCookie();

    await request(app.getHttpServer())
      .delete('/auth/methods/INVALID')
      .set('Cookie', 'access_token=fake')
      .expect(400);
  });

  it('returns 403 when it is the last remaining method', async () => {
    authCookie();
    authMethodsService.remove.mockRejectedValueOnce(
      new ForbiddenException(
        'Нельзя отключить последний оставшийся метод входа',
      ),
    );

    await request(app.getHttpServer())
      .delete('/auth/methods/LOCAL')
      .set('Cookie', 'access_token=fake')
      .expect(403);
  });

  it('returns 404 when the user has no method of that type', async () => {
    authCookie();
    authMethodsService.remove.mockRejectedValueOnce(
      new NotFoundException('Метод входа не найден'),
    );

    await request(app.getHttpServer())
      .delete('/auth/methods/GOOGLE')
      .set('Cookie', 'access_token=fake')
      .expect(404);
  });

  it('removes a method for an authenticated user', async () => {
    authCookie();

    const res = await request(app.getHttpServer())
      .delete('/auth/methods/GOOGLE')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(res.body).toEqual({ success: true });
    expect(authMethodsService.remove).toHaveBeenCalledWith('user-1', 'GOOGLE');
  });
});

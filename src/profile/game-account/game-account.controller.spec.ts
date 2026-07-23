import {
  ForbiddenException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../../shared/filters/http-exception.filter';
import { GameAccountController } from './game-account.controller';
import { GameAccountService } from './game-account.service';

describe('GameAccountController (guards)', () => {
  let app: INestApplication;

  const gameAccountService = {
    findAllByUserId: jest.fn().mockResolvedValue([
      {
        id: 'ga1',
        userId: 'u1',
        nickname: 'ProNickname',
        externalId: '76561198000000000',
      },
    ]),
    create: jest.fn().mockResolvedValue({
      id: 'ga1',
      userId: 'u1',
      nickname: 'ProNickname',
      externalId: '76561198000000000',
    }),
    update: jest.fn().mockResolvedValue({
      id: 'ga1',
      userId: 'u1',
      nickname: 'NewNickname',
      externalId: '76561198000000000',
    }),
    remove: jest.fn().mockResolvedValue({
      id: 'ga1',
      userId: 'u1',
      nickname: 'ProNickname',
      externalId: '76561198000000000',
    }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [GameAccountController],
      providers: [
        { provide: GameAccountService, useValue: gameAccountService },
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
    const res = await request(app.getHttpServer())
      .get('/profile/game-accounts')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects POST without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/profile/game-accounts')
      .send({ nickname: 'ProNickname', externalId: '76561198000000000' })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects PATCH without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/profile/game-accounts/ga1')
      .send({ nickname: 'NewNickname' })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects DELETE without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .delete('/profile/game-accounts/ga1')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('lists own game accounts for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .get('/profile/game-accounts')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(gameAccountService.findAllByUserId).toHaveBeenCalledWith('u1');
  });

  it('creates a game account for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .post('/profile/game-accounts')
      .set('Cookie', 'access_token=fake')
      .send({ nickname: 'ProNickname', externalId: '76561198000000000' })
      .expect(201);

    expect(gameAccountService.create).toHaveBeenCalledWith('u1', {
      nickname: 'ProNickname',
      externalId: '76561198000000000',
    });
  });

  it('updates own game account for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .patch('/profile/game-accounts/ga1')
      .set('Cookie', 'access_token=fake')
      .send({ nickname: 'NewNickname' })
      .expect(200);

    expect(gameAccountService.update).toHaveBeenCalledWith('u1', 'ga1', {
      nickname: 'NewNickname',
    });
  });

  it('returns 403 when updating a game account owned by another user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    gameAccountService.update.mockRejectedValueOnce(
      new ForbiddenException('Not the owner of this game account'),
    );

    const res = await request(app.getHttpServer())
      .patch('/profile/game-accounts/ga2')
      .set('Cookie', 'access_token=fake')
      .send({ nickname: 'NewNickname' })
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
  });

  it('returns 404 when updating a non-existent game account', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    gameAccountService.update.mockRejectedValueOnce(
      new NotFoundException('Game account not found'),
    );

    const res = await request(app.getHttpServer())
      .patch('/profile/game-accounts/missing')
      .set('Cookie', 'access_token=fake')
      .send({ nickname: 'NewNickname' })
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });

  it('deletes own game account for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .delete('/profile/game-accounts/ga1')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(gameAccountService.remove).toHaveBeenCalledWith('u1', 'ga1');
  });

  it('returns 403 when deleting a game account owned by another user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    gameAccountService.remove.mockRejectedValueOnce(
      new ForbiddenException('Not the owner of this game account'),
    );

    const res = await request(app.getHttpServer())
      .delete('/profile/game-accounts/ga2')
      .set('Cookie', 'access_token=fake')
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
  });

  it('returns 404 when deleting a non-existent game account', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    gameAccountService.remove.mockRejectedValueOnce(
      new NotFoundException('Game account not found'),
    );

    const res = await request(app.getHttpServer())
      .delete('/profile/game-accounts/missing')
      .set('Cookie', 'access_token=fake')
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });
});

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
import { Role, SocialLinkType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../../shared/filters/http-exception.filter';
import { SocialLinkController } from './social-link.controller';
import { SocialLinkService } from './social-link.service';

describe('SocialLinkController (guards)', () => {
  let app: INestApplication;

  const socialLinkService = {
    findAllByUserId: jest.fn().mockResolvedValue([
      {
        id: 'sl1',
        userId: 'u1',
        type: SocialLinkType.TELEGRAM,
        value: '@streamer_nick',
      },
    ]),
    create: jest.fn().mockResolvedValue({
      id: 'sl1',
      userId: 'u1',
      type: SocialLinkType.TELEGRAM,
      value: '@streamer_nick',
    }),
    update: jest.fn().mockResolvedValue({
      id: 'sl1',
      userId: 'u1',
      type: SocialLinkType.TELEGRAM,
      value: '@new_nick',
    }),
    remove: jest.fn().mockResolvedValue({
      id: 'sl1',
      userId: 'u1',
      type: SocialLinkType.TELEGRAM,
      value: '@streamer_nick',
    }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [SocialLinkController],
      providers: [
        { provide: SocialLinkService, useValue: socialLinkService },
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
      .get('/profile/social-links')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects POST without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/profile/social-links')
      .send({ type: SocialLinkType.TELEGRAM, value: '@streamer_nick' })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects PATCH without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .patch('/profile/social-links/sl1')
      .send({ value: '@new_nick' })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects DELETE without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .delete('/profile/social-links/sl1')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('lists own social links for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .get('/profile/social-links')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(socialLinkService.findAllByUserId).toHaveBeenCalledWith('u1');
  });

  it('creates a social link for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .post('/profile/social-links')
      .set('Cookie', 'access_token=fake')
      .send({ type: SocialLinkType.TELEGRAM, value: '@streamer_nick' })
      .expect(201);

    expect(socialLinkService.create).toHaveBeenCalledWith('u1', {
      type: SocialLinkType.TELEGRAM,
      value: '@streamer_nick',
    });
  });

  it('updates own social link for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .patch('/profile/social-links/sl1')
      .set('Cookie', 'access_token=fake')
      .send({ value: '@new_nick' })
      .expect(200);

    expect(socialLinkService.update).toHaveBeenCalledWith('u1', 'sl1', {
      value: '@new_nick',
    });
  });

  it('returns 403 when updating a social link owned by another user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    socialLinkService.update.mockRejectedValueOnce(
      new ForbiddenException('Not the owner of this social link'),
    );

    const res = await request(app.getHttpServer())
      .patch('/profile/social-links/sl2')
      .set('Cookie', 'access_token=fake')
      .send({ value: '@new_nick' })
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
  });

  it('returns 404 when updating a non-existent social link', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    socialLinkService.update.mockRejectedValueOnce(
      new NotFoundException('Social link not found'),
    );

    const res = await request(app.getHttpServer())
      .patch('/profile/social-links/missing')
      .set('Cookie', 'access_token=fake')
      .send({ value: '@new_nick' })
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });

  it('deletes own social link for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .delete('/profile/social-links/sl1')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(socialLinkService.remove).toHaveBeenCalledWith('u1', 'sl1');
  });

  it('returns 403 when deleting a social link owned by another user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    socialLinkService.remove.mockRejectedValueOnce(
      new ForbiddenException('Not the owner of this social link'),
    );

    const res = await request(app.getHttpServer())
      .delete('/profile/social-links/sl2')
      .set('Cookie', 'access_token=fake')
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
  });

  it('returns 404 when deleting a non-existent social link', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });
    socialLinkService.remove.mockRejectedValueOnce(
      new NotFoundException('Social link not found'),
    );

    const res = await request(app.getHttpServer())
      .delete('/profile/social-links/missing')
      .set('Cookie', 'access_token=fake')
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });
});

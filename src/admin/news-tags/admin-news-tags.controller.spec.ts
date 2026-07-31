import {
  ConflictException,
  INestApplication,
  NotFoundException,
} from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../../auth/auth.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Role } from '../../generated/prisma/enums';
import { NewsTagService } from '../../news/news-tag/news-tag.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ErrorResponseDto } from '../../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../../shared/filters/http-exception.filter';
import { AdminNewsTagsController } from './admin-news-tags.controller';

describe('AdminNewsTagsController (guards)', () => {
  let app: INestApplication;

  const newsTagService = {
    create: jest
      .fn()
      .mockResolvedValue({ id: 'tag-1', name: 'Турниры', color: '#fff' }),
    update: jest
      .fn()
      .mockResolvedValue({ id: 'tag-1', name: 'Новое имя', color: '#fff' }),
    remove: jest
      .fn()
      .mockResolvedValue({ id: 'tag-1', name: 'Турниры', color: '#fff' }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [AdminNewsTagsController],
      providers: [
        { provide: NewsTagService, useValue: newsTagService },
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
      .post('/admin/news-tags')
      .send({ name: 'Турниры', color: '#fff' })
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects POST from a non-ADMIN user with 403', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    const res = await request(app.getHttpServer())
      .post('/admin/news-tags')
      .set('Cookie', 'access_token=fake')
      .send({ name: 'Турниры', color: '#fff' })
      .expect(403);

    expect((res.body as ErrorResponseDto).statusCode).toBe(403);
    expect(newsTagService.create).not.toHaveBeenCalled();
  });

  it('allows POST from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .post('/admin/news-tags')
      .set('Cookie', 'access_token=fake')
      .send({ name: 'Турниры', color: '#fff' })
      .expect(201);

    expect(newsTagService.create).toHaveBeenCalledWith({
      name: 'Турниры',
      color: '#fff',
    });
  });

  it('returns 409 when the tag name is already taken', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    newsTagService.create.mockRejectedValueOnce(
      new ConflictException('Тег с таким названием уже существует'),
    );

    const res = await request(app.getHttpServer())
      .post('/admin/news-tags')
      .set('Cookie', 'access_token=fake')
      .send({ name: 'Турниры', color: '#fff' })
      .expect(409);

    expect((res.body as ErrorResponseDto).statusCode).toBe(409);
  });

  it('allows PATCH from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .patch('/admin/news-tags/tag-1')
      .set('Cookie', 'access_token=fake')
      .send({ name: 'Новое имя' })
      .expect(200);

    expect(newsTagService.update).toHaveBeenCalledWith('tag-1', {
      name: 'Новое имя',
    });
  });

  it('returns 404 when updating a non-existent tag', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    newsTagService.update.mockRejectedValueOnce(
      new NotFoundException('Тег не найден'),
    );

    const res = await request(app.getHttpServer())
      .patch('/admin/news-tags/missing')
      .set('Cookie', 'access_token=fake')
      .send({ name: 'Новое имя' })
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });

  it('allows DELETE from an ADMIN user', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });

    await request(app.getHttpServer())
      .delete('/admin/news-tags/tag-1')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(newsTagService.remove).toHaveBeenCalledWith('tag-1');
  });

  it('returns 404 when deleting a non-existent tag', async () => {
    authService.verifyToken.mockResolvedValue({
      sub: 'admin1',
      role: Role.ADMIN,
    });
    newsTagService.remove.mockRejectedValueOnce(
      new NotFoundException('Тег не найден'),
    );

    const res = await request(app.getHttpServer())
      .delete('/admin/news-tags/missing')
      .set('Cookie', 'access_token=fake')
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });
});

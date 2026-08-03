import { INestApplication, NotFoundException } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { AuthService } from '../auth/auth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../auth/guards/optional-jwt-auth.guard';
import { Role } from '../generated/prisma/enums';
import { PrismaService } from '../prisma/prisma.service';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { AllExceptionsFilter } from '../shared/filters/http-exception.filter';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

describe('NewsController (guards)', () => {
  let app: INestApplication;

  const newsService = {
    findAll: jest.fn().mockResolvedValue({ items: [], meta: {} }),
    findOne: jest.fn().mockResolvedValue({ id: 'news-1' }),
    like: jest
      .fn()
      .mockResolvedValue({ likeCount: 1, likedByCurrentUser: true }),
    unlike: jest
      .fn()
      .mockResolvedValue({ likeCount: 0, likedByCurrentUser: false }),
    markViewed: jest
      .fn()
      .mockResolvedValue({ viewCount: 1, viewedByCurrentUser: true }),
  };

  const authService = {
    verifyToken: jest.fn(),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NewsController],
      providers: [
        { provide: NewsService, useValue: newsService },
        { provide: AuthService, useValue: authService },
        { provide: PrismaService, useValue: {} },
        JwtAuthGuard,
        OptionalJwtAuthGuard,
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

  it('allows GET /news without authentication', async () => {
    await request(app.getHttpServer()).get('/news').expect(200);

    expect(newsService.findAll).toHaveBeenCalledWith(
      expect.anything(),
      undefined,
    );
  });

  it('forwards search/tagId query params to the service', async () => {
    await request(app.getHttpServer())
      .get('/news')
      .query({ search: 'турнир', tagId: 'tag-1' })
      .expect(200);

    expect(newsService.findAll).toHaveBeenCalledWith(
      expect.objectContaining({ search: 'турнир', tagId: 'tag-1' }),
      undefined,
    );
  });

  it('forwards the authenticated user id to GET /news when the auth cookie is valid', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .get('/news')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(newsService.findAll).toHaveBeenCalledWith(expect.anything(), 'u1');
  });

  it('allows GET /news/:id without authentication', async () => {
    await request(app.getHttpServer()).get('/news/news-1').expect(200);

    expect(newsService.findOne).toHaveBeenCalledWith('news-1', undefined);
  });

  it('forwards the authenticated user id to GET /news/:id when the auth cookie is valid', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .get('/news/news-1')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(newsService.findOne).toHaveBeenCalledWith('news-1', 'u1');
  });

  it('returns 404 for a non-existent news item', async () => {
    newsService.findOne.mockRejectedValueOnce(
      new NotFoundException('Новость не найдена'),
    );

    const res = await request(app.getHttpServer())
      .get('/news/missing')
      .expect(404);

    expect((res.body as ErrorResponseDto).statusCode).toBe(404);
  });

  it('rejects POST /news/:id/like without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/news/news-1/like')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('rejects DELETE /news/:id/like without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .delete('/news/news-1/like')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('likes a news item for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .post('/news/news-1/like')
      .set('Cookie', 'access_token=fake')
      .expect(201);

    expect(newsService.like).toHaveBeenCalledWith('u1', 'news-1');
  });

  it('unlikes a news item for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .delete('/news/news-1/like')
      .set('Cookie', 'access_token=fake')
      .expect(200);

    expect(newsService.unlike).toHaveBeenCalledWith('u1', 'news-1');
  });

  it('rejects POST /news/:id/view without an auth cookie with 401', async () => {
    const res = await request(app.getHttpServer())
      .post('/news/news-1/view')
      .expect(401);

    expect((res.body as ErrorResponseDto).statusCode).toBe(401);
  });

  it('marks a news item as viewed for an authenticated user', async () => {
    authService.verifyToken.mockResolvedValue({ sub: 'u1', role: Role.USER });

    await request(app.getHttpServer())
      .post('/news/news-1/view')
      .set('Cookie', 'access_token=fake')
      .expect(201);

    expect(newsService.markViewed).toHaveBeenCalledWith('u1', 'news-1');
  });
});

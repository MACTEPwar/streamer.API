import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { NewsTagController } from './news-tag.controller';
import { NewsTagService } from './news-tag.service';

describe('NewsTagController', () => {
  let app: INestApplication;

  const newsTagService = {
    findAll: jest
      .fn()
      .mockResolvedValue([{ id: 'tag-1', name: 'Турниры', color: '#fff' }]),
  };

  beforeAll(async () => {
    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [NewsTagController],
      providers: [{ provide: NewsTagService, useValue: newsTagService }],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists tags without authentication', async () => {
    const res = await request(app.getHttpServer())
      .get('/news-tags')
      .expect(200);

    expect(res.body).toEqual([{ id: 'tag-1', name: 'Турниры', color: '#fff' }]);
  });
});

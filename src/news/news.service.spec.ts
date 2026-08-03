import { NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NewsQueryDto } from './dto/news-query.dto';
import { NewsService } from './news.service';

describe('NewsService', () => {
  let service: NewsService;
  const prismaMock = {
    news: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    newsLike: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
      count: jest.fn(),
    },
    newsView: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const sampleNews = {
    id: 'news-1',
    title: 'Title',
    description: 'Description',
    publishedAt: new Date('2026-01-01'),
    viewCount: 0,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    images: [
      { id: 'img-2', url: '/uploads/2.jpg', order: 1 },
      { id: 'img-1', url: '/uploads/1.jpg', order: 0 },
    ],
    tags: [
      {
        id: 'tag-1',
        name: 'Турниры',
        color: '#fff',
        textColor: '#000',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ],
    likes: [{ userId: 'u1' }],
    views: [{ userId: 'u1' }],
    _count: { likes: 1 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NewsService(prismaMock as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns a paginated list with likeCount and likedByCurrentUser derived from relations', async () => {
      prismaMock.news.findMany.mockResolvedValue([sampleNews]);
      prismaMock.news.count.mockResolvedValue(1);

      const query = new NewsQueryDto();
      const result = await service.findAll(query, 'u1');

      expect(result.items).toHaveLength(1);
      expect(result.items[0].likeCount).toBe(1);
      expect(result.items[0].likedByCurrentUser).toBe(true);
      expect(result.items[0].images.map((image) => image.id)).toEqual([
        'img-1',
        'img-2',
      ]);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('returns likedByCurrentUser=null when there is no authenticated user', async () => {
      prismaMock.news.findMany.mockResolvedValue([sampleNews]);
      prismaMock.news.count.mockResolvedValue(1);

      const result = await service.findAll(new NewsQueryDto());

      expect(result.items[0].likedByCurrentUser).toBeNull();
    });

    it('filters by title substring when `search` is provided', async () => {
      prismaMock.news.findMany.mockResolvedValue([sampleNews]);
      prismaMock.news.count.mockResolvedValue(1);

      const query = new NewsQueryDto();
      query.search = 'турнир';
      await service.findAll(query);

      expect(prismaMock.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { title: { contains: 'турнир' } },
        }),
      );
      expect(prismaMock.news.count).toHaveBeenCalledWith({
        where: { title: { contains: 'турнир' } },
      });
    });

    it('filters by tagId when provided', async () => {
      prismaMock.news.findMany.mockResolvedValue([sampleNews]);
      prismaMock.news.count.mockResolvedValue(1);

      const query = new NewsQueryDto();
      query.tagId = 'tag-1';
      await service.findAll(query);

      expect(prismaMock.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tags: { some: { id: 'tag-1' } } },
        }),
      );
    });

    it('combines search and tagId filters', async () => {
      prismaMock.news.findMany.mockResolvedValue([sampleNews]);
      prismaMock.news.count.mockResolvedValue(1);

      const query = new NewsQueryDto();
      query.search = 'турнир';
      query.tagId = 'tag-1';
      await service.findAll(query);

      expect(prismaMock.news.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            title: { contains: 'турнир' },
            tags: { some: { id: 'tag-1' } },
          },
        }),
      );
    });
  });

  describe('findOne', () => {
    it('returns the mapped news item', async () => {
      prismaMock.news.findUnique.mockResolvedValue(sampleNews);

      const result = await service.findOne('news-1', 'u1');

      expect(result.id).toBe('news-1');
      expect(result.tags).toHaveLength(1);
    });

    it('throws NotFoundException when the news item does not exist', async () => {
      prismaMock.news.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('like', () => {
    it('upserts a NewsLike and returns the updated likeCount', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      prismaMock.newsLike.upsert.mockResolvedValue({});
      prismaMock.newsLike.count.mockResolvedValue(3);

      const result = await service.like('u1', 'news-1');

      expect(prismaMock.newsLike.upsert).toHaveBeenCalledWith({
        where: { userId_newsId: { userId: 'u1', newsId: 'news-1' } },
        create: { userId: 'u1', newsId: 'news-1' },
        update: {},
      });
      expect(result).toEqual({ likeCount: 3, likedByCurrentUser: true });
    });

    it('throws NotFoundException when the news item does not exist', async () => {
      prismaMock.news.findUnique.mockResolvedValue(null);

      await expect(service.like('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.newsLike.upsert).not.toHaveBeenCalled();
    });
  });

  describe('unlike', () => {
    it('removes the NewsLike and returns the updated likeCount', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      prismaMock.newsLike.deleteMany.mockResolvedValue({});
      prismaMock.newsLike.count.mockResolvedValue(2);

      const result = await service.unlike('u1', 'news-1');

      expect(prismaMock.newsLike.deleteMany).toHaveBeenCalledWith({
        where: { userId: 'u1', newsId: 'news-1' },
      });
      expect(result).toEqual({ likeCount: 2, likedByCurrentUser: false });
    });

    it('throws NotFoundException when the news item does not exist', async () => {
      prismaMock.news.findUnique.mockResolvedValue(null);

      await expect(service.unlike('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.newsLike.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('markViewed', () => {
    it('creates a NewsView and increments viewCount on first view', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      prismaMock.$transaction.mockResolvedValue([{}, { viewCount: 5 }]);

      const result = await service.markViewed('u1', 'news-1');

      expect(prismaMock.newsView.create).toHaveBeenCalledWith({
        data: { userId: 'u1', newsId: 'news-1' },
      });
      expect(prismaMock.news.update).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: { viewCount: { increment: 1 } },
      });
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ viewCount: 5, viewedByCurrentUser: true });
    });

    it('does not increment viewCount again on a repeated view (unique constraint)', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      const uniqueError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '0.0.0' },
      );
      prismaMock.$transaction.mockRejectedValue(uniqueError);
      prismaMock.news.findUniqueOrThrow.mockResolvedValue({ viewCount: 5 });

      const result = await service.markViewed('u1', 'news-1');

      expect(result).toEqual({ viewCount: 5, viewedByCurrentUser: true });
    });

    it('throws NotFoundException when the news item does not exist', async () => {
      prismaMock.news.findUnique.mockResolvedValue(null);

      await expect(service.markViewed('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });
  });
});

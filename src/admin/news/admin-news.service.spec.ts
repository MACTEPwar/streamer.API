import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { NewsImageDownloadService } from '../../news/news-image-download.service';
import { NEWS_INCLUDE } from '../../news/news.mapper';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminNewsService } from './admin-news.service';

describe('AdminNewsService', () => {
  let service: AdminNewsService;
  const prismaMock = {
    $transaction: jest.fn(),
    news: {
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
  };
  const newsImageDownloadServiceMock = {
    resolveImageUrls: jest.fn(),
    cleanup: jest.fn(),
  };

  const dto = {
    title: 'Открыт турнир',
    description: 'Описание',
    imageUrls: ['/uploads/existing.jpg', 'https://example.com/pic.png'],
    tagIds: ['tag-1'],
  };

  const sampleNews = {
    id: 'news-1',
    title: dto.title,
    description: dto.description,
    publishedAt: new Date('2026-01-01'),
    viewCount: 0,
    hasNoImage: false,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    images: [],
    tags: [],
    likes: [],
    _count: { likes: 0 },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminNewsService(
      prismaMock as unknown as PrismaService,
      newsImageDownloadServiceMock as unknown as NewsImageDownloadService,
    );
  });

  it('resolves images, creates the News row inside a transaction and returns the mapped DTO', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [{ url: '/uploads/existing.jpg' }, { url: '/uploads/new.png' }],
      downloadedFilePaths: ['/abs/path/uploads/new.png'],
    });
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({ news: { create: jest.fn().mockResolvedValue(sampleNews) } }),
    );

    const result = await service.create(dto);

    expect(newsImageDownloadServiceMock.resolveImageUrls).toHaveBeenCalledWith(
      dto.imageUrls,
    );
    expect(result.id).toBe('news-1');
    expect(newsImageDownloadServiceMock.cleanup).not.toHaveBeenCalled();
  });

  it('persists hasNoImage on create', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [],
      downloadedFilePaths: [],
    });
    const txNewsCreate = jest.fn().mockResolvedValue(sampleNews);
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({ news: { create: txNewsCreate } }),
    );

    await service.create({ ...dto, imageUrls: [], hasNoImage: true });

    expect(txNewsCreate).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        description: dto.description,
        publishedAt: undefined,
        hasNoImage: true,
        images: { create: [] },
        tags: { connect: [{ id: 'tag-1' }] },
      },
      include: NEWS_INCLUDE,
    });
  });

  it('cleans up downloaded files when the database transaction fails', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [{ url: '/uploads/new.png' }],
      downloadedFilePaths: ['/abs/path/uploads/new.png'],
    });
    prismaMock.$transaction.mockRejectedValue(new Error('db error'));

    await expect(service.create(dto)).rejects.toThrow('db error');

    expect(newsImageDownloadServiceMock.cleanup).toHaveBeenCalledWith([
      '/abs/path/uploads/new.png',
    ]);
  });

  it('propagates image download failures without touching the database', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockRejectedValue(
      new BadRequestException('Ссылка на приватный/локальный адрес запрещена'),
    );

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('maps a missing tagId (P2025) to a 400 BadRequestException', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [{ url: '/uploads/existing.jpg' }],
      downloadedFilePaths: [],
    });
    prismaMock.$transaction.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError('Record not found', {
        code: 'P2025',
        clientVersion: '0.0.0',
      }),
    );

    await expect(service.create(dto)).rejects.toThrow(BadRequestException);
  });

  describe('update', () => {
    it('throws NotFoundException when the news item does not exist', async () => {
      prismaMock.news.findUnique.mockResolvedValue(null);

      await expect(service.update('missing', { title: 'New' })).rejects.toThrow(
        NotFoundException,
      );
      expect(
        newsImageDownloadServiceMock.resolveImageUrls,
      ).not.toHaveBeenCalled();
    });

    it('updates fields directly without touching images/tags when not provided', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      const txNewsUpdate = jest.fn().mockResolvedValue(sampleNews);
      const txNewsImageDeleteMany = jest.fn();
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: txNewsUpdate },
            newsImage: { deleteMany: txNewsImageDeleteMany },
          }),
      );

      await service.update('news-1', { title: 'Updated title' });

      expect(
        newsImageDownloadServiceMock.resolveImageUrls,
      ).not.toHaveBeenCalled();
      expect(txNewsImageDeleteMany).not.toHaveBeenCalled();
      expect(txNewsUpdate).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          title: 'Updated title',
          description: undefined,
          publishedAt: undefined,
          hasNoImage: undefined,
          images: undefined,
          tags: undefined,
        },
        include: NEWS_INCLUDE,
      });
    });

    it('persists hasNoImage when provided', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      const txNewsUpdate = jest.fn().mockResolvedValue(sampleNews);
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: txNewsUpdate },
            newsImage: { deleteMany: jest.fn() },
          }),
      );

      await service.update('news-1', { hasNoImage: true });

      expect(txNewsUpdate).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          title: undefined,
          description: undefined,
          publishedAt: undefined,
          hasNoImage: true,
          images: undefined,
          tags: undefined,
        },
        include: NEWS_INCLUDE,
      });
    });

    it('replaces tags with `set` instead of `connect`', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      const txNewsUpdate = jest.fn().mockResolvedValue(sampleNews);
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: txNewsUpdate },
            newsImage: { deleteMany: jest.fn() },
          }),
      );

      await service.update('news-1', { tagIds: ['tag-2'] });

      expect(txNewsUpdate).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          title: undefined,
          description: undefined,
          publishedAt: undefined,
          hasNoImage: undefined,
          images: undefined,
          tags: { set: [{ id: 'tag-2' }] },
        },
        include: NEWS_INCLUDE,
      });
    });

    it('replaces images by deleting existing NewsImage rows and creating the new set', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
        resolved: [{ url: '/uploads/kept.jpg' }, { url: '/uploads/new.png' }],
        downloadedFilePaths: ['/abs/path/uploads/new.png'],
      });
      const txNewsUpdate = jest.fn().mockResolvedValue(sampleNews);
      const txNewsImageDeleteMany = jest.fn();
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: txNewsUpdate },
            newsImage: { deleteMany: txNewsImageDeleteMany },
          }),
      );

      await service.update('news-1', {
        imageUrls: ['/uploads/kept.jpg', 'https://example.com/pic.png'],
      });

      expect(txNewsImageDeleteMany).toHaveBeenCalledWith({
        where: { newsId: 'news-1' },
      });
      expect(txNewsUpdate).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          title: undefined,
          description: undefined,
          publishedAt: undefined,
          hasNoImage: undefined,
          images: {
            create: [
              { url: '/uploads/kept.jpg', order: 0 },
              { url: '/uploads/new.png', order: 1 },
            ],
          },
          tags: undefined,
        },
        include: NEWS_INCLUDE,
      });
      expect(newsImageDownloadServiceMock.cleanup).not.toHaveBeenCalled();
    });

    it('cleans up newly downloaded files when the transaction fails', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
        resolved: [{ url: '/uploads/new.png' }],
        downloadedFilePaths: ['/abs/path/uploads/new.png'],
      });
      prismaMock.$transaction.mockRejectedValue(new Error('db error'));

      await expect(
        service.update('news-1', {
          imageUrls: ['https://example.com/pic.png'],
        }),
      ).rejects.toThrow('db error');

      expect(newsImageDownloadServiceMock.cleanup).toHaveBeenCalledWith([
        '/abs/path/uploads/new.png',
      ]);
    });

    it('maps a missing tagId (P2025) to a 400 BadRequestException', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      prismaMock.$transaction.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '0.0.0',
        }),
      );

      await expect(
        service.update('news-1', { tagIds: ['missing-tag'] }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('remove', () => {
    it('deletes the news item and returns the mapped DTO', async () => {
      prismaMock.news.findUnique.mockResolvedValue({ id: 'news-1' });
      prismaMock.news.delete.mockResolvedValue(sampleNews);

      const result = await service.remove('news-1');

      expect(prismaMock.news.delete).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        include: NEWS_INCLUDE,
      });
      expect(result.id).toBe('news-1');
    });

    it('throws NotFoundException when the news item does not exist', async () => {
      prismaMock.news.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.news.delete).not.toHaveBeenCalled();
    });
  });
});

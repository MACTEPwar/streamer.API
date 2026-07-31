import { BadRequestException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { NewsImageDownloadService } from '../../news/news-image-download.service';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminNewsService } from './admin-news.service';

describe('AdminNewsService', () => {
  let service: AdminNewsService;
  const prismaMock = {
    $transaction: jest.fn(),
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
});

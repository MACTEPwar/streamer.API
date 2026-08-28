import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { NewsCoverType } from '../../generated/prisma/enums';
import { NewsImageDownloadService } from '../../news/news-image-download.service';
import { NEWS_INCLUDE } from '../../news/news.mapper';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadedFileCleanupService } from '../../upload/uploaded-file-cleanup.service';
import { AdminNewsService } from './admin-news.service';

describe('AdminNewsService', () => {
  let service: AdminNewsService;
  const prismaMock = {
    $transaction: jest.fn(),
    news: {
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };
  const newsImageDownloadServiceMock = {
    resolveImageUrls: jest.fn(),
    cleanup: jest.fn(),
  };
  const uploadedFileCleanupServiceMock = {
    deleteIfUnreferenced: jest.fn(),
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
    coverType: NewsCoverType.NONE,
    coverUrl: null,
    coverFocalX: null,
    coverFocalY: null,
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    images: [],
    tags: [],
    likes: [],
    _count: { likes: 0 },
  };

  const currentNews = (overrides: Record<string, unknown> = {}) => ({
    id: 'news-1',
    coverType: NewsCoverType.NONE,
    coverUrl: null,
    images: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminNewsService(
      prismaMock as unknown as PrismaService,
      newsImageDownloadServiceMock as unknown as NewsImageDownloadService,
      uploadedFileCleanupServiceMock as unknown as UploadedFileCleanupService,
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

  it('records the cover state of a news created without a cover', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [],
      downloadedFilePaths: [],
    });
    const txNewsCreate = jest.fn().mockResolvedValue(sampleNews);
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({ news: { create: txNewsCreate } }),
    );

    await service.create({ ...dto, imageUrls: [], cover: { type: 'none' } });

    expect(txNewsCreate).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        description: dto.description,
        publishedAt: undefined,
        coverType: NewsCoverType.NONE,
        coverUrl: null,
        coverFocalX: null,
        coverFocalY: null,
        images: { create: [] },
        tags: { connect: [{ id: 'tag-1' }] },
      },
      include: NEWS_INCLUDE,
    });
  });

  it('leaves a news created without any cover field without a cover', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [{ url: '/uploads/existing.jpg' }],
      downloadedFilePaths: [],
    });
    const txNewsCreate = jest.fn().mockResolvedValue(sampleNews);
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({ news: { create: txNewsCreate } }),
    );

    await service.create({ ...dto, imageUrls: ['/uploads/existing.jpg'] });

    expect(txNewsCreate).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        description: dto.description,
        publishedAt: undefined,
        coverType: NewsCoverType.NONE,
        coverUrl: null,
        coverFocalX: null,
        coverFocalY: null,
        images: { create: [{ url: '/uploads/existing.jpg', order: 0 }] },
        tags: { connect: [{ id: 'tag-1' }] },
      },
      include: NEWS_INCLUDE,
    });
  });

  it('stores the downloaded address when the cover is one of the images', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [{ url: '/uploads/existing.jpg' }, { url: '/uploads/new.png' }],
      downloadedFilePaths: ['/abs/path/uploads/new.png'],
    });
    const txNewsCreate = jest.fn().mockResolvedValue(sampleNews);
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({ news: { create: txNewsCreate } }),
    );

    await service.create({
      ...dto,
      cover: { type: 'image', url: 'https://example.com/pic.png' },
    });

    expect(txNewsCreate).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        description: dto.description,
        publishedAt: undefined,
        coverType: NewsCoverType.IMAGE,
        coverUrl: '/uploads/new.png',
        coverFocalX: null,
        coverFocalY: null,
        images: {
          create: [
            { url: '/uploads/existing.jpg', order: 0 },
            { url: '/uploads/new.png', order: 1 },
          ],
        },
        tags: { connect: [{ id: 'tag-1' }] },
      },
      include: NEWS_INCLUDE,
    });
  });

  it('rejects a cover pointing at an image outside the set', async () => {
    newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
      resolved: [{ url: '/uploads/existing.jpg' }, { url: '/uploads/new.png' }],
      downloadedFilePaths: [],
    });

    await expect(
      service.create({
        ...dto,
        cover: { type: 'image', url: '/uploads/somewhere-else.jpg' },
      }),
    ).rejects.toThrow(BadRequestException);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it('accepts an own cover the same way as any other image', async () => {
    newsImageDownloadServiceMock.resolveImageUrls
      .mockResolvedValueOnce({
        resolved: [{ url: '/uploads/existing.jpg' }],
        downloadedFilePaths: [],
      })
      .mockResolvedValueOnce({
        resolved: [{ url: '/uploads/downloaded-cover.jpg' }],
        downloadedFilePaths: ['/abs/path/uploads/downloaded-cover.jpg'],
      });
    const txNewsCreate = jest.fn().mockResolvedValue(sampleNews);
    prismaMock.$transaction.mockImplementation(
      (callback: (tx: unknown) => unknown) =>
        callback({ news: { create: txNewsCreate } }),
    );

    await service.create({
      ...dto,
      imageUrls: ['/uploads/existing.jpg'],
      cover: {
        type: 'custom',
        url: 'https://example.com/cover.png',
        focalPoint: { x: 70, y: 80 },
      },
    });

    expect(
      newsImageDownloadServiceMock.resolveImageUrls,
    ).toHaveBeenLastCalledWith(['https://example.com/cover.png']);
    expect(txNewsCreate).toHaveBeenCalledWith({
      data: {
        title: dto.title,
        description: dto.description,
        publishedAt: undefined,
        coverType: NewsCoverType.CUSTOM,
        coverUrl: '/uploads/downloaded-cover.jpg',
        coverFocalX: 70,
        coverFocalY: 80,
        images: { create: [{ url: '/uploads/existing.jpg', order: 0 }] },
        tags: { connect: [{ id: 'tag-1' }] },
      },
      include: NEWS_INCLUDE,
    });
  });

  it('cleans up a downloaded own cover when the transaction fails', async () => {
    newsImageDownloadServiceMock.resolveImageUrls
      .mockResolvedValueOnce({
        resolved: [],
        downloadedFilePaths: [],
      })
      .mockResolvedValueOnce({
        resolved: [{ url: '/uploads/downloaded-cover.jpg' }],
        downloadedFilePaths: ['/abs/path/uploads/downloaded-cover.jpg'],
      });
    prismaMock.$transaction.mockRejectedValue(new Error('db error'));

    await expect(
      service.create({
        ...dto,
        imageUrls: [],
        cover: { type: 'custom', url: 'https://example.com/cover.png' },
      }),
    ).rejects.toThrow('db error');

    expect(newsImageDownloadServiceMock.cleanup).toHaveBeenCalledWith([
      '/abs/path/uploads/downloaded-cover.jpg',
    ]);
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
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
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
          images: undefined,
          tags: undefined,
        },
        include: NEWS_INCLUDE,
      });
    });

    it('records the cover state when it is changed', async () => {
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
      const txNewsUpdate = jest.fn().mockResolvedValue(sampleNews);
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: txNewsUpdate },
            newsImage: { deleteMany: jest.fn() },
          }),
      );

      await service.update('news-1', { cover: { type: 'none' } });

      expect(txNewsUpdate).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          title: undefined,
          description: undefined,
          publishedAt: undefined,
          coverType: NewsCoverType.NONE,
          coverUrl: null,
          coverFocalX: null,
          coverFocalY: null,
          images: undefined,
          tags: undefined,
        },
        include: NEWS_INCLUDE,
      });
    });

    it('rejects a new image set that drops the current cover image', async () => {
      prismaMock.news.findUnique.mockResolvedValue(
        currentNews({
          coverType: NewsCoverType.IMAGE,
          coverUrl: '/uploads/cover.jpg',
          images: [{ url: '/uploads/cover.jpg' }],
        }),
      );
      newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
        resolved: [{ url: '/uploads/other.jpg' }],
        downloadedFilePaths: [],
      });

      await expect(
        service.update('news-1', { imageUrls: ['/uploads/other.jpg'] }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('accepts dropping the cover image when a new cover comes along', async () => {
      prismaMock.news.findUnique.mockResolvedValue(
        currentNews({
          coverType: NewsCoverType.IMAGE,
          coverUrl: '/uploads/cover.jpg',
          images: [{ url: '/uploads/cover.jpg' }],
        }),
      );
      newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
        resolved: [{ url: '/uploads/other.jpg' }],
        downloadedFilePaths: [],
      });
      const txNewsUpdate = jest.fn().mockResolvedValue(sampleNews);
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: txNewsUpdate },
            newsImage: { deleteMany: jest.fn() },
          }),
      );

      await service.update('news-1', {
        imageUrls: ['/uploads/other.jpg'],
        cover: { type: 'image', url: '/uploads/other.jpg' },
      });

      expect(txNewsUpdate).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: {
          title: undefined,
          description: undefined,
          publishedAt: undefined,
          coverType: NewsCoverType.IMAGE,
          coverUrl: '/uploads/other.jpg',
          coverFocalX: null,
          coverFocalY: null,
          images: {
            create: [
              {
                url: '/uploads/other.jpg',
                order: 0,
                focalX: null,
                focalY: null,
              },
            ],
          },
          tags: undefined,
        },
        include: NEWS_INCLUDE,
      });
    });

    it('deletes the file of the own cover it replaced', async () => {
      prismaMock.news.findUnique.mockResolvedValue(
        currentNews({
          coverType: NewsCoverType.CUSTOM,
          coverUrl: '/uploads/old-cover.jpg',
        }),
      );
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: jest.fn().mockResolvedValue(sampleNews) },
            newsImage: { deleteMany: jest.fn() },
          }),
      );

      await service.update('news-1', { cover: { type: 'none' } });

      expect(
        uploadedFileCleanupServiceMock.deleteIfUnreferenced,
      ).toHaveBeenCalledWith('/uploads/old-cover.jpg');
    });

    it('keeps the file of the own cover when the update fails', async () => {
      prismaMock.news.findUnique.mockResolvedValue(
        currentNews({
          coverType: NewsCoverType.CUSTOM,
          coverUrl: '/uploads/old-cover.jpg',
        }),
      );
      prismaMock.$transaction.mockRejectedValue(new Error('db error'));

      await expect(
        service.update('news-1', { cover: { type: 'none' } }),
      ).rejects.toThrow('db error');

      expect(
        uploadedFileCleanupServiceMock.deleteIfUnreferenced,
      ).not.toHaveBeenCalled();
    });

    it('keeps the file of an own cover that stayed the same', async () => {
      prismaMock.news.findUnique.mockResolvedValue(
        currentNews({
          coverType: NewsCoverType.CUSTOM,
          coverUrl: '/uploads/cover.jpg',
        }),
      );
      newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
        resolved: [{ url: '/uploads/cover.jpg' }],
        downloadedFilePaths: [],
      });
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            news: { update: jest.fn().mockResolvedValue(sampleNews) },
            newsImage: { deleteMany: jest.fn() },
          }),
      );

      await service.update('news-1', {
        cover: { type: 'custom', url: '/uploads/cover.jpg' },
      });

      expect(
        uploadedFileCleanupServiceMock.deleteIfUnreferenced,
      ).not.toHaveBeenCalled();
    });

    it('replaces tags with `set` instead of `connect`', async () => {
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
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
          images: undefined,
          tags: { set: [{ id: 'tag-2' }] },
        },
        include: NEWS_INCLUDE,
      });
    });

    it('replaces images by deleting existing NewsImage rows and creating the new set', async () => {
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
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
          images: {
            // focalX/focalY переносятся по адресу картинки (ИЗО-Б-02): у
            // обеих здесь фокус не был задан, поэтому null
            create: [
              {
                url: '/uploads/kept.jpg',
                order: 0,
                focalX: null,
                focalY: null,
              },
              { url: '/uploads/new.png', order: 1, focalX: null, focalY: null },
            ],
          },
          tags: undefined,
        },
        include: NEWS_INCLUDE,
      });
      expect(newsImageDownloadServiceMock.cleanup).not.toHaveBeenCalled();
    });

    describe('точка фокуса при замене состава изображений (ИЗО-Б-02)', () => {
      type UpdateArg = { data: { images?: { create: unknown[] } } };

      function updateArg(txNewsUpdate: jest.Mock): UpdateArg {
        const calls = txNewsUpdate.mock.calls as unknown as UpdateArg[][];
        return calls[0][0];
      }

      function expectCreatedImages(txNewsUpdate: jest.Mock): unknown[] {
        return updateArg(txNewsUpdate).data.images!.create;
      }

      function arrangeUpdate(currentImages: Record<string, unknown>[]) {
        prismaMock.news.findUnique.mockResolvedValue(
          currentNews({ images: currentImages }),
        );
        const txNewsUpdate = jest.fn().mockResolvedValue(sampleNews);
        prismaMock.$transaction.mockImplementation(
          (callback: (tx: unknown) => unknown) =>
            callback({
              news: { update: txNewsUpdate },
              newsImage: { deleteMany: jest.fn() },
            }),
        );
        return txNewsUpdate;
      }

      it('keeps the focal point of an image that stayed in the new set', async () => {
        const txNewsUpdate = arrangeUpdate([
          { url: '/uploads/kept.jpg', order: 0, focalX: 70, focalY: 30 },
        ]);
        newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
          resolved: [{ url: '/uploads/kept.jpg' }],
          downloadedFilePaths: [],
        });

        await service.update('news-1', { imageUrls: ['/uploads/kept.jpg'] });

        expect(expectCreatedImages(txNewsUpdate)).toEqual([
          { url: '/uploads/kept.jpg', order: 0, focalX: 70, focalY: 30 },
        ]);
      });

      it('updates the order by the new set — keeping the focal point does not freeze it (ИЗО-О-01)', async () => {
        const txNewsUpdate = arrangeUpdate([
          { url: '/uploads/a.jpg', order: 0, focalX: 10, focalY: 20 },
          { url: '/uploads/b.jpg', order: 1, focalX: 80, focalY: 90 },
        ]);
        newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
          resolved: [{ url: '/uploads/b.jpg' }, { url: '/uploads/a.jpg' }],
          downloadedFilePaths: [],
        });

        await service.update('news-1', {
          imageUrls: ['/uploads/b.jpg', '/uploads/a.jpg'],
        });

        expect(expectCreatedImages(txNewsUpdate)).toEqual([
          { url: '/uploads/b.jpg', order: 0, focalX: 80, focalY: 90 },
          { url: '/uploads/a.jpg', order: 1, focalX: 10, focalY: 20 },
        ]);
      });

      it('gives a newly added image no focal point — it is cropped by the centre (ФОК-О-02)', async () => {
        const txNewsUpdate = arrangeUpdate([
          { url: '/uploads/kept.jpg', order: 0, focalX: 70, focalY: 30 },
        ]);
        newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
          resolved: [{ url: '/uploads/kept.jpg' }, { url: '/uploads/new.png' }],
          downloadedFilePaths: ['/abs/path/uploads/new.png'],
        });

        await service.update('news-1', {
          imageUrls: ['/uploads/kept.jpg', 'https://example.com/pic.png'],
        });

        expect(expectCreatedImages(txNewsUpdate)).toEqual([
          { url: '/uploads/kept.jpg', order: 0, focalX: 70, focalY: 30 },
          { url: '/uploads/new.png', order: 1, focalX: null, focalY: null },
        ]);
      });

      it('drops the focal point together with an image that left the set', async () => {
        const txNewsUpdate = arrangeUpdate([
          { url: '/uploads/gone.jpg', order: 0, focalX: 5, focalY: 5 },
          { url: '/uploads/kept.jpg', order: 1, focalX: 70, focalY: 30 },
        ]);
        newsImageDownloadServiceMock.resolveImageUrls.mockResolvedValue({
          resolved: [{ url: '/uploads/kept.jpg' }],
          downloadedFilePaths: [],
        });

        await service.update('news-1', { imageUrls: ['/uploads/kept.jpg'] });

        const created = expectCreatedImages(txNewsUpdate);
        expect(created).toHaveLength(1);
        expect(created[0]).toEqual({
          url: '/uploads/kept.jpg',
          order: 0,
          focalX: 70,
          focalY: 30,
        });
      });

      it('does not touch images at all when the update leaves the set alone', async () => {
        const txNewsUpdate = arrangeUpdate([
          { url: '/uploads/kept.jpg', order: 0, focalX: 70, focalY: 30 },
        ]);

        await service.update('news-1', { title: 'Новый заголовок' });

        expect(updateArg(txNewsUpdate).data.images).toBeUndefined();
        expect(
          newsImageDownloadServiceMock.resolveImageUrls,
        ).not.toHaveBeenCalled();
      });
    });

    it('cleans up newly downloaded files when the transaction fails', async () => {
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
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
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
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

  describe('updateCoverFocalPoint', () => {
    it('stores the focal point of an own cover', async () => {
      prismaMock.news.findUnique.mockResolvedValue(
        currentNews({
          coverType: NewsCoverType.CUSTOM,
          coverUrl: '/uploads/own-cover.jpg',
        }),
      );
      prismaMock.news.update.mockResolvedValue(sampleNews);

      await service.updateCoverFocalPoint('news-1', { focalX: 70, focalY: 80 });

      expect(prismaMock.news.update).toHaveBeenCalledWith({
        where: { id: 'news-1' },
        data: { coverFocalX: 70, coverFocalY: 80 },
        include: NEWS_INCLUDE,
      });
    });

    it('refuses to store it for a cover taken from the images of the news', async () => {
      prismaMock.news.findUnique.mockResolvedValue(
        currentNews({
          coverType: NewsCoverType.IMAGE,
          coverUrl: '/uploads/in-gallery.jpg',
        }),
      );

      await expect(
        service.updateCoverFocalPoint('news-1', { focalX: 70, focalY: 80 }),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.news.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the news item does not exist', async () => {
      prismaMock.news.findUnique.mockResolvedValue(null);

      await expect(
        service.updateCoverFocalPoint('missing', { focalX: 70, focalY: 80 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    it('deletes the news item and returns the mapped DTO', async () => {
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
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

    it('deletes the file of the own cover along with the news', async () => {
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
      prismaMock.news.delete.mockResolvedValue({
        ...sampleNews,
        coverType: NewsCoverType.CUSTOM,
        coverUrl: '/uploads/own-cover.jpg',
      });

      await service.remove('news-1');

      expect(
        uploadedFileCleanupServiceMock.deleteIfUnreferenced,
      ).toHaveBeenCalledWith('/uploads/own-cover.jpg');
    });

    it('does not touch files when the cover was one of the images', async () => {
      prismaMock.news.findUnique.mockResolvedValue(currentNews());
      prismaMock.news.delete.mockResolvedValue({
        ...sampleNews,
        coverType: NewsCoverType.IMAGE,
        coverUrl: '/uploads/in-gallery.jpg',
      });

      await service.remove('news-1');

      expect(
        uploadedFileCleanupServiceMock.deleteIfUnreferenced,
      ).not.toHaveBeenCalled();
    });
  });
});

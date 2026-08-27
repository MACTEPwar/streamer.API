import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, PinnedGridViewport } from '../../generated/prisma/client';
import { CardImagePosition, NewsCoverType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PINNED_LAYOUT_INCLUDE } from './pinned-grid.mapper';
import { PinnedGridService } from './pinned-grid.service';

describe('PinnedGridService', () => {
  let service: PinnedGridService;
  const prismaMock = {
    $transaction: jest.fn(),
    pinnedGridLayout: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    pinnedPlacement: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    pinnedNews: {
      upsert: jest.fn(),
      deleteMany: jest.fn(),
    },
    news: {
      findMany: jest.fn(),
    },
  };

  const style = {
    imagePosition: 'top' as const,
    imageSizePercent: 50,
    backgroundColor: '#f9f9f9',
    textColor: '#1e1e1e',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new PinnedGridService(prismaMock as unknown as PrismaService);
  });

  describe('getLayout', () => {
    it('returns the mapped layout for a viewport', async () => {
      prismaMock.pinnedGridLayout.findUniqueOrThrow.mockResolvedValue({
        columns: 3,
        rows: 12,
        placements: [
          {
            colStart: 1,
            rowStart: 1,
            colSpan: 1,
            rowSpan: 1,
            pinnedNews: {
              newsId: 'news-1',
              imagePosition: CardImagePosition.TOP,
              imageSizePercent: 50,
              backgroundColor: '#f9f9f9',
              textColor: '#1e1e1e',
              news: {
                coverType: NewsCoverType.NONE,
                coverUrl: null,
                coverFocalX: null,
                coverFocalY: null,
                images: [],
              },
            },
          },
        ],
      });

      const result = await service.getLayout(PinnedGridViewport.LARGE);

      expect(
        prismaMock.pinnedGridLayout.findUniqueOrThrow,
      ).toHaveBeenCalledWith({
        where: { viewport: PinnedGridViewport.LARGE },
        include: PINNED_LAYOUT_INCLUDE,
      });
      expect(result.config).toEqual({ columns: 3, rows: 12 });
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].newsId).toBe('news-1');
      expect(result.slots[0].style.imagePosition).toBe('top');
      expect(result.slots[0].cover).toEqual({
        type: 'none',
        url: null,
        focalPoint: null,
      });
    });

    it('carries the cover of the news through to the slot', async () => {
      prismaMock.pinnedGridLayout.findUniqueOrThrow.mockResolvedValue({
        columns: 3,
        rows: 12,
        placements: [
          {
            colStart: 1,
            rowStart: 1,
            colSpan: 1,
            rowSpan: 1,
            pinnedNews: {
              newsId: 'news-1',
              imagePosition: CardImagePosition.TOP,
              imageSizePercent: 50,
              backgroundColor: '#f9f9f9',
              textColor: '#1e1e1e',
              news: {
                coverType: NewsCoverType.IMAGE,
                coverUrl: '/uploads/cover.png',
                coverFocalX: null,
                coverFocalY: null,
                images: [
                  {
                    url: '/uploads/other.png',
                    order: 0,
                    focalX: 10,
                    focalY: 20,
                  },
                  {
                    url: '/uploads/cover.png',
                    order: 1,
                    focalX: 30,
                    focalY: 40,
                  },
                ],
              },
            },
          },
        ],
      });

      const result = await service.getLayout(PinnedGridViewport.LARGE);

      expect(result.slots[0].cover).toEqual({
        type: 'image',
        url: '/uploads/cover.png',
        focalPoint: { x: 30, y: 40 },
      });
    });

    it('throws NotFoundException when the layout does not exist (P2025)', async () => {
      prismaMock.pinnedGridLayout.findUniqueOrThrow.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '0.0.0',
        }),
      );

      await expect(service.getLayout(PinnedGridViewport.SMALL)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateLayout', () => {
    const baseDto = {
      config: { columns: 3, rows: 12 },
      slots: [
        {
          newsId: 'news-1',
          colStart: 1,
          rowStart: 1,
          colSpan: 1,
          rowSpan: 1,
          style,
        },
      ],
    };

    it('throws BadRequestException when a slot references a missing newsId', async () => {
      prismaMock.news.findMany.mockResolvedValue([]);

      await expect(
        service.updateLayout(PinnedGridViewport.LARGE, baseDto),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when slots are out of grid bounds', async () => {
      prismaMock.news.findMany.mockResolvedValue([{ id: 'news-1' }]);

      const dto = {
        config: { columns: 3, rows: 12 },
        slots: [{ ...baseDto.slots[0], colStart: 4, colSpan: 1 }],
      };

      await expect(
        service.updateLayout(PinnedGridViewport.LARGE, dto),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when two slots overlap', async () => {
      prismaMock.news.findMany.mockResolvedValue([
        { id: 'news-1' },
        { id: 'news-2' },
      ]);

      const dto = {
        config: { columns: 3, rows: 12 },
        slots: [
          { ...baseDto.slots[0], newsId: 'news-1' },
          { ...baseDto.slots[0], newsId: 'news-2' },
        ],
      };

      await expect(
        service.updateLayout(PinnedGridViewport.LARGE, dto),
      ).rejects.toThrow(BadRequestException);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
    });

    it('replaces placements and upserts PinnedNews inside a transaction on success', async () => {
      prismaMock.news.findMany.mockResolvedValue([{ id: 'news-1' }]);
      const txDeleteMany = jest.fn();
      const txUpsert = jest.fn().mockResolvedValue({ id: 'pinned-news-1' });
      const txPlacementCreate = jest.fn();
      const txLayoutUpdate = jest.fn();
      const txPinnedNewsDeleteMany = jest.fn();
      const txFindUniqueOrThrow = jest
        .fn()
        .mockResolvedValueOnce({ id: 'layout-1' })
        .mockResolvedValueOnce({ columns: 3, rows: 12, placements: [] });

      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            pinnedGridLayout: {
              findUniqueOrThrow: txFindUniqueOrThrow,
              update: txLayoutUpdate,
            },
            pinnedPlacement: {
              deleteMany: txDeleteMany,
              create: txPlacementCreate,
            },
            pinnedNews: {
              upsert: txUpsert,
              deleteMany: txPinnedNewsDeleteMany,
            },
          }),
      );

      const result = await service.updateLayout(
        PinnedGridViewport.LARGE,
        baseDto,
      );

      expect(txDeleteMany).toHaveBeenCalledWith({
        where: { layoutId: 'layout-1' },
      });
      expect(txUpsert).toHaveBeenCalledWith({
        where: { newsId: 'news-1' },
        create: {
          newsId: 'news-1',
          imagePosition: CardImagePosition.TOP,
          imageSizePercent: style.imageSizePercent,
          backgroundColor: style.backgroundColor,
          textColor: style.textColor,
        },
        update: {
          imagePosition: CardImagePosition.TOP,
          imageSizePercent: style.imageSizePercent,
          backgroundColor: style.backgroundColor,
          textColor: style.textColor,
        },
      });
      expect(txPlacementCreate).toHaveBeenCalledWith({
        data: {
          pinnedNewsId: 'pinned-news-1',
          layoutId: 'layout-1',
          colStart: 1,
          rowStart: 1,
          colSpan: 1,
          rowSpan: 1,
        },
      });
      expect(txLayoutUpdate).toHaveBeenCalledWith({
        where: { viewport: PinnedGridViewport.LARGE },
        data: { columns: 3, rows: 12 },
      });
      expect(txPinnedNewsDeleteMany).toHaveBeenCalledWith({
        where: { placements: { none: {} } },
      });
      expect(result.config).toEqual({ columns: 3, rows: 12 });
    });

    it('retries the transaction on a deadlock (P2034) and succeeds', async () => {
      prismaMock.news.findMany.mockResolvedValue([{ id: 'news-1' }]);
      const deadlock = new Prisma.PrismaClientKnownRequestError(
        'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
        { code: 'P2034', clientVersion: '0.0.0' },
      );
      prismaMock.$transaction
        .mockRejectedValueOnce(deadlock)
        .mockImplementationOnce((callback: (tx: unknown) => unknown) =>
          callback({
            pinnedGridLayout: {
              findUniqueOrThrow: jest
                .fn()
                .mockResolvedValueOnce({ id: 'layout-1' })
                .mockResolvedValueOnce({
                  columns: 3,
                  rows: 12,
                  placements: [],
                }),
              update: jest.fn(),
            },
            pinnedPlacement: { deleteMany: jest.fn(), create: jest.fn() },
            pinnedNews: {
              upsert: jest.fn().mockResolvedValue({ id: 'pinned-news-1' }),
              deleteMany: jest.fn(),
            },
          }),
        );

      const result = await service.updateLayout(
        PinnedGridViewport.LARGE,
        baseDto,
      );

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(2);
      expect(result.config).toEqual({ columns: 3, rows: 12 });
    });

    it('gives up after exhausting deadlock retries', async () => {
      prismaMock.news.findMany.mockResolvedValue([{ id: 'news-1' }]);
      const deadlock = new Prisma.PrismaClientKnownRequestError(
        'Transaction failed due to a write conflict or a deadlock. Please retry your transaction',
        { code: 'P2034', clientVersion: '0.0.0' },
      );
      prismaMock.$transaction.mockRejectedValue(deadlock);

      await expect(
        service.updateLayout(PinnedGridViewport.LARGE, baseDto),
      ).rejects.toThrow(Prisma.PrismaClientKnownRequestError);
      expect(prismaMock.$transaction).toHaveBeenCalledTimes(3);
    });
  });
});

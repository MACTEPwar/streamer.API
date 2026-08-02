import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, PinnedGridViewport } from '../../generated/prisma/client';
import { CardImagePosition } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PinnedGridService } from './pinned-grid.service';

describe('PinnedGridService', () => {
  let service: PinnedGridService;
  const prismaMock = {
    $transaction: jest.fn(),
    pinnedGridLayout: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
    pinnedNewsSlot: {
      deleteMany: jest.fn(),
    },
    news: {
      findMany: jest.fn(),
    },
  };

  const style = {
    imagePosition: CardImagePosition.TOP,
    imageSizePercent: 50,
    imageScale: 1,
    imageOffsetX: 50,
    imageOffsetY: 50,
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
        slots: [
          {
            newsId: 'news-1',
            colStart: 1,
            rowStart: 1,
            colSpan: 1,
            rowSpan: 1,
            imagePosition: CardImagePosition.TOP,
            imageSizePercent: 50,
            imageScale: 1,
            imageOffsetX: 50,
            imageOffsetY: 50,
            backgroundColor: '#f9f9f9',
            textColor: '#1e1e1e',
            coverImageUrl: null,
          },
        ],
      });

      const result = await service.getLayout(PinnedGridViewport.LARGE);

      expect(prismaMock.pinnedGridLayout.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { viewport: PinnedGridViewport.LARGE },
        include: { slots: true },
      });
      expect(result.config).toEqual({ columns: 3, rows: 12 });
      expect(result.slots).toHaveLength(1);
      expect(result.slots[0].newsId).toBe('news-1');
    });

    it('throws NotFoundException when the layout does not exist (P2025)', async () => {
      prismaMock.pinnedGridLayout.findUniqueOrThrow.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Record not found', {
          code: 'P2025',
          clientVersion: '0.0.0',
        }),
      );

      await expect(
        service.getLayout(PinnedGridViewport.SMALL),
      ).rejects.toThrow(NotFoundException);
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
        slots: [
          { ...baseDto.slots[0], colStart: 4, colSpan: 1 },
        ],
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

    it('replaces the layout inside a transaction on success', async () => {
      prismaMock.news.findMany.mockResolvedValue([{ id: 'news-1' }]);
      const txFindUniqueOrThrow = jest
        .fn()
        .mockResolvedValue({ id: 'layout-1' });
      const txDeleteMany = jest.fn();
      const txUpdate = jest.fn().mockResolvedValue({
        columns: 3,
        rows: 12,
        slots: [],
      });
      prismaMock.$transaction.mockImplementation(
        (callback: (tx: unknown) => unknown) =>
          callback({
            pinnedGridLayout: {
              findUniqueOrThrow: txFindUniqueOrThrow,
              update: txUpdate,
            },
            pinnedNewsSlot: { deleteMany: txDeleteMany },
          }),
      );

      const result = await service.updateLayout(
        PinnedGridViewport.LARGE,
        baseDto,
      );

      expect(txDeleteMany).toHaveBeenCalledWith({
        where: { layoutId: 'layout-1' },
      });
      expect(txUpdate).toHaveBeenCalledWith({
        where: { viewport: PinnedGridViewport.LARGE },
        data: {
          columns: 3,
          rows: 12,
          slots: {
            create: [
              {
                newsId: 'news-1',
                colStart: 1,
                rowStart: 1,
                colSpan: 1,
                rowSpan: 1,
                imagePosition: style.imagePosition,
                imageSizePercent: style.imageSizePercent,
                imageScale: style.imageScale,
                imageOffsetX: style.imageOffsetX,
                imageOffsetY: style.imageOffsetY,
                backgroundColor: style.backgroundColor,
                textColor: style.textColor,
                coverImageUrl: null,
              },
            ],
          },
        },
        include: { slots: true },
      });
      expect(result.config).toEqual({ columns: 3, rows: 12 });
    });
  });
});

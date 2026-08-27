import { CardImagePosition, NewsCoverType } from '../../generated/prisma/enums';
import {
  PinnedGridLayoutWithPlacements,
  toPinnedGridLayoutDto,
} from './pinned-grid.mapper';

describe('toPinnedGridLayoutDto', () => {
  const layoutWithNews = (
    news: Record<string, unknown>,
  ): PinnedGridLayoutWithPlacements =>
    ({
      id: 'layout-1',
      viewport: 'LARGE',
      columns: 3,
      rows: 12,
      updatedAt: new Date('2026-01-01'),
      placements: [
        {
          id: 'placement-1',
          pinnedNewsId: 'pinned-1',
          layoutId: 'layout-1',
          colStart: 1,
          rowStart: 1,
          colSpan: 1,
          rowSpan: 1,
          pinnedNews: {
            id: 'pinned-1',
            newsId: 'news-1',
            imagePosition: CardImagePosition.TOP,
            imageSizePercent: 50,
            backgroundColor: '#f9f9f9',
            textColor: '#1e1e1e',
            createdAt: new Date('2026-01-01'),
            news,
          },
        },
      ],
    }) as unknown as PinnedGridLayoutWithPlacements;

  const newsWithoutCover = {
    id: 'news-1',
    coverType: NewsCoverType.NONE,
    coverUrl: null,
    coverFocalX: null,
    coverFocalY: null,
    images: [
      {
        id: 'img-1',
        url: '/uploads/first.jpg',
        order: 0,
        focalX: 10,
        focalY: 20,
      },
    ],
  };

  it('shows the cover of the news in the slot', () => {
    const dto = toPinnedGridLayoutDto(
      layoutWithNews({
        ...newsWithoutCover,
        coverType: NewsCoverType.CUSTOM,
        coverUrl: '/uploads/own.jpg',
        coverFocalX: 70,
        coverFocalY: 80,
      }),
    );

    expect(dto.slots[0].cover).toEqual({
      type: 'custom',
      url: '/uploads/own.jpg',
      focalPoint: { x: 70, y: 80 },
    });
  });

  it('leaves the slot without a picture when the news has no cover', () => {
    const dto = toPinnedGridLayoutDto(layoutWithNews(newsWithoutCover));

    expect(dto.slots[0].cover).toEqual({
      type: 'none',
      url: null,
      focalPoint: null,
    });
  });
});

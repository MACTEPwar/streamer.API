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
    title: 'Открыт турнир по CS2',
    description: 'Подробное описание новости',
    publishedAt: new Date('2026-08-01'),
    viewCount: 320,
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
    tags: [
      {
        id: 'tag-1',
        name: 'Турниры',
        color: '#d4b106',
        textColor: '#ffffff',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      },
    ],
    _count: { likes: 42 },
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

  describe('содержимое карточки (ЗАК-Б-01)', () => {
    it('carries everything the card renders, so the client need not look it up', () => {
      const dto = toPinnedGridLayoutDto(layoutWithNews(newsWithoutCover));

      expect(dto.slots[0].news).toEqual({
        title: 'Открыт турнир по CS2',
        description: 'Подробное описание новости',
        publishedAt: new Date('2026-08-01'),
        viewCount: 320,
        likeCount: 42,
        likedByCurrentUser: null,
        viewedByCurrentUser: null,
        tags: [
          {
            id: 'tag-1',
            name: 'Турниры',
            color: '#d4b106',
            textColor: '#ffffff',
            createdAt: new Date('2026-01-01'),
            updatedAt: new Date('2026-01-01'),
          },
        ],
      });
    });

    it('takes likeCount from the aggregate, not from a loaded list of rows', () => {
      const dto = toPinnedGridLayoutDto(
        layoutWithNews({ ...newsWithoutCover, _count: { likes: 1024 } }),
      );

      expect(dto.slots[0].news.likeCount).toBe(1024);
    });
  });

  describe('признаки собственной реакции (РЕА-Б-02)', () => {
    it('leaves them undefined for a guest — that is not the same as «did not react»', () => {
      const dto = toPinnedGridLayoutDto(layoutWithNews(newsWithoutCover), null);

      expect(dto.slots[0].news.likedByCurrentUser).toBeNull();
      expect(dto.slots[0].news.viewedByCurrentUser).toBeNull();
    });

    it('reports the real reactions of a signed-in reader', () => {
      const dto = toPinnedGridLayoutDto(layoutWithNews(newsWithoutCover), {
        liked: new Set(['news-1']),
        viewed: new Set<string>(),
      });

      expect(dto.slots[0].news.likedByCurrentUser).toBe(true);
      expect(dto.slots[0].news.viewedByCurrentUser).toBe(false);
    });

    it('distinguishes «did not react» from «no session» — false, not null', () => {
      const dto = toPinnedGridLayoutDto(layoutWithNews(newsWithoutCover), {
        liked: new Set<string>(),
        viewed: new Set<string>(),
      });

      expect(dto.slots[0].news.likedByCurrentUser).toBe(false);
      expect(dto.slots[0].news.viewedByCurrentUser).toBe(false);
    });
  });
});

import { Prisma } from '../../generated/prisma/client';
import {
  PinnedGridFocalPointDto,
  PinnedGridLayoutDto,
} from './dto/pinned-grid-layout.dto';
import { toWireImagePosition } from './pinned-grid-image-position.util';

export const PINNED_LAYOUT_INCLUDE = {
  placements: {
    include: {
      pinnedNews: {
        include: {
          news: {
            include: {
              images: true,
            },
          },
        },
      },
    },
  },
} as const;

export type PinnedGridLayoutWithPlacements = Prisma.PinnedGridLayoutGetPayload<{
  include: typeof PINNED_LAYOUT_INCLUDE;
}>;

type PinnedNewsWithImages =
  PinnedGridLayoutWithPlacements['placements'][number]['pinnedNews'];

/**
 * Фокус картинки, применяемой в слоте: если задан `coverImageUrl`, ищем среди
 * картинок новости совпадающую по `url` (обложка сетки переопределяет только
 * отображение, не перестаёт быть картинкой новости); иначе — первая картинка
 * новости по `order`. `null`, если картинки нет или у неё нет заданного
 * фокуса (тогда фронт использует центр 50/50).
 */
function resolveFocalPoint(
  pinnedNews: PinnedNewsWithImages,
): PinnedGridFocalPointDto | null {
  const images = pinnedNews.news.images
    .slice()
    .sort((a, b) => a.order - b.order);
  const coverImage = pinnedNews.coverImageUrl
    ? images.find((image) => image.url === pinnedNews.coverImageUrl)
    : undefined;
  const image = coverImage ?? images[0];

  if (!image || image.focalX === null || image.focalY === null) {
    return null;
  }

  return { x: image.focalX, y: image.focalY };
}

export function toPinnedGridLayoutDto(
  layout: PinnedGridLayoutWithPlacements,
): PinnedGridLayoutDto {
  return {
    config: {
      columns: layout.columns,
      rows: layout.rows,
    },
    slots: layout.placements.map((placement) => {
      const pinnedNews = placement.pinnedNews;

      return {
        newsId: pinnedNews.newsId,
        colStart: placement.colStart,
        rowStart: placement.rowStart,
        colSpan: placement.colSpan,
        rowSpan: placement.rowSpan,
        style: {
          imagePosition: toWireImagePosition(pinnedNews.imagePosition),
          imageSizePercent: pinnedNews.imageSizePercent,
          backgroundColor: pinnedNews.backgroundColor,
          textColor: pinnedNews.textColor,
        },
        coverImageUrl: pinnedNews.coverImageUrl,
        focalPoint: resolveFocalPoint(pinnedNews),
      };
    }),
  };
}

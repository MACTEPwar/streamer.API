import { Prisma } from '../../generated/prisma/client';
import { resolveNewsCover } from '../news-cover';
import { PinnedGridLayoutDto } from './dto/pinned-grid-layout.dto';
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
        cover: resolveNewsCover(pinnedNews.news),
      };
    }),
  };
}

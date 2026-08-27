import { Prisma } from '../../generated/prisma/client';
import { resolveNewsCover } from '../news-cover';
import { PinnedGridLayoutDto } from './dto/pinned-grid-layout.dto';
import { toWireImagePosition } from './pinned-grid-image-position.util';

/**
 * `tags` и `_count.likes` добавлены в streamer.API#76 — раскладка отдаётся
 * вместе со всем, что нужно карточке (`ЗАК-Б-01`).
 *
 * `likes`/`views` строками здесь НЕ включаются намеренно: ради двух булевых
 * флагов пришлось бы тянуть все реакции каждой новости (у популярной — тысячи
 * строк). Свои реакции читателя приходят отдельным пакетным запросом, см.
 * `PinnedGridService.getLayout()`.
 */
export const PINNED_LAYOUT_INCLUDE = {
  placements: {
    include: {
      pinnedNews: {
        include: {
          news: {
            include: {
              images: true,
              tags: true,
              _count: { select: { likes: true } },
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

/**
 * Новости, на которые текущий читатель уже отреагировал. `null` — сессии нет,
 * и признак собственной реакции не определён, что отличимо от «не реагировал»
 * (`РЕА-Б-02`).
 */
export interface OwnReactions {
  readonly liked: ReadonlySet<string>;
  readonly viewed: ReadonlySet<string>;
}

export function toPinnedGridLayoutDto(
  layout: PinnedGridLayoutWithPlacements,
  ownReactions: OwnReactions | null = null,
): PinnedGridLayoutDto {
  return {
    config: {
      columns: layout.columns,
      rows: layout.rows,
    },
    slots: layout.placements.map((placement) => {
      const pinnedNews = placement.pinnedNews;
      const news = pinnedNews.news;

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
        cover: resolveNewsCover(news),
        news: {
          title: news.title,
          description: news.description,
          publishedAt: news.publishedAt,
          viewCount: news.viewCount,
          likeCount: news._count.likes,
          likedByCurrentUser: ownReactions
            ? ownReactions.liked.has(news.id)
            : null,
          viewedByCurrentUser: ownReactions
            ? ownReactions.viewed.has(news.id)
            : null,
          tags: news.tags.map((tag) => ({
            id: tag.id,
            name: tag.name,
            color: tag.color,
            textColor: tag.textColor,
            createdAt: tag.createdAt,
            updatedAt: tag.updatedAt,
          })),
        },
      };
    }),
  };
}

import { Prisma } from '../generated/prisma/client';
import { NewsDto } from './dto/news.dto';

export const NEWS_INCLUDE = {
  images: true,
  tags: true,
  likes: { select: { userId: true } },
  views: { select: { userId: true } },
  _count: { select: { likes: true } },
} as const;

export type NewsWithRelations = Prisma.NewsGetPayload<{
  include: typeof NEWS_INCLUDE;
}>;

export function toNewsDto(
  news: NewsWithRelations,
  currentUserId?: string,
): NewsDto {
  return {
    id: news.id,
    title: news.title,
    description: news.description,
    publishedAt: news.publishedAt,
    viewCount: news.viewCount,
    likeCount: news._count.likes,
    likedByCurrentUser: currentUserId
      ? news.likes.some((like) => like.userId === currentUserId)
      : null,
    viewedByCurrentUser: currentUserId
      ? news.views.some((view) => view.userId === currentUserId)
      : null,
    images: news.images
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((image) => ({ id: image.id, url: image.url, order: image.order })),
    tags: news.tags.map((tag) => ({
      id: tag.id,
      name: tag.name,
      color: tag.color,
      textColor: tag.textColor,
      createdAt: tag.createdAt,
      updatedAt: tag.updatedAt,
    })),
    createdAt: news.createdAt,
    updatedAt: news.updatedAt,
  };
}

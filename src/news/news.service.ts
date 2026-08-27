import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginationMeta } from '../shared/pagination/paginate';
import { LikeResponseDto } from './dto/like-response.dto';
import { NewsDto } from './dto/news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { ViewResponseDto } from './dto/view-response.dto';
import { NEWS_INCLUDE, toNewsDto } from './news.mapper';
import { toInclusiveBoundary } from './utils/published-boundary.util';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: NewsQueryDto, currentUserId?: string) {
    // Один и тот же `where` уходит и в findMany, и в count: отбор применяется
    // ДО разбиения на порции, поэтому общий объём соответствует отобранному
    // (ФИЛ-Б-01), а сам отбор идёт по всему архиву на стороне БД (ФИЛ-О-01).
    const where = this.buildWhere(query, currentUserId);

    const [items, total] = await Promise.all([
      this.prisma.news.findMany({
        where,
        include: NEWS_INCLUDE,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.sortBy
          ? { [query.sortBy]: query.sortOrder }
          : { publishedAt: 'desc' },
      }),
      this.prisma.news.count({ where }),
    ]);

    return {
      items: items.map((news) => toNewsDto(news, currentUserId)),
      meta: buildPaginationMeta(query.page, query.limit, total),
    };
  }

  async findOne(id: string, currentUserId?: string): Promise<NewsDto> {
    const news = await this.prisma.news.findUnique({
      where: { id },
      include: NEWS_INCLUDE,
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }

    return toNewsDto(news, currentUserId);
  }

  async like(userId: string, newsId: string): Promise<LikeResponseDto> {
    await this.assertNewsExists(newsId);

    await this.prisma.newsLike.upsert({
      where: { userId_newsId: { userId, newsId } },
      create: { userId, newsId },
      update: {},
    });

    return this.buildLikeResponse(newsId, true);
  }

  async unlike(userId: string, newsId: string): Promise<LikeResponseDto> {
    await this.assertNewsExists(newsId);

    await this.prisma.newsLike.deleteMany({ where: { userId, newsId } });

    return this.buildLikeResponse(newsId, false);
  }

  async markViewed(userId: string, newsId: string): Promise<ViewResponseDto> {
    await this.assertNewsExists(newsId);

    try {
      const [, news] = await this.prisma.$transaction([
        this.prisma.newsView.create({ data: { userId, newsId } }),
        this.prisma.news.update({
          where: { id: newsId },
          data: { viewCount: { increment: 1 } },
        }),
      ]);

      return { viewCount: news.viewCount, viewedByCurrentUser: true };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        const news = await this.prisma.news.findUniqueOrThrow({
          where: { id: newsId },
          select: { viewCount: true },
        });

        return { viewCount: news.viewCount, viewedByCurrentUser: true };
      }

      throw error;
    }
  }

  /**
   * Условия складываются в один объект `where`: Prisma трактует его поля как
   * AND, то есть новость попадает в результат, только удовлетворяя всем
   * заданным условиям одновременно (ФИЛ-О-05).
   */
  private buildWhere(
    query: NewsQueryDto,
    currentUserId?: string,
  ): Prisma.NewsWhereInput {
    const where: Prisma.NewsWhereInput = {};

    if (query.search) {
      where.title = { contains: query.search };
    }

    const tagIds = this.collectTagIds(query);
    if (tagIds.length > 0) {
      where.tags = { some: { id: { in: tagIds } } };
    }

    const publishedAt = this.buildPublishedAtFilter(query);
    if (publishedAt) {
      where.publishedAt = publishedAt;
    }

    if (query.likedByCurrentUser !== undefined) {
      const userId = this.requireReader(currentUserId);
      where.likes = query.likedByCurrentUser
        ? { some: { userId } }
        : { none: { userId } };
    }

    if (query.viewedByCurrentUser !== undefined) {
      const userId = this.requireReader(currentUserId);
      where.views = query.viewedByCurrentUser
        ? { some: { userId } }
        : { none: { userId } };
    }

    return where;
  }

  /** Устаревший `tagId` объединяется с `tagIds` — см. NewsQueryDto. */
  private collectTagIds(query: NewsQueryDto): string[] {
    const ids = [...(query.tagIds ?? [])];

    if (query.tagId) {
      ids.push(query.tagId);
    }

    return [...new Set(ids)];
  }

  private buildPublishedAtFilter(
    query: NewsQueryDto,
  ): Prisma.DateTimeFilter | undefined {
    const range: Prisma.DateTimeFilter = {};

    if (query.publishedFrom) {
      range.gte = toInclusiveBoundary(query.publishedFrom, 'start');
    }

    if (query.publishedTo) {
      range.lte = toInclusiveBoundary(query.publishedTo, 'end');
    }

    // Каждая граница задаётся независимо (ФИЛ-О-02) — период может быть
    // открыт с любой стороны.
    return range.gte || range.lte ? range : undefined;
  }

  /**
   * Отбор по своим лайкам и просмотрам без сессии не имеет смысла: молча
   * вернуть пустой список — соврать, молча проигнорировать условие — отдать
   * не то, что просили. Поэтому 401 (ФИЛ-О-04).
   */
  private requireReader(currentUserId?: string): string {
    if (!currentUserId) {
      throw new UnauthorizedException(
        'Отбор по просмотренным и отмеченным лайком новостям доступен только авторизованному читателю',
      );
    }

    return currentUserId;
  }

  private async assertNewsExists(id: string): Promise<void> {
    const news = await this.prisma.news.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }
  }

  private async buildLikeResponse(
    newsId: string,
    likedByCurrentUser: boolean,
  ): Promise<LikeResponseDto> {
    const likeCount = await this.prisma.newsLike.count({
      where: { newsId },
    });

    return { likeCount, likedByCurrentUser };
  }
}

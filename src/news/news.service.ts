import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { buildPaginationMeta } from '../shared/pagination/paginate';
import { LikeResponseDto } from './dto/like-response.dto';
import { NewsDto } from './dto/news.dto';
import { NewsQueryDto } from './dto/news-query.dto';
import { ViewResponseDto } from './dto/view-response.dto';
import { NEWS_INCLUDE, toNewsDto } from './news.mapper';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: NewsQueryDto, currentUserId?: string) {
    const where = this.buildWhere(query);

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

  private buildWhere(query: NewsQueryDto): Prisma.NewsWhereInput {
    const where: Prisma.NewsWhereInput = {};

    if (query.search) {
      where.title = { contains: query.search };
    }

    if (query.tagId) {
      where.tags = { some: { id: query.tagId } };
    }

    return where;
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

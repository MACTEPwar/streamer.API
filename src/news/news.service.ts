import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationQueryDto } from '../shared/dto/pagination-query.dto';
import { buildPaginationMeta } from '../shared/pagination/paginate';
import { LikeResponseDto } from './dto/like-response.dto';
import { NewsDto } from './dto/news.dto';
import { NEWS_INCLUDE, toNewsDto } from './news.mapper';

@Injectable()
export class NewsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(query: PaginationQueryDto, currentUserId?: string) {
    const [items, total] = await Promise.all([
      this.prisma.news.findMany({
        include: NEWS_INCLUDE,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        orderBy: query.sortBy
          ? { [query.sortBy]: query.sortOrder }
          : { publishedAt: 'desc' },
      }),
      this.prisma.news.count(),
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

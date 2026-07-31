import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CreateNewsDto } from '../../news/dto/create-news.dto';
import { NewsDto } from '../../news/dto/news.dto';
import { NEWS_INCLUDE, toNewsDto } from '../../news/news.mapper';
import { NewsImageDownloadService } from '../../news/news-image-download.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AdminNewsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly newsImageDownloadService: NewsImageDownloadService,
  ) {}

  async create(dto: CreateNewsDto): Promise<NewsDto> {
    const { resolved, downloadedFilePaths } =
      await this.newsImageDownloadService.resolveImageUrls(dto.imageUrls);

    try {
      const news = await this.prisma.$transaction((tx) =>
        tx.news.create({
          data: {
            title: dto.title,
            description: dto.description,
            publishedAt: dto.publishedAt
              ? new Date(dto.publishedAt)
              : undefined,
            images: {
              create: resolved.map((image, index) => ({
                url: image.url,
                order: index,
              })),
            },
            tags: {
              connect: dto.tagIds.map((id) => ({ id })),
            },
          },
          include: NEWS_INCLUDE,
        }),
      );

      return toNewsDto(news);
    } catch (error) {
      await this.newsImageDownloadService.cleanup(downloadedFilePaths);

      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2025'
      ) {
        throw new BadRequestException(
          'Один или несколько tagIds не существуют',
        );
      }

      throw error;
    }
  }
}

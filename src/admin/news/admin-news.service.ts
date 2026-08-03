import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { CreateNewsDto } from '../../news/dto/create-news.dto';
import { NewsDto } from '../../news/dto/news.dto';
import { UpdateNewsDto } from '../../news/dto/update-news.dto';
import { NEWS_INCLUDE, toNewsDto } from '../../news/news.mapper';
import {
  NewsImageDownloadService,
  ResolvedNewsImage,
} from '../../news/news-image-download.service';
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
            hasNoImage: dto.hasNoImage,
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
      throw this.mapMissingTagIdError(error);
    }
  }

  async update(id: string, dto: UpdateNewsDto): Promise<NewsDto> {
    await this.assertExists(id);

    let resolvedImages: ResolvedNewsImage[] | undefined;
    let downloadedFilePaths: string[] = [];

    if (dto.imageUrls) {
      const resolution = await this.newsImageDownloadService.resolveImageUrls(
        dto.imageUrls,
      );
      resolvedImages = resolution.resolved;
      downloadedFilePaths = resolution.downloadedFilePaths;
    }

    try {
      const news = await this.prisma.$transaction(async (tx) => {
        if (resolvedImages) {
          await tx.newsImage.deleteMany({ where: { newsId: id } });
        }

        return tx.news.update({
          where: { id },
          data: {
            title: dto.title,
            description: dto.description,
            publishedAt: dto.publishedAt
              ? new Date(dto.publishedAt)
              : undefined,
            hasNoImage: dto.hasNoImage,
            images: resolvedImages
              ? {
                  create: resolvedImages.map((image, index) => ({
                    url: image.url,
                    order: index,
                  })),
                }
              : undefined,
            tags: dto.tagIds
              ? { set: dto.tagIds.map((tagId) => ({ id: tagId })) }
              : undefined,
          },
          include: NEWS_INCLUDE,
        });
      });

      return toNewsDto(news);
    } catch (error) {
      await this.newsImageDownloadService.cleanup(downloadedFilePaths);
      throw this.mapMissingTagIdError(error);
    }
  }

  async remove(id: string): Promise<NewsDto> {
    await this.assertExists(id);

    const news = await this.prisma.news.delete({
      where: { id },
      include: NEWS_INCLUDE,
    });

    return toNewsDto(news);
  }

  private async assertExists(id: string): Promise<void> {
    const news = await this.prisma.news.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!news) {
      throw new NotFoundException('Новость не найдена');
    }
  }

  private mapMissingTagIdError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2025'
    ) {
      return new BadRequestException('Один или несколько tagIds не существуют');
    }

    return error;
  }
}

import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NewsTag, Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNewsTagDto } from './dto/create-news-tag.dto';
import { UpdateNewsTagDto } from './dto/update-news-tag.dto';

@Injectable()
export class NewsTagService {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<NewsTag[]> {
    return this.prisma.newsTag.findMany({ orderBy: { name: 'asc' } });
  }

  async create(dto: CreateNewsTagDto): Promise<NewsTag> {
    try {
      return await this.prisma.newsTag.create({ data: dto });
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  async update(id: string, dto: UpdateNewsTagDto): Promise<NewsTag> {
    await this.assertExists(id);

    try {
      return await this.prisma.newsTag.update({ where: { id }, data: dto });
    } catch (error) {
      throw this.mapUniqueConstraintError(error);
    }
  }

  async remove(id: string): Promise<NewsTag> {
    await this.assertExists(id);

    return this.prisma.newsTag.delete({ where: { id } });
  }

  private async assertExists(id: string): Promise<void> {
    const tag = await this.prisma.newsTag.findUnique({ where: { id } });

    if (!tag) {
      throw new NotFoundException('Тег не найден');
    }
  }

  private mapUniqueConstraintError(error: unknown): unknown {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Тег с таким названием уже существует');
    }
    return error;
  }
}

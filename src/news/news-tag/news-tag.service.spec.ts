import { ConflictException, NotFoundException } from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { NewsTagService } from './news-tag.service';

describe('NewsTagService', () => {
  let service: NewsTagService;
  const prismaMock = {
    newsTag: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new NewsTagService(prismaMock as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns tags ordered by name', async () => {
      prismaMock.newsTag.findMany.mockResolvedValue([]);

      await service.findAll();

      expect(prismaMock.newsTag.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
      });
    });
  });

  describe('create', () => {
    it('creates a tag', async () => {
      prismaMock.newsTag.create.mockResolvedValue({});

      await service.create({ name: 'Турниры', color: '#fff' });

      expect(prismaMock.newsTag.create).toHaveBeenCalledWith({
        data: { name: 'Турниры', color: '#fff' },
      });
    });

    it('throws ConflictException when the name is already taken', async () => {
      prismaMock.newsTag.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Duplicate', {
          code: 'P2002',
          clientVersion: '0.0.0',
        }),
      );

      await expect(
        service.create({ name: 'Турниры', color: '#fff' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates a tag', async () => {
      prismaMock.newsTag.findUnique.mockResolvedValue({ id: 'tag-1' });
      prismaMock.newsTag.update.mockResolvedValue({});

      await service.update('tag-1', { name: 'Новое имя' });

      expect(prismaMock.newsTag.update).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
        data: { name: 'Новое имя' },
      });
    });

    it('throws NotFoundException when the tag does not exist', async () => {
      prismaMock.newsTag.findUnique.mockResolvedValue(null);

      await expect(
        service.update('missing', { name: 'Новое имя' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.newsTag.update).not.toHaveBeenCalled();
    });

    it('throws ConflictException when renamed to an already-taken name', async () => {
      prismaMock.newsTag.findUnique.mockResolvedValue({ id: 'tag-1' });
      prismaMock.newsTag.update.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Duplicate', {
          code: 'P2002',
          clientVersion: '0.0.0',
        }),
      );

      await expect(service.update('tag-1', { name: 'Занято' })).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe('remove', () => {
    it('deletes a tag', async () => {
      prismaMock.newsTag.findUnique.mockResolvedValue({ id: 'tag-1' });
      prismaMock.newsTag.delete.mockResolvedValue({});

      await service.remove('tag-1');

      expect(prismaMock.newsTag.delete).toHaveBeenCalledWith({
        where: { id: 'tag-1' },
      });
    });

    it('throws NotFoundException when the tag does not exist', async () => {
      prismaMock.newsTag.findUnique.mockResolvedValue(null);

      await expect(service.remove('missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.newsTag.delete).not.toHaveBeenCalled();
    });
  });
});

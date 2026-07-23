import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { SocialLinkType } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { SocialLinkService } from './social-link.service';

describe('SocialLinkService', () => {
  let service: SocialLinkService;
  const prismaMock = {
    socialLink: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new SocialLinkService(prismaMock as unknown as PrismaService);
  });

  describe('findAllByUserId', () => {
    it('returns social links for the given user', async () => {
      prismaMock.socialLink.findMany.mockResolvedValue([]);

      await service.findAllByUserId('u1');

      expect(prismaMock.socialLink.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
    });
  });

  describe('create', () => {
    it('creates a social link for the given user', async () => {
      prismaMock.socialLink.create.mockResolvedValue({});

      await service.create('u1', {
        type: SocialLinkType.TELEGRAM,
        value: '@streamer_nick',
      });

      expect(prismaMock.socialLink.create).toHaveBeenCalledWith({
        data: {
          type: SocialLinkType.TELEGRAM,
          value: '@streamer_nick',
          userId: 'u1',
        },
      });
    });
  });

  describe('update', () => {
    it('updates a social link owned by the given user', async () => {
      prismaMock.socialLink.findUnique.mockResolvedValue({
        id: 'sl1',
        userId: 'u1',
      });
      prismaMock.socialLink.update.mockResolvedValue({});

      await service.update('u1', 'sl1', { value: 'newvalue' });

      expect(prismaMock.socialLink.update).toHaveBeenCalledWith({
        where: { id: 'sl1' },
        data: { value: 'newvalue' },
      });
    });

    it('throws NotFoundException when the social link does not exist', async () => {
      prismaMock.socialLink.findUnique.mockResolvedValue(null);

      await expect(
        service.update('u1', 'missing', { value: 'newvalue' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.socialLink.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the social link belongs to another user', async () => {
      prismaMock.socialLink.findUnique.mockResolvedValue({
        id: 'sl1',
        userId: 'someone-else',
      });

      await expect(
        service.update('u1', 'sl1', { value: 'newvalue' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.socialLink.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a social link owned by the given user', async () => {
      prismaMock.socialLink.findUnique.mockResolvedValue({
        id: 'sl1',
        userId: 'u1',
      });
      prismaMock.socialLink.delete.mockResolvedValue({});

      await service.remove('u1', 'sl1');

      expect(prismaMock.socialLink.delete).toHaveBeenCalledWith({
        where: { id: 'sl1' },
      });
    });

    it('throws NotFoundException when the social link does not exist', async () => {
      prismaMock.socialLink.findUnique.mockResolvedValue(null);

      await expect(service.remove('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.socialLink.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the social link belongs to another user', async () => {
      prismaMock.socialLink.findUnique.mockResolvedValue({
        id: 'sl1',
        userId: 'someone-else',
      });

      await expect(service.remove('u1', 'sl1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.socialLink.delete).not.toHaveBeenCalled();
    });
  });
});

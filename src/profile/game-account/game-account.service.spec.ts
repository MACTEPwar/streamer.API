import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { GameAccountService } from './game-account.service';

describe('GameAccountService', () => {
  let service: GameAccountService;
  const prismaMock = {
    gameAccount: {
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new GameAccountService(prismaMock as unknown as PrismaService);
  });

  describe('findAllByUserId', () => {
    it('returns game accounts for the given user', async () => {
      prismaMock.gameAccount.findMany.mockResolvedValue([]);

      await service.findAllByUserId('u1');

      expect(prismaMock.gameAccount.findMany).toHaveBeenCalledWith({
        where: { userId: 'u1' },
      });
    });
  });

  describe('create', () => {
    it('creates a game account for the given user', async () => {
      prismaMock.gameAccount.create.mockResolvedValue({});

      await service.create('u1', {
        nickname: 'ProNickname',
        externalId: '76561198000000000',
      });

      expect(prismaMock.gameAccount.create).toHaveBeenCalledWith({
        data: {
          nickname: 'ProNickname',
          externalId: '76561198000000000',
          userId: 'u1',
        },
      });
    });
  });

  describe('update', () => {
    it('updates a game account owned by the given user', async () => {
      prismaMock.gameAccount.findUnique.mockResolvedValue({
        id: 'ga1',
        userId: 'u1',
      });
      prismaMock.gameAccount.update.mockResolvedValue({});

      await service.update('u1', 'ga1', { nickname: 'NewNickname' });

      expect(prismaMock.gameAccount.update).toHaveBeenCalledWith({
        where: { id: 'ga1' },
        data: { nickname: 'NewNickname' },
      });
    });

    it('throws NotFoundException when the game account does not exist', async () => {
      prismaMock.gameAccount.findUnique.mockResolvedValue(null);

      await expect(
        service.update('u1', 'missing', { nickname: 'NewNickname' }),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.gameAccount.update).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the game account belongs to another user', async () => {
      prismaMock.gameAccount.findUnique.mockResolvedValue({
        id: 'ga1',
        userId: 'someone-else',
      });

      await expect(
        service.update('u1', 'ga1', { nickname: 'NewNickname' }),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.gameAccount.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes a game account owned by the given user', async () => {
      prismaMock.gameAccount.findUnique.mockResolvedValue({
        id: 'ga1',
        userId: 'u1',
      });
      prismaMock.gameAccount.delete.mockResolvedValue({});

      await service.remove('u1', 'ga1');

      expect(prismaMock.gameAccount.delete).toHaveBeenCalledWith({
        where: { id: 'ga1' },
      });
    });

    it('throws NotFoundException when the game account does not exist', async () => {
      prismaMock.gameAccount.findUnique.mockResolvedValue(null);

      await expect(service.remove('u1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.gameAccount.delete).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException when the game account belongs to another user', async () => {
      prismaMock.gameAccount.findUnique.mockResolvedValue({
        id: 'ga1',
        userId: 'someone-else',
      });

      await expect(service.remove('u1', 'ga1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.gameAccount.delete).not.toHaveBeenCalled();
    });
  });
});

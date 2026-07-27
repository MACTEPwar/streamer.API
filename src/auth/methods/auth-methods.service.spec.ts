import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { GoogleAuthService } from '../google-auth.service';
import { AuthMethodsService } from './auth-methods.service';

describe('AuthMethodsService', () => {
  let service: AuthMethodsService;
  const prismaMock = {
    authMethod: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };
  const googleAuthServiceMock = {
    verifyIdToken: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AuthMethodsService(
      prismaMock as unknown as PrismaService,
      googleAuthServiceMock as unknown as GoogleAuthService,
    );
  });

  describe('findAll', () => {
    it('returns the methods of the current user without passwordHash', async () => {
      prismaMock.authMethod.findMany.mockResolvedValue([
        { type: 'LOCAL', identifier: 'johndoe' },
      ]);

      const result = await service.findAll('user-1');

      expect(prismaMock.authMethod.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        select: { type: true, identifier: true },
      });
      expect(result).toEqual([{ type: 'LOCAL', identifier: 'johndoe' }]);
    });
  });

  describe('addLocal', () => {
    it('creates a LOCAL AuthMethod for the current user', async () => {
      prismaMock.authMethod.findFirst.mockResolvedValue(null);
      prismaMock.authMethod.create.mockResolvedValue({});

      await service.addLocal('user-1', {
        login: 'johndoe',
        password: 'secret123',
      });

      expect(prismaMock.authMethod.create).toHaveBeenCalledTimes(1);
      const [[createArgs]] = prismaMock.authMethod.create.mock.calls as [
        [{ data: { userId: string; type: string; identifier: string; passwordHash: string } }],
      ];
      expect(createArgs.data.userId).toBe('user-1');
      expect(createArgs.data.type).toBe('LOCAL');
      expect(createArgs.data.identifier).toBe('johndoe');
    });

    it('throws ConflictException when the user already has a LOCAL method', async () => {
      prismaMock.authMethod.findFirst.mockResolvedValue({ type: 'LOCAL' });

      await expect(
        service.addLocal('user-1', { login: 'johndoe', password: 'secret123' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.authMethod.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the login is already taken by another user', async () => {
      prismaMock.authMethod.findFirst.mockResolvedValue(null);
      const { Prisma } = jest.requireActual(
        '../../generated/prisma/client',
      ) as { Prisma: typeof import('../../generated/prisma/client').Prisma };
      prismaMock.authMethod.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Duplicate', {
          code: 'P2002',
          clientVersion: '0.0.0',
        }),
      );

      await expect(
        service.addLocal('user-1', { login: 'taken', password: 'secret123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('changeLocalPassword', () => {
    it('updates the passwordHash when currentPassword matches', async () => {
      const currentPasswordHash = await bcrypt.hash('current-secret', 4);
      prismaMock.authMethod.findFirst.mockResolvedValue({
        id: 'method-1',
        passwordHash: currentPasswordHash,
      });
      prismaMock.authMethod.update.mockResolvedValue({});

      await service.changeLocalPassword('user-1', {
        currentPassword: 'current-secret',
        newPassword: 'new-secret-1',
      });

      expect(prismaMock.authMethod.update).toHaveBeenCalledTimes(1);
      const [[updateArgs]] = prismaMock.authMethod.update.mock.calls as [
        [{ where: { id: string }; data: { passwordHash: string } }],
      ];
      expect(updateArgs.where).toEqual({ id: 'method-1' });
      await expect(
        bcrypt.compare('new-secret-1', updateArgs.data.passwordHash),
      ).resolves.toBe(true);
    });

    it('throws BadRequestException when the user has no LOCAL method', async () => {
      prismaMock.authMethod.findFirst.mockResolvedValue(null);

      await expect(
        service.changeLocalPassword('user-1', {
          currentPassword: 'anything',
          newPassword: 'new-secret-1',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws UnauthorizedException when currentPassword does not match', async () => {
      const currentPasswordHash = await bcrypt.hash('current-secret', 4);
      prismaMock.authMethod.findFirst.mockResolvedValue({
        id: 'method-1',
        passwordHash: currentPasswordHash,
      });

      await expect(
        service.changeLocalPassword('user-1', {
          currentPassword: 'wrong-secret',
          newPassword: 'new-secret-1',
        }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prismaMock.authMethod.update).not.toHaveBeenCalled();
    });
  });

  describe('addGoogle', () => {
    it('links the verified googleId to the current user', async () => {
      googleAuthServiceMock.verifyIdToken.mockResolvedValue({
        sub: 'google-sub-1',
      });
      prismaMock.authMethod.findFirst.mockResolvedValue(null);
      prismaMock.authMethod.findUnique.mockResolvedValue(null);
      prismaMock.authMethod.create.mockResolvedValue({});

      await service.addGoogle('user-1', { idToken: 'token' });

      expect(prismaMock.authMethod.create).toHaveBeenCalledWith({
        data: { userId: 'user-1', type: 'GOOGLE', identifier: 'google-sub-1' },
      });
    });

    it('throws ConflictException when the user already has a GOOGLE method', async () => {
      googleAuthServiceMock.verifyIdToken.mockResolvedValue({
        sub: 'google-sub-1',
      });
      prismaMock.authMethod.findFirst.mockResolvedValue({ type: 'GOOGLE' });

      await expect(
        service.addGoogle('user-1', { idToken: 'token' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.authMethod.create).not.toHaveBeenCalled();
    });

    it('throws ConflictException when the googleId is already linked to another user', async () => {
      googleAuthServiceMock.verifyIdToken.mockResolvedValue({
        sub: 'google-sub-1',
      });
      prismaMock.authMethod.findFirst.mockResolvedValue(null);
      prismaMock.authMethod.findUnique.mockResolvedValue({
        userId: 'other-user',
      });

      await expect(
        service.addGoogle('user-1', { idToken: 'token' }),
      ).rejects.toThrow(ConflictException);
      expect(prismaMock.authMethod.create).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes the method when more than one method remains', async () => {
      prismaMock.authMethod.findFirst.mockResolvedValue({ id: 'method-1' });
      prismaMock.authMethod.count.mockResolvedValue(2);
      prismaMock.authMethod.delete.mockResolvedValue({});

      await service.remove('user-1', 'GOOGLE');

      expect(prismaMock.authMethod.delete).toHaveBeenCalledWith({
        where: { id: 'method-1' },
      });
    });

    it('throws ForbiddenException when it is the last remaining method', async () => {
      prismaMock.authMethod.findFirst.mockResolvedValue({ id: 'method-1' });
      prismaMock.authMethod.count.mockResolvedValue(1);

      await expect(service.remove('user-1', 'LOCAL')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.authMethod.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user has no method of that type', async () => {
      prismaMock.authMethod.findFirst.mockResolvedValue(null);

      await expect(service.remove('user-1', 'GOOGLE')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.authMethod.delete).not.toHaveBeenCalled();
    });
  });
});

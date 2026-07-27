import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { AdminUsersQueryDto } from './dto/admin-users-query.dto';
import { AdminUsersService } from './admin-users.service';

describe('AdminUsersService', () => {
  let service: AdminUsersService;
  const prismaMock = {
    user: {
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminUsersService(prismaMock as unknown as PrismaService);
  });

  describe('findAll', () => {
    it('returns a paginated list of users without filters', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        {
          id: 'u1',
          role: Role.USER,
          createdAt: new Date('2026-01-01'),
          updatedAt: new Date('2026-01-01'),
          profile: { name: 'user1' },
          authMethods: [{ type: 'LOCAL' }],
        },
      ]);
      prismaMock.user.count.mockResolvedValue(1);

      const query = new AdminUsersQueryDto();
      const result = await service.findAll(query);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: {},
        include: { profile: true, authMethods: true },
        skip: 0,
        take: 20,
        orderBy: undefined,
      });
      expect(prismaMock.user.count).toHaveBeenCalledWith({ where: {} });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual({
        id: 'u1',
        name: 'user1',
        role: Role.USER,
        authMethods: ['LOCAL'],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      });
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
    });

    it('filters by search only (matches Profile.name OR AuthMethod.identifier)', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const query = new AdminUsersQueryDto();
      query.search = 'john';
      await service.findAll(query);

      const expectedWhere = {
        OR: [
          { profile: { name: { contains: 'john' } } },
          { authMethods: { some: { identifier: { contains: 'john' } } } },
        ],
      };
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        include: { profile: true, authMethods: true },
        skip: 0,
        take: 20,
        orderBy: undefined,
      });
      expect(prismaMock.user.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });

    it('filters by role only', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const query = new AdminUsersQueryDto();
      query.role = Role.ADMIN;
      await service.findAll(query);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: { role: Role.ADMIN },
        include: { profile: true, authMethods: true },
        skip: 0,
        take: 20,
        orderBy: undefined,
      });
      expect(prismaMock.user.count).toHaveBeenCalledWith({
        where: { role: Role.ADMIN },
      });
    });

    it('combines search and role filters', async () => {
      prismaMock.user.findMany.mockResolvedValue([]);
      prismaMock.user.count.mockResolvedValue(0);

      const query = new AdminUsersQueryDto();
      query.search = 'john';
      query.role = Role.ADMIN;
      await service.findAll(query);

      const expectedWhere = {
        OR: [
          { profile: { name: { contains: 'john' } } },
          { authMethods: { some: { identifier: { contains: 'john' } } } },
        ],
        role: Role.ADMIN,
      };
      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        include: { profile: true, authMethods: true },
        skip: 0,
        take: 20,
        orderBy: undefined,
      });
      expect(prismaMock.user.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });
    });
  });

  describe('findOne', () => {
    it('returns full user detail data', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: Role.USER,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        profile: {
          name: 'User One',
          avatarUrl: '/uploads/avatar.png',
        },
        authMethods: [{ type: 'LOCAL' }],
        gameAccounts: [{ id: 'ga1', userId: 'u1', nickname: 'nick' }],
        socialLinks: [{ id: 'sl1', userId: 'u1', type: 'TELEGRAM' }],
      });

      const result = await service.findOne('u1');

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: 'u1' },
        include: {
          profile: true,
          gameAccounts: true,
          socialLinks: true,
          authMethods: true,
        },
      });
      expect(result).toEqual({
        id: 'u1',
        name: 'User One',
        role: Role.USER,
        authMethods: ['LOCAL'],
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        avatarUrl: '/uploads/avatar.png',
        gameAccounts: [{ id: 'ga1', userId: 'u1', nickname: 'nick' }],
        socialLinks: [{ id: 'sl1', userId: 'u1', type: 'TELEGRAM' }],
      });
    });

    it('falls back to null profile fields when profile is missing', async () => {
      prismaMock.user.findUnique.mockResolvedValue({
        id: 'u1',
        role: Role.USER,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        profile: null,
        authMethods: [],
        gameAccounts: [],
        socialLinks: [],
      });

      const result = await service.findOne('u1');

      expect(result.name).toBeNull();
      expect(result.avatarUrl).toBeNull();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.findOne('missing')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateRole', () => {
    it('updates the role of another user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u2' });
      prismaMock.user.update.mockResolvedValue({ id: 'u2', role: Role.ADMIN });

      await service.updateRole('admin1', 'u2', Role.ADMIN);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: 'u2' },
        data: { role: Role.ADMIN },
      });
    });

    it('throws ForbiddenException when changing own role', async () => {
      await expect(
        service.updateRole('admin1', 'admin1', Role.USER),
      ).rejects.toThrow(ForbiddenException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(
        service.updateRole('admin1', 'missing', Role.ADMIN),
      ).rejects.toThrow(NotFoundException);
      expect(prismaMock.user.update).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes another user', async () => {
      prismaMock.user.findUnique.mockResolvedValue({ id: 'u2' });
      prismaMock.user.delete.mockResolvedValue({ id: 'u2' });

      await service.remove('admin1', 'u2');

      expect(prismaMock.user.delete).toHaveBeenCalledWith({
        where: { id: 'u2' },
      });
    });

    it('throws ForbiddenException when deleting self', async () => {
      await expect(service.remove('admin1', 'admin1')).rejects.toThrow(
        ForbiddenException,
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when the user does not exist', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(service.remove('admin1', 'missing')).rejects.toThrow(
        NotFoundException,
      );
      expect(prismaMock.user.delete).not.toHaveBeenCalled();
    });
  });
});

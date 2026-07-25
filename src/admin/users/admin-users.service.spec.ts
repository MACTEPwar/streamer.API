import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserEntity } from '../../auth/entities/user.entity';
import { Role } from '../../generated/prisma/enums';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationQueryDto } from '../../shared/dto/pagination-query.dto';
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
    it('returns a paginated list of users', async () => {
      prismaMock.user.findMany.mockResolvedValue([
        { id: 'u1', login: 'user1', role: Role.USER, passwordHash: 'hash' },
      ]);
      prismaMock.user.count.mockResolvedValue(1);

      const query = new PaginationQueryDto();
      const result = await service.findAll(query);

      expect(prismaMock.user.findMany).toHaveBeenCalledWith({
        skip: 0,
        take: 20,
        orderBy: undefined,
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toBeInstanceOf(UserEntity);
      expect(result.meta).toEqual({
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
      });
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

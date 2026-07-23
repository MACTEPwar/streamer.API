import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAuthService } from './local-auth.service';

describe('LocalAuthService.changePassword', () => {
  let service: LocalAuthService;
  const prismaMock = {
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalAuthService(prismaMock as unknown as PrismaService);
  });

  it('updates passwordHash when currentPassword matches', async () => {
    const currentPasswordHash = await bcrypt.hash('current-secret', 4);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: currentPasswordHash,
    });
    prismaMock.user.update.mockResolvedValue({});

    await service.changePassword('user-1', {
      currentPassword: 'current-secret',
      newPassword: 'new-secret-1',
    });

    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    const [[updateArgs]] = prismaMock.user.update.mock.calls as [
      [{ where: { id: string }; data: { passwordHash: string } }],
    ];
    expect(updateArgs.where).toEqual({ id: 'user-1' });
    expect(updateArgs.data.passwordHash).not.toBe(currentPasswordHash);
    await expect(
      bcrypt.compare('new-secret-1', updateArgs.data.passwordHash),
    ).resolves.toBe(true);
  });

  it('throws UnauthorizedException when currentPassword does not match', async () => {
    const currentPasswordHash = await bcrypt.hash('current-secret', 4);
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: currentPasswordHash,
    });

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'wrong-secret',
        newPassword: 'new-secret-1',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when user has no local password (e.g. Google-only)', async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-1',
      passwordHash: null,
    });

    await expect(
      service.changePassword('user-1', {
        currentPassword: 'anything',
        newPassword: 'new-secret-1',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it('throws UnauthorizedException when user does not exist', async () => {
    prismaMock.user.findUnique.mockResolvedValue(null);

    await expect(
      service.changePassword('missing-user', {
        currentPassword: 'anything',
        newPassword: 'new-secret-1',
      }),
    ).rejects.toThrow(UnauthorizedException);
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

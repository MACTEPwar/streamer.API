import { ConflictException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { LocalAuthService } from './local-auth.service';

describe('LocalAuthService', () => {
  let service: LocalAuthService;
  const prismaMock = {
    user: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    authMethod: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new LocalAuthService(prismaMock as unknown as PrismaService);
  });

  describe('register', () => {
    it('creates a User + Profile + Settings + AuthMethod(LOCAL) nested', async () => {
      prismaMock.user.create.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        profile: { name: 'johndoe', avatarUrl: null },
        authMethods: [{ type: 'LOCAL' }],
      });

      await service.register({ login: 'johndoe', password: 'secret123' });

      expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
      const [[createArgs]] = prismaMock.user.create.mock.calls as [
        [
          {
            data: {
              profile: { create: { name: string } };
              authMethods: {
                create: {
                  type: string;
                  identifier: string;
                  passwordHash: string;
                };
              };
            };
          },
        ],
      ];
      expect(createArgs.data.profile.create.name).toBe('johndoe');
      expect(createArgs.data.authMethods.create.type).toBe('LOCAL');
      expect(createArgs.data.authMethods.create.identifier).toBe('johndoe');
      await expect(
        bcrypt.compare(
          'secret123',
          createArgs.data.authMethods.create.passwordHash,
        ),
      ).resolves.toBe(true);
    });

    it('throws ConflictException when the login (identifier) is already taken', async () => {
      const { Prisma } = jest.requireActual('../generated/prisma/client') as {
        Prisma: typeof import('../generated/prisma/client').Prisma;
      };
      prismaMock.user.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Duplicate', {
          code: 'P2002',
          clientVersion: '0.0.0',
        }),
      );

      await expect(
        service.register({ login: 'johndoe', password: 'secret123' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('validateCredentials', () => {
    it('resolves the user when the password matches', async () => {
      const passwordHash = await bcrypt.hash('secret123', 4);
      prismaMock.authMethod.findUnique.mockResolvedValue({
        userId: 'user-1',
        passwordHash,
      });
      prismaMock.user.findUniqueOrThrow.mockResolvedValue({
        id: 'user-1',
        role: 'USER',
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        profile: { name: 'johndoe', avatarUrl: null },
        authMethods: [{ type: 'LOCAL' }],
      });

      const result = await service.validateCredentials({
        login: 'johndoe',
        password: 'secret123',
      });

      expect(result.id).toBe('user-1');
      expect(prismaMock.authMethod.findUnique).toHaveBeenCalledWith({
        where: { type_identifier: { type: 'LOCAL', identifier: 'johndoe' } },
      });
    });

    it('throws UnauthorizedException when no LOCAL AuthMethod matches the login', async () => {
      prismaMock.authMethod.findUnique.mockResolvedValue(null);

      await expect(
        service.validateCredentials({ login: 'missing', password: 'x' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException when the password does not match', async () => {
      const passwordHash = await bcrypt.hash('secret123', 4);
      prismaMock.authMethod.findUnique.mockResolvedValue({
        userId: 'user-1',
        passwordHash,
      });

      await expect(
        service.validateCredentials({ login: 'johndoe', password: 'wrong' }),
      ).rejects.toThrow(UnauthorizedException);
      expect(prismaMock.user.findUniqueOrThrow).not.toHaveBeenCalled();
    });
  });
});

import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { GoogleAuthService } from './google-auth.service';

const verifyIdTokenMock = jest.fn();

jest.mock('google-auth-library', () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: verifyIdTokenMock,
  })),
}));

describe('GoogleAuthService.authenticate', () => {
  let service: GoogleAuthService;
  const prismaMock = {
    user: {
      findUniqueOrThrow: jest.fn(),
      create: jest.fn(),
    },
    authMethod: {
      findUnique: jest.fn(),
    },
  };
  const configMock = {
    getOrThrow: jest.fn().mockReturnValue('google-client-id'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    configMock.getOrThrow.mockReturnValue('google-client-id');
    service = new GoogleAuthService(
      prismaMock as unknown as PrismaService,
      configMock as unknown as ConfigService,
    );
  });

  function mockPayload(payload: Record<string, unknown>) {
    verifyIdTokenMock.mockResolvedValue({
      getPayload: () => payload,
    });
  }

  it('creates a new user + AuthMethod(GOOGLE) when no AuthMethod matches googleId', async () => {
    mockPayload({
      sub: 'google-sub-1',
      email: 'new-user@example.com',
      email_verified: true,
    });
    prismaMock.authMethod.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      role: 'USER',
      profile: { name: null, avatarUrl: null },
      authMethods: [{ type: 'GOOGLE' }],
    });

    await service.authenticate({ idToken: 'token' });

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    const [[createArgs]] = prismaMock.user.create.mock.calls as [
      [
        {
          data: {
            authMethods: { create: { type: string; identifier: string } };
            socialLinks?: { create: { type: string; value: string } };
          };
        },
      ],
    ];
    expect(createArgs.data.authMethods.create).toEqual({
      type: 'GOOGLE',
      identifier: 'google-sub-1',
    });
    expect(createArgs.data.socialLinks?.create).toEqual({
      type: 'EMAIL',
      value: 'new-user@example.com',
    });
  });

  it('pulls the display name and avatar from the Google payload into the new profile', async () => {
    mockPayload({
      sub: 'google-sub-4',
      name: 'John Doe',
      picture: 'https://example.com/avatar.jpg',
    });
    prismaMock.authMethod.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-4',
      role: 'USER',
      profile: {
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
      authMethods: [{ type: 'GOOGLE' }],
    });

    await service.authenticate({ idToken: 'token' });

    const [[createArgs]] = prismaMock.user.create.mock.calls as [
      [{ data: { profile: { create: { name?: string; avatarUrl?: string } } } }],
    ];
    expect(createArgs.data.profile.create.name).toBe('John Doe');
    expect(createArgs.data.profile.create.avatarUrl).toBe(
      'https://example.com/avatar.jpg',
    );
  });

  it('does not create a SocialLink when the Google payload has no email', async () => {
    mockPayload({ sub: 'google-sub-5' });
    prismaMock.authMethod.findUnique.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-5',
      role: 'USER',
      profile: { name: null, avatarUrl: null },
      authMethods: [{ type: 'GOOGLE' }],
    });

    await service.authenticate({ idToken: 'token' });

    const [[createArgs]] = prismaMock.user.create.mock.calls as [
      [{ data: { socialLinks?: unknown } }],
    ];
    expect(createArgs.data.socialLinks).toBeUndefined();
  });

  it('returns the existing account as-is when found by AuthMethod(GOOGLE)', async () => {
    mockPayload({ sub: 'google-sub-3' });
    prismaMock.authMethod.findUnique.mockResolvedValue({
      userId: 'user-3',
      type: 'GOOGLE',
      identifier: 'google-sub-3',
    });
    prismaMock.user.findUniqueOrThrow.mockResolvedValue({
      id: 'user-3',
      role: 'USER',
      profile: { name: null, avatarUrl: null },
      authMethods: [{ type: 'GOOGLE' }],
    });

    await service.authenticate({ idToken: 'token' });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.findUniqueOrThrow).toHaveBeenCalledWith({
      where: { id: 'user-3' },
      include: { profile: true, authMethods: true },
    });
  });
});

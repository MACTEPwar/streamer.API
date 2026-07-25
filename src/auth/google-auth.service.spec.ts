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
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
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

  it('creates a new user with provider "google" when no account matches', async () => {
    mockPayload({
      sub: 'google-sub-1',
      email: 'new-user@example.com',
      email_verified: true,
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-1',
      login: 'google-sub-1',
      googleId: 'google-sub-1',
      provider: 'google',
      role: 'USER',
      profile: { email: 'new-user@example.com' },
    });

    await service.authenticate({ idToken: 'token' });

    expect(prismaMock.user.create).toHaveBeenCalledTimes(1);
    const [[createArgs]] = prismaMock.user.create.mock.calls as [
      [{ data: { provider?: string } }],
    ];
    expect(createArgs.data.provider).toBe('google');
  });

  it('pulls the display name and avatar from the Google payload into the new profile', async () => {
    mockPayload({
      sub: 'google-sub-4',
      email: 'new-user-2@example.com',
      email_verified: true,
      name: 'John Doe',
      picture: 'https://example.com/avatar.jpg',
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.create.mockResolvedValue({
      id: 'user-4',
      login: 'google-sub-4',
      googleId: 'google-sub-4',
      provider: 'google',
      role: 'USER',
      profile: {
        email: 'new-user-2@example.com',
        name: 'John Doe',
        avatarUrl: 'https://example.com/avatar.jpg',
      },
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

  it('does not change provider when auto-linking an existing account by email', async () => {
    mockPayload({
      sub: 'google-sub-2',
      email: 'existing@example.com',
      email_verified: true,
    });
    prismaMock.user.findUnique.mockResolvedValue(null);
    prismaMock.user.findFirst.mockResolvedValue({
      id: 'user-2',
      login: 'existing-login',
      provider: null,
      profile: { email: 'existing@example.com' },
    });
    prismaMock.user.update.mockResolvedValue({
      id: 'user-2',
      login: 'existing-login',
      googleId: 'google-sub-2',
      provider: null,
      profile: { email: 'existing@example.com' },
    });

    await service.authenticate({ idToken: 'token' });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).toHaveBeenCalledTimes(1);
    const [[updateArgs]] = prismaMock.user.update.mock.calls as [
      [{ where: { id: string }; data: Record<string, unknown> }],
    ];
    expect(updateArgs.where).toEqual({ id: 'user-2' });
    expect(updateArgs.data).toEqual({ googleId: 'google-sub-2' });
    expect(updateArgs.data.provider).toBeUndefined();
  });

  it('returns the existing account as-is when found by googleId', async () => {
    mockPayload({ sub: 'google-sub-3' });
    prismaMock.user.findUnique.mockResolvedValue({
      id: 'user-3',
      login: 'user-3-login',
      provider: 'google',
      profile: { email: null },
    });

    await service.authenticate({ idToken: 'token' });

    expect(prismaMock.user.create).not.toHaveBeenCalled();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });
});

import { PrismaService } from '../prisma/prisma.service';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  const prismaMock = {
    profile: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService(prismaMock as unknown as PrismaService);
  });

  describe('update', () => {
    it('updates email and name for the given user', async () => {
      prismaMock.profile.update.mockResolvedValue({});

      await service.update('u1', {
        email: 'johndoe@example.com',
        name: 'John Doe',
      });

      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { email: 'johndoe@example.com', name: 'John Doe' },
      });
    });
  });

  describe('updateAvatar', () => {
    it('updates avatarUrl for the given user', async () => {
      prismaMock.profile.update.mockResolvedValue({});

      await service.updateAvatar('u1', {
        avatarUrl: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png',
      });

      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: {
          avatarUrl: '/uploads/9c858901-8a57-4791-81fe-4c455b099bc9.png',
        },
      });
    });
  });
});

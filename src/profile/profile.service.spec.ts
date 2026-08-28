import { PrismaService } from '../prisma/prisma.service';
import { UploadedFileCleanupService } from '../upload/uploaded-file-cleanup.service';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  const prismaMock = {
    profile: {
      findUniqueOrThrow: jest.fn(),
      update: jest.fn(),
    },
  };
  const uploadedFileCleanupServiceMock = {
    deleteIfUnreferenced: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new ProfileService(
      prismaMock as unknown as PrismaService,
      uploadedFileCleanupServiceMock as unknown as UploadedFileCleanupService,
    );
  });

  describe('update', () => {
    it('updates name for the given user', async () => {
      prismaMock.profile.update.mockResolvedValue({});

      await service.update('u1', {
        name: 'John Doe',
      });

      expect(prismaMock.profile.update).toHaveBeenCalledWith({
        where: { userId: 'u1' },
        data: { name: 'John Doe' },
      });
    });
  });

  describe('updateAvatar', () => {
    it('updates avatarUrl for the given user', async () => {
      prismaMock.profile.findUniqueOrThrow.mockResolvedValue({
        avatarUrl: '/uploads/old.png',
      });
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

    it('cleans up the old avatar file once it is replaced', async () => {
      prismaMock.profile.findUniqueOrThrow.mockResolvedValue({
        avatarUrl: '/uploads/old.png',
      });
      prismaMock.profile.update.mockResolvedValue({});

      await service.updateAvatar('u1', {
        avatarUrl: '/uploads/new.png',
      });

      expect(
        uploadedFileCleanupServiceMock.deleteIfUnreferenced,
      ).toHaveBeenCalledWith('/uploads/old.png');
    });

    it('does not attempt cleanup when the avatar url stays the same', async () => {
      prismaMock.profile.findUniqueOrThrow.mockResolvedValue({
        avatarUrl: '/uploads/same.png',
      });
      prismaMock.profile.update.mockResolvedValue({});

      await service.updateAvatar('u1', {
        avatarUrl: '/uploads/same.png',
      });

      expect(
        uploadedFileCleanupServiceMock.deleteIfUnreferenced,
      ).not.toHaveBeenCalled();
    });
  });
});

import { Injectable } from '@nestjs/common';
import { Profile } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UploadedFileCleanupService } from '../upload/uploaded-file-cleanup.service';
import { UpdateAvatarDto } from './dto/update-avatar.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploadedFileCleanupService: UploadedFileCleanupService,
  ) {}

  findByUserId(userId: string): Promise<Profile> {
    return this.prisma.profile.findUniqueOrThrow({ where: { userId } });
  }

  update(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    return this.prisma.profile.update({ where: { userId }, data: dto });
  }

  async updateAvatar(userId: string, dto: UpdateAvatarDto): Promise<Profile> {
    const current = await this.prisma.profile.findUniqueOrThrow({
      where: { userId },
      select: { avatarUrl: true },
    });

    const profile = await this.prisma.profile.update({
      where: { userId },
      data: dto,
    });

    // После успешного обновления: пока запрос мог провалиться, старый файл
    // ещё нужен (ФАЙ-Б-04).
    if (current.avatarUrl !== dto.avatarUrl) {
      await this.uploadedFileCleanupService.deleteIfUnreferenced(
        current.avatarUrl,
      );
    }

    return profile;
  }
}

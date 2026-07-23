import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SocialLink } from '../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSocialLinkDto } from './dto/create-social-link.dto';
import { UpdateSocialLinkDto } from './dto/update-social-link.dto';

@Injectable()
export class SocialLinkService {
  constructor(private readonly prisma: PrismaService) {}

  findAllByUserId(userId: string): Promise<SocialLink[]> {
    return this.prisma.socialLink.findMany({ where: { userId } });
  }

  create(userId: string, dto: CreateSocialLinkDto): Promise<SocialLink> {
    return this.prisma.socialLink.create({ data: { ...dto, userId } });
  }

  async update(
    userId: string,
    id: string,
    dto: UpdateSocialLinkDto,
  ): Promise<SocialLink> {
    await this.assertOwnership(userId, id);

    return this.prisma.socialLink.update({ where: { id }, data: dto });
  }

  async remove(userId: string, id: string): Promise<SocialLink> {
    await this.assertOwnership(userId, id);

    return this.prisma.socialLink.delete({ where: { id } });
  }

  private async assertOwnership(userId: string, id: string): Promise<void> {
    const socialLink = await this.prisma.socialLink.findUnique({
      where: { id },
    });

    if (!socialLink) {
      throw new NotFoundException('Social link not found');
    }

    if (socialLink.userId !== userId) {
      throw new ForbiddenException('Not the owner of this social link');
    }
  }
}

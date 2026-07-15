import { Injectable } from '@nestjs/common';
import { Profile } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<Profile> {
    return this.prisma.profile.findUniqueOrThrow({ where: { userId } });
  }

  update(userId: string, dto: UpdateProfileDto): Promise<Profile> {
    return this.prisma.profile.update({ where: { userId }, data: dto });
  }
}

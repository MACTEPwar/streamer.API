import { Injectable } from '@nestjs/common';
import { Settings } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  findByUserId(userId: string): Promise<Settings> {
    return this.prisma.settings.findUniqueOrThrow({ where: { userId } });
  }

  update(userId: string, dto: UpdateSettingsDto): Promise<Settings> {
    return this.prisma.settings.update({ where: { userId }, data: dto });
  }
}

import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NewsModule } from '../news/news.module';
import { AdminNewsTagsController } from './news-tags/admin-news-tags.controller';
import { AdminNewsController } from './news/admin-news.controller';
import { AdminNewsService } from './news/admin-news.service';
import { AdminPinnedGridController } from './news-pinned/admin-pinned-grid.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';

@Module({
  imports: [AuthModule, NewsModule],
  controllers: [
    AdminUsersController,
    AdminNewsController,
    AdminNewsTagsController,
    AdminPinnedGridController,
  ],
  providers: [AdminUsersService, AdminNewsService],
})
export class AdminModule {}

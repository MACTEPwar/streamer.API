import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NewsImageDownloadService } from './news-image-download.service';
import { NewsTagController } from './news-tag/news-tag.controller';
import { NewsTagService } from './news-tag/news-tag.service';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';
import { PinnedGridController } from './pinned-grid/pinned-grid.controller';
import { PinnedGridService } from './pinned-grid/pinned-grid.service';

@Module({
  imports: [AuthModule],
  controllers: [NewsController, NewsTagController, PinnedGridController],
  providers: [
    NewsService,
    NewsTagService,
    NewsImageDownloadService,
    PinnedGridService,
  ],
  exports: [NewsTagService, NewsImageDownloadService, PinnedGridService],
})
export class NewsModule {}

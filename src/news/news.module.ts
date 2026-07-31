import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { NewsImageDownloadService } from './news-image-download.service';
import { NewsTagController } from './news-tag/news-tag.controller';
import { NewsTagService } from './news-tag/news-tag.service';
import { NewsController } from './news.controller';
import { NewsService } from './news.service';

@Module({
  imports: [AuthModule],
  controllers: [NewsController, NewsTagController],
  providers: [NewsService, NewsTagService, NewsImageDownloadService],
  exports: [NewsTagService, NewsImageDownloadService],
})
export class NewsModule {}

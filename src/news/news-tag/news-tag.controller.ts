import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { NewsTagDto } from './dto/news-tag.dto';
import { NewsTagService } from './news-tag.service';

@ApiTags('news-tags')
@Controller('news-tags')
export class NewsTagController {
  constructor(private readonly newsTagService: NewsTagService) {}

  @Get()
  @ApiOkResponse({ type: NewsTagDto, isArray: true })
  findAll(): Promise<NewsTagDto[]> {
    return this.newsTagService.findAll();
  }
}

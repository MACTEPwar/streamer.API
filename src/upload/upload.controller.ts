import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ErrorResponseDto } from '../shared/dto/error-response.dto';
import { UPLOADS_URL_PREFIX } from './constants/upload.constant';
import { UploadResponseDto } from './dto/upload-response.dto';
import { ImageVariantService } from './image-variant.service';
import { multerOptions } from './upload.options';

@ApiTags('upload')
@UseGuards(JwtAuthGuard)
@Controller('upload')
export class UploadController {
  constructor(private readonly imageVariantService: ImageVariantService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', multerOptions))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiCreatedResponse({ type: UploadResponseDto })
  @ApiResponse({ status: 400, type: ErrorResponseDto })
  @ApiResponse({ status: 401, type: ErrorResponseDto })
  async uploadFile(
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UploadResponseDto> {
    if (!file) {
      throw new BadRequestException('Файл не передан');
    }

    // Синхронно с приёмом (streamer.API#78) — не на каждый последующий
    // запрос: клиент может выбирать вариант по ширине сразу после загрузки.
    await this.imageVariantService.generate(file.filename);

    return { url: `${UPLOADS_URL_PREFIX}/${file.filename}` };
  }
}

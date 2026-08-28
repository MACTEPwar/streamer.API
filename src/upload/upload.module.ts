import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { ImageVariantService } from './image-variant.service';
import { UploadController } from './upload.controller';
import { UploadedFileCleanupService } from './uploaded-file-cleanup.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [UploadedFileCleanupService, ImageVariantService],
  exports: [UploadedFileCleanupService, ImageVariantService],
})
export class UploadModule {}

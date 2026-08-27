import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { UploadController } from './upload.controller';
import { UploadedFileCleanupService } from './uploaded-file-cleanup.service';

@Module({
  imports: [AuthModule],
  controllers: [UploadController],
  providers: [UploadedFileCleanupService],
  exports: [UploadedFileCleanupService],
})
export class UploadModule {}

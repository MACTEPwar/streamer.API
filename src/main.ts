import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { mkdirSync } from 'node:fs';
import { AppModule } from './app.module';
import { APP_NAME, APP_VERSION } from './app-info';
import { ErrorResponseDto } from './shared/dto/error-response.dto';
import { PaginationMetaDto } from './shared/dto/pagination-meta.dto';
import {
  UPLOADS_DIR,
  UPLOADS_URL_PREFIX,
} from './upload/constants/upload.constant';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const configService = app.get(ConfigService);

  app.use(cookieParser());

  mkdirSync(UPLOADS_DIR, { recursive: true });
  app.useStaticAssets(UPLOADS_DIR, { prefix: UPLOADS_URL_PREFIX });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // CORS_ORIGIN is the dev Angular origin only; production origins must be
  // reviewed/reconfigured separately before a real deployment (see #5 scope).
  // credentials: true is required for the cookie-based JWT auth flow (#16) —
  // browsers reject wildcard origin with credentials, CORS_ORIGIN is always
  // a specific value, never '*'.
  // Вне production origin отражается обратно (`true`), а не сверяется с
  // CORS_ORIGIN: в разработке сайт открывают и на `localhost:4200`, и по
  // LAN-адресу с телефона/планшета (`http://192.168.x.x:4200`) для проверки
  // адаптива, и фиксированное значение ломало бы один из этих случаев.
  // `credentials: true` требует конкретный origin, не '*' — отражение даёт
  // именно его. В production остаётся строгая сверка с CORS_ORIGIN.
  const isProduction = configService.get<string>('NODE_ENV') === 'production';
  app.enableCors({
    origin: isProduction ? configService.get<string>('CORS_ORIGIN') : true,
    credentials: true,
  });

  if (configService.get<string>('NODE_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle(APP_NAME)
        .setDescription('Backend API for the steramer.io project.')
        .setVersion(APP_VERSION)
        .build(),
      { extraModels: [ErrorResponseDto, PaginationMetaDto] },
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(configService.get<number>('PORT', 3000));
}
void bootstrap();

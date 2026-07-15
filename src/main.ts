import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_NAME, APP_VERSION } from './app-info';
import { ErrorResponseDto } from './shared/dto/error-response.dto';
import { PaginationMetaDto } from './shared/dto/pagination-meta.dto';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // CORS_ORIGIN is the dev Angular origin only; production origins must be
  // reviewed/reconfigured separately before a real deployment (see #5 scope).
  // credentials: true is required for the cookie-based JWT auth flow (#16) —
  // browsers reject wildcard origin with credentials, CORS_ORIGIN is always
  // a specific value, never '*'.
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN'),
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

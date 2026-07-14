import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { APP_NAME, APP_VERSION } from './app-info';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  if (configService.get<string>('NODE_ENV') !== 'production') {
    const document = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle(APP_NAME)
        .setDescription('Backend API for the steramer.io project.')
        .setVersion(APP_VERSION)
        .build(),
    );
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(configService.get<number>('PORT', 3000));
}
bootstrap();

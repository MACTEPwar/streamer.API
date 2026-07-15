# Project Map

Живой реестр того, что реализовано в проекте. Цель — чтобы понять "что уже есть и где" можно было по этому файлу, а не обходом всего кода.

**Правило:** создал модуль/эндпоинт/сервис/метод/включил опцию окружения — добавь строку сюда в том же коммите/PR, где это появилось. Не оставляй это только в коде.

## Модули

### PrismaModule
- Путь: `src/prisma/`
- Назначение: глобальный модуль подключения к MySQL через Prisma (driver adapter `@prisma/adapter-mariadb`), без доменной схемы

### ConfigModule (`@nestjs/config`, isGlobal)
- Путь: подключение в `src/app.module.ts`, схема валидации `src/config/env.validation.ts`
- Назначение: загрузка `.env` + валидация обязательных переменных окружения при старте (Joi)

### HealthModule
- Путь: `src/health/`
- Назначение: `GET /health` — liveness-check, без проверки БД (заметка на будущее)

## Модели данных (Prisma)

- Путь схемы: `prisma/schema.prisma`, миграции в `prisma/migrations/`
- `Role` (enum) — `ADMIN` \| `MODERATOR` \| `USER`; "гость" — НЕ значение enum, а отсутствие валидной сессии/JWT
- `User` — `id` (`String`, `cuid()`), `login` (unique), `passwordHash` (nullable — может не быть при чисто Google-аккаунте), `provider`/`googleId` (nullable, `googleId` unique — Google OAuth), `role` (default `USER`), `createdAt`/`updatedAt`
- `Profile` — 1:1 с `User` (`userId` unique), `email` (nullable, не верифицируется, для связи/уведомлений и авто-связки Google по email)
- `Settings` — 1:1 с `User` (`userId` unique), пока без доп. полей (задел под будущие пользовательские настройки)

## Глобальная инфраструктура

- `ValidationPipe` (глобальный, `src/main.ts`) — `whitelist`/`forbidNonWhitelisted`/`transform` включены для всех эндпоинтов
- `AllExceptionsFilter` — `src/shared/filters/http-exception.filter.ts`, регистрируется через `APP_FILTER` в `AppModule`; единый формат ошибки для всего API — `ErrorResponseDto` (`src/shared/dto/error-response.dto.ts`): `statusCode`, `message` (`string | string[]`), `error`, `timestamp`, `path`. Зарегистрирован в Swagger как `extraModels` (без демо-эндпоинта — см. `src/main.ts`)

## Эндпоинты

- `GET /` — `src/app.controller.ts` — базовая информация о приложении (`{ name, version }`), пример аннотирования Swagger-декораторами
- `GET /health` — `src/health/health.controller.ts` — `{ status: 'ok' }`, без авторизации, для docker-compose/CI healthcheck
- `GET /api/docs` — Swagger UI (настроен в `src/main.ts`, только вне `NODE_ENV=production`)

## Сервисы

- `PrismaService` — `src/prisma/prisma.service.ts` — расширяет `PrismaClient`; `onModuleInit()` — `$connect()` + проверочный `SELECT 1`, `onModuleDestroy()` — `$disconnect()`; `DATABASE_URL` читается через `ConfigService.getOrThrow()`

## Опции окружения / feature-флаги

- `DATABASE_URL` — строка подключения к MySQL (`mysql://USER:PASSWORD@HOST:PORT/DATABASE`), обязательная, валидируется `src/config/env.validation.ts`
- `NODE_ENV` — `development` \| `production` \| `test`, по умолчанию `development`
- `PORT` — HTTP-порт приложения, по умолчанию `3000`
- `CORS_ORIGIN` — разрешённый origin для CORS (dev Angular-сервер), по умолчанию `http://localhost:4200`; используется с `credentials: true` (нужно для cookie-based JWT); прод-origin'ы требуют отдельного пересмотра

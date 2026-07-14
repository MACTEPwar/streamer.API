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
- `CORS_ORIGIN` — разрешённый origin для CORS (dev Angular-сервер), по умолчанию `http://localhost:4200`; прод-origin'ы требуют отдельного пересмотра

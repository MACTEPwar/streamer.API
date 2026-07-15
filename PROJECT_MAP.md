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

### AuthModule
- Путь: `src/auth/`
- Назначение: общая JWT/cookie сессионная инфраструктура — переиспользуется будущими #17 (локальный логин), #18 (Google OAuth) и защищает будущие #21/#22/#23 (Profile/Upload/Settings) через `JwtAuthGuard`. Только access-токен (без refresh), без RBAC/ролевой логики (заложена только в payload).
- Компоненты:
  - `AuthService` (`auth.service.ts`) — `issueToken({ sub, role })`, `setAuthCookie(res, token)`/`clearAuthCookie(res)` (атрибуты `HttpOnly`/`Secure`/`SameSite=Lax`, `maxAge` из реального `exp` токена), `verifyToken(token)`
  - `JwtAuthGuard` (`guards/jwt-auth.guard.ts`) — читает JWT из cookie `access_token`, кладёт `req.user = { id, role }`; применяется точечно через `@UseGuards()`, не глобально
  - `AuthController` (`auth.controller.ts`) — `GET /auth/me` (защищён), `POST /auth/logout` (публичный), `POST /auth/register`, `POST /auth/login` (публичные, локальный логин/пароль)
  - `LocalAuthService` (`local-auth.service.ts`) — `register()` (bcrypt-хэш пароля, `User`+`Profile`+`Settings` одной вложенной записью — атомарно без явного `$transaction`, `409` при занятом `login`), `validateCredentials()` (поиск + `bcrypt.compare`, единый `401` независимо от того, что именно неверно)
  - `GoogleAuthService` (`google-auth.service.ts`) — `authenticate()`: верификация ID-токена через `google-auth-library` (`OAuth2Client.verifyIdToken`, `audience = GOOGLE_CLIENT_ID`; без Client Secret — чистая ID-token-проверка, не authorization-code флоу), поиск по `googleId` → авто-связка по `Profile.email` (только если `email_verified === true`) → создание нового `User`+`Profile`+`Settings` (`login = googleId`, т.к. `User.login` обязателен, а у Google-пользователя своего login нет и он с ним не взаимодействует). Любая ошибка верификации токена — единый `401`.
  - `UserWithProfile` (`types/user-with-profile.type.ts`) — общий тип `Prisma.UserGetPayload<{ include: { profile: true } }>`, переиспользуется `LocalAuthService`/`GoogleAuthService`
- Экспортирует `AuthService`/`JwtAuthGuard`/`JwtModule` — модули #21/#22/#23 импортируют `AuthModule`, не настраивают JWT заново
- `cookie-parser` подключён глобально в `src/main.ts` (`req.cookies`)

### ProfileModule
- Путь: `src/profile/`
- Назначение: `GET`/`PATCH /profile` — чтение/редактирование собственного профиля текущего пользователя. Только свой профиль (без просмотра чужих, без ролевых ограничений — вне scope #21).
- Компоненты:
  - `ProfileService` (`profile.service.ts`) — `findByUserId(userId)`, `update(userId, dto)` поверх `prisma.profile`
  - `ProfileController` (`profile.controller.ts`) — защищён `JwtAuthGuard` (из `AuthModule`) на уровне контроллера
- `imports: [AuthModule]` — нужен для DI-резолва `JwtAuthGuard` (сам guard зависит от `AuthService`)
- Редактируемое поле пока только `email` (единственное поле `Profile` кроме id/userId на данный момент — см. схему #15); явный сброс `email` в `null` не поддержан (не требовалось AC)

### SettingsModule
- Путь: `src/settings/`
- Назначение: `GET`/`PATCH /settings` — чтение/редактирование собственных настроек текущего пользователя. Только свои настройки, без ролевых ограничений.
- Компоненты:
  - `SettingsService` (`settings.service.ts`) — `findByUserId(userId)`, `update(userId, dto)` поверх `prisma.settings`
  - `SettingsController` (`settings.controller.ts`) — защищён `JwtAuthGuard` (из `AuthModule`) на уровне контроллера
- `imports: [AuthModule]` — нужен для DI-резолва `JwtAuthGuard`
- Редактируемые поля: `theme` (`LIGHT`/`DARK`/`SYSTEM`), `receiveNotifications` (boolean). **Осознанное отступление от AC #23** — пункт «Не входит» issue исключал настройки уведомлений как отдельную фичу; `receiveNotifications` — простой флаг без детализации по типам уведомлений, добавлен по прямому решению пользователя (детализация по типам всё ещё отдельная будущая задача)

### UploadModule
- Путь: `src/upload/`
- Назначение: `POST /upload` — приём файла (multipart), сохранение на локальную ФС сервера (`uploads/` в корне проекта, не в git), возврат публичного URL. Загрузка защищена `JwtAuthGuard`, отдача самих файлов по URL — публична, без авторизации (см. `useStaticAssets` в `src/main.ts`).
- Компоненты:
  - `UploadController` (`upload.controller.ts`) — `@UseInterceptors(FileInterceptor('file', multerOptions))`
  - `multerOptions` (`upload.options.ts`) — `diskStorage` (имя файла — `randomUUID()` + расширение по MIME из `MIME_EXTENSION_MAP`, не по `originalname` клиента), `limits.fileSize`, `fileFilter` (allowlist MIME)
  - Константы (`constants/upload.constant.ts`) — `UPLOADS_DIR`, `UPLOADS_URL_PREFIX = '/uploads'`, `MAX_UPLOAD_SIZE_BYTES = 5 МБ`, `MIME_EXTENSION_MAP` (allowlist: `image/jpeg`/`image/png`/`image/webp`)
- `imports: [AuthModule]` — для DI-резолва `JwtAuthGuard`
- Ошибки `multer` (превышение лимита размера, недопустимый тип файла) уже транслируются в корректные `HttpException` встроенным `transformException()` из `@nestjs/platform-express` (`FileInterceptor` вызывает его сам) — доп. обработка `MulterError` в `AllExceptionsFilter` не нужна, ошибки доходят как обычный `413`/`400`
- Не входит (см. issue): привязка к полю аватара в `Profile` — это отдельная будущая задача, само поле в `Profile` не заводится

## Модели данных (Prisma)

- Путь схемы: `prisma/schema.prisma`, миграции в `prisma/migrations/`
- `Role` (enum) — `ADMIN` \| `MODERATOR` \| `USER`; "гость" — НЕ значение enum, а отсутствие валидной сессии/JWT
- `Theme` (enum) — `LIGHT` \| `DARK` \| `SYSTEM` ("как на устройстве")
- `User` — `id` (`String`, `cuid()`), `login` (unique), `passwordHash` (nullable — может не быть при чисто Google-аккаунте), `provider`/`googleId` (nullable, `googleId` unique — Google OAuth), `role` (default `USER`), `createdAt`/`updatedAt`
- `Profile` — 1:1 с `User` (`userId` unique), `email` (nullable, не верифицируется, для связи/уведомлений и авто-связки Google по email)
- `Settings` — 1:1 с `User` (`userId` unique), `theme` (default `SYSTEM`), `receiveNotifications` (`Boolean`, default `true`)

## Глобальная инфраструктура

- `ValidationPipe` (глобальный, `src/main.ts`) — `whitelist`/`forbidNonWhitelisted`/`transform` включены для всех эндпоинтов
- `AllExceptionsFilter` — `src/shared/filters/http-exception.filter.ts`, регистрируется через `APP_FILTER` в `AppModule`; единый формат ошибки для всего API — `ErrorResponseDto` (`src/shared/dto/error-response.dto.ts`): `statusCode`, `message` (`string | string[]`), `error`, `timestamp`, `path`. Зарегистрирован в Swagger как `extraModels` (без демо-эндпоинта — см. `src/main.ts`)
- Конвенция пагинации/сортировки/фильтрации — `PaginationQueryDto` (`src/shared/dto/pagination-query.dto.ts`: `page`/`limit`/`sortBy`/`sortOrder`, наследуется feature-DTO для своих полей фильтра), `PaginationMetaDto` (`src/shared/dto/pagination-meta.dto.ts`), `buildPaginationMeta()` (`src/shared/pagination/paginate.ts`), `ApiPaginatedResponse()` decorator (`src/shared/decorators/api-paginated-response.decorator.ts`) — пример использования в README

## Эндпоинты

- `GET /` — `src/app.controller.ts` — базовая информация о приложении (`{ name, version }`), пример аннотирования Swagger-декораторами
- `GET /health` — `src/health/health.controller.ts` — `{ status: 'ok' }`, без авторизации, для docker-compose/CI healthcheck
- `GET /api/docs` — Swagger UI (настроен в `src/main.ts`, только вне `NODE_ENV=production`)
- `GET /auth/me` — `src/auth/auth.controller.ts` — защищён `JwtAuthGuard`, возвращает `{ id, login, role, email }` текущей сессии, `401` без/с невалидной cookie
- `POST /auth/logout` — `src/auth/auth.controller.ts` — публичный, сбрасывает auth-cookie
- `POST /auth/register` — `src/auth/auth.controller.ts` — регистрация по логину/паролю, создаёт `User`+`Profile`+`Settings`, выдаёт сессионную cookie, `409` при занятом `login`
- `POST /auth/login` — `src/auth/auth.controller.ts` — логин по логину/паролю, выдаёт сессионную cookie, `401` при неверных данных
- `POST /auth/google` — `src/auth/auth.controller.ts` — приём Google ID-токена, find-or-create пользователя, выдаёт сессионную cookie, `401` при невалидном/просроченном токене
- `GET /profile` — `src/profile/profile.controller.ts` — защищён `JwtAuthGuard`, возвращает `{ id, userId, email }` собственного профиля
- `PATCH /profile` — `src/profile/profile.controller.ts` — защищён `JwtAuthGuard`, обновляет `email` собственного профиля
- `GET /settings` — `src/settings/settings.controller.ts` — защищён `JwtAuthGuard`, возвращает `{ id, userId, theme, receiveNotifications }` собственных настроек
- `PATCH /settings` — `src/settings/settings.controller.ts` — защищён `JwtAuthGuard`, обновляет `theme`/`receiveNotifications` собственных настроек
- `POST /upload` — `src/upload/upload.controller.ts` — защищён `JwtAuthGuard`, принимает файл (multipart, поле `file`), возвращает `{ url }`; `400` при недопустимом типе/отсутствии файла, `413` при превышении лимита размера
- `GET /uploads/*` — статика, `useStaticAssets` в `src/main.ts`, без авторизации на чтение

## Сервисы

- `PrismaService` — `src/prisma/prisma.service.ts` — расширяет `PrismaClient`; `onModuleInit()` — `$connect()` + проверочный `SELECT 1`, `onModuleDestroy()` — `$disconnect()`; `DATABASE_URL` читается через `ConfigService.getOrThrow()`
- `AuthService` — `src/auth/auth.service.ts` — см. AuthModule выше
- `LocalAuthService` — `src/auth/local-auth.service.ts` — см. AuthModule выше
- `GoogleAuthService` — `src/auth/google-auth.service.ts` — см. AuthModule выше
- `ProfileService` — `src/profile/profile.service.ts` — см. ProfileModule выше
- `SettingsService` — `src/settings/settings.service.ts` — см. SettingsModule выше

## Опции окружения / feature-флаги

- `DATABASE_URL` — строка подключения к MySQL (`mysql://USER:PASSWORD@HOST:PORT/DATABASE`), обязательная, валидируется `src/config/env.validation.ts`
- `NODE_ENV` — `development` \| `production` \| `test`, по умолчанию `development`
- `PORT` — HTTP-порт приложения, по умолчанию `3000`
- `CORS_ORIGIN` — разрешённый origin для CORS (dev Angular-сервер), по умолчанию `http://localhost:4200`; используется с `credentials: true` (нужно для cookie-based JWT); прод-origin'ы требуют отдельного пересмотра
- `JWT_SECRET` — секрет подписи сессионных JWT, обязательный, минимум 32 символа
- `JWT_EXPIRES_IN` — TTL access-токена, по умолчанию `7d`; также используется как `maxAge` auth-cookie
- `GOOGLE_CLIENT_ID` — Google OAuth Client ID, обязательный, используется как `audience` при верификации ID-токена; реальное значение из `steramer.io#2` (issue ещё открыта на момент реализации — в `.env` временный плейсхолдер, не коммитится)

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
  - `RolesGuard`/`@Roles()` (`guards/roles.guard.ts`, `decorators/roles.decorator.ts`, #39) — ролевая проверка поверх `req.user.role` (кладёт `JwtAuthGuard`, поэтому в `@UseGuards()` порядок важен: `JwtAuthGuard` первым); без метаданных `@Roles()` пропускает всех, иначе `403` при несовпадении роли. Первое использование — `PATCH /schedule/:weekday` (только `ADMIN`)
  - `AuthController` (`auth.controller.ts`) — `GET /auth/me` (защищён), `POST /auth/logout` (публичный), `POST /auth/register`, `POST /auth/login` (публичные, локальный логин/пароль; throttled — см. ниже)
  - `LocalAuthService` (`local-auth.service.ts`) — `register()` (bcrypt-хэш пароля, `User`+`Profile`+`Settings` одной вложенной записью — атомарно без явного `$transaction`, `409` при занятом `login`), `validateCredentials()` (поиск + `bcrypt.compare`, единый `401` независимо от того, что именно неверно)
  - `GoogleAuthService` (`google-auth.service.ts`) — `authenticate()`: верификация ID-токена через `google-auth-library` (`OAuth2Client.verifyIdToken`, `audience = GOOGLE_CLIENT_ID`; без Client Secret — чистая ID-token-проверка, не authorization-code флоу), поиск по `googleId` → авто-связка по `Profile.email` (только если `email_verified === true`) → создание нового `User`+`Profile`+`Settings` (`login = googleId`, т.к. `User.login` обязателен, а у Google-пользователя своего login нет и он с ним не взаимодействует). Любая ошибка верификации токена — единый `401`.
  - `UserEntity` (`entities/user.entity.ts`) — класс-обёртка над сырым результатом Prisma `User` с `@Exclude()` на `passwordHash`/`googleId` (class-transformer); нужен как настоящий класс, а не обычный объект, чтобы `ClassSerializerInterceptor` (#26) вообще мог применить исключение полей — Prisma Client возвращает plain-объекты, decorators на сгенерированной модели не работают (перегенерируется при каждом `prisma generate`)
  - Rate limiting (#27) — `POST /auth/register`/`POST /auth/login` защищены точечным `@UseGuards(ThrottlerGuard)` (`@nestjs/throttler`), не глобально (вне scope — остальные эндпоинты не троттлятся); лимит `AUTH_THROTTLE_LIMIT`/`AUTH_THROTTLE_TTL` (`constants/throttle.constant.ts`, сейчас 5 попыток/60с) задаётся один раз через `ThrottlerModule.forRoot()` в `AuthModule`, `POST /auth/google` намеренно не троттлится — верификация идёт через Google ID-токен (внешняя проверка, не локальный brute-force пароля). Превышение лимита — `429`, формат ошибки общий (`AllExceptionsFilter` перехватывает `ThrottlerException` как обычный `HttpException`), доп. код не потребовался. Storage — дефолтный in-memory (`ThrottlerStorageService`), без Redis (одна инстанция API, вне scope задачи)
  - `PrismaUserWithProfile` (`types/prisma-user-with-profile.type.ts`) — сырой тип `Prisma.UserGetPayload<{ include: { profile: true } }>`, промежуточный шаг до оборачивания в `UserEntity`
  - `UserWithProfile` (`types/user-with-profile.type.ts`) — `UserEntity & { profile: { email: string | null } | null }`, переиспользуется `LocalAuthService`/`GoogleAuthService`; `LocalAuthService`/`GoogleAuthService`/`AuthController.me()` оборачивают результат `prisma.user.*` в `UserEntity` перед возвратом наружу (защита от случайной утечки `passwordHash`/`googleId`, даже если будущий код вернёт сущность напрямую в обход `UserMeDto`)
- Экспортирует `AuthService`/`JwtAuthGuard`/`RolesGuard`/`JwtModule` — модули #21/#22/#23/#39 импортируют `AuthModule`, не настраивают JWT заново
- `cookie-parser` подключён глобально в `src/main.ts` (`req.cookies`)

### ProfileModule
- Путь: `src/profile/`
- Назначение: `GET`/`PATCH /profile` + `PATCH /profile/avatar` — чтение/редактирование собственного профиля текущего пользователя (email/имя/аватар). Только свой профиль (без просмотра чужих, без ролевых ограничений — вне scope #21/#49).
- Компоненты:
  - `ProfileService` (`profile.service.ts`) — `findByUserId(userId)`, `update(userId, dto)` (email/name), `updateAvatar(userId, dto)` (avatarUrl) поверх `prisma.profile`
  - `ProfileController` (`profile.controller.ts`) — защищён `JwtAuthGuard` (из `AuthModule`) на уровне контроллера
  - `UpdateProfileDto` (`dto/update-profile.dto.ts`) — `email`/`name`, оба `@IsOptional()`, тот же паттерн частичного обновления
  - `UpdateAvatarDto` (`dto/update-avatar.dto.ts`, #49) — `avatarUrl` (обязательное, `@IsString() @IsNotEmpty() @MaxLength(255)`, намеренно без `@IsUrl()` — значение может быть как относительным путём пресета, так и URL из `POST /upload` (#22), бэку разница пресет/кастом не важна)
- `imports: [AuthModule]` — нужен для DI-резолва `JwtAuthGuard` (сам guard зависит от `AuthService`)
- Редактируемые поля: `email`/`name` через `PATCH /profile`, `avatarUrl` — отдельным `PATCH /profile/avatar` (#49, привязка к аватару из issue #22/#46 закрыта); явный сброс `email`/`name`/`avatarUrl` в `null` не поддержан (не требовалось AC)

### SettingsModule
- Путь: `src/settings/`
- Назначение: `GET`/`PATCH /settings` — чтение/редактирование собственных настроек текущего пользователя. Только свои настройки, без ролевых ограничений.
- Компоненты:
  - `SettingsService` (`settings.service.ts`) — `findByUserId(userId)`, `update(userId, dto)` поверх `prisma.settings`
  - `SettingsController` (`settings.controller.ts`) — защищён `JwtAuthGuard` (из `AuthModule`) на уровне контроллера
- `imports: [AuthModule]` — нужен для DI-резолва `JwtAuthGuard`
- Редактируемые поля: `theme` (`LIGHT`/`DARK`/`SYSTEM`), `receiveNotifications` (boolean). **Осознанное отступление от AC #23** — пункт «Не входит» issue исключал настройки уведомлений как отдельную фичу; `receiveNotifications` — простой флаг без детализации по типам уведомлений, добавлен по прямому решению пользователя (детализация по типам всё ещё отдельная будущая задача)

### ScheduleModule
- Путь: `src/schedule/`
- Назначение: расписание стримов по дням недели для главной страницы (`main1.json`, слайд «Расписание») — ровно 7 строк (Пн-Вс), реально редактируемые ADMIN-ом данные, не статичный UI.
- Компоненты:
  - `ScheduleService` (`schedule.service.ts`) — `findAll()`: `prisma.schedule.findMany()` без `orderBy` + сортировка на уровне приложения по `WEEKDAY_ORDER` (`constants/weekday-order.constant.ts`) — не полагаемся на порядок `ENUM` в MySQL, хотя он и совпадает (MySQL `ENUM` сортируется по объявленному в колонке порядку, который Prisma генерирует в том же порядке, что в `schema.prisma`); `update(weekday, dto)` — `isOnline=false` в `dto` принудительно обнуляет `eventTitle`/`time` в записи независимо от того, что прислал клиент
  - `ScheduleController` (`schedule.controller.ts`) — `GET /schedule` без guard'ов (публичный); `PATCH /schedule/:weekday` — `@UseGuards(JwtAuthGuard, RolesGuard)` + `@Roles(Role.ADMIN)`, `:weekday` валидируется `ParseEnumPipe(Weekday)` (`400` на невалидное значение)
  - `UpdateScheduleDto` (`dto/update-schedule.dto.ts`) — `isOnline` **обязательное** поле (не `@IsOptional()`, в отличие от Profile/Settings) — именно оно решает, очищаются ли `eventTitle`/`time` в этом же запросе, поэтому итоговое значение должно быть известно однозначно, а не наследоваться из существующей записи; `eventTitle` (`@MaxLength(200)`), `time` (строка `HH:MM`, `@Matches`) — оба опциональны даже при `isOnline=true` (админ может включить день, не указав ещё конкретику)
- `imports: [AuthModule]` — для DI-резолва `JwtAuthGuard`/`RolesGuard`
- Не входит (см. issue #39): админ-UI управления расписанием (только API), роль `MODERATOR` для редактирования (решено — правит только `ADMIN`)

### DonatorsModule
- Путь: `src/donators/`
- Назначение: топ-донатеров для главной страницы (`main2.json`) — до 5 записей (ник + сумма). Источник — внешний сервис доната, провайдер **пока не выбран**; реализовано портом/адаптером, чтобы подключить реальный провайдер позже без изменений в `DonatorsService`/`DonatorsController` (#40).
- Компоненты:
  - `DonatorsProvider` (`interfaces/donators-provider.interface.ts`) — интерфейс порта `getTop(): Promise<DonatorRecord[]>` (`DonatorRecord = { nickname, amount: number | null }` — сырые, возможно неполные данные) + `DONATORS_PROVIDER` — Symbol-токен для DI (интерфейсы стираются на рантайме — см. `nestjs-best-practices` skill)
  - `MockDonatorsProvider` (`providers/mock-donators.provider.ts`) — текущая реализация порта, фикстура из 5 записей под мокап главной (stream.Front#31: «Лексик.З», «-=AnGeL=-», «Михайло», «D.I.G.G.I», «D.I.I.G.I»), все с положительной суммой — исходную демонстрационную невалидную запись (`amount: null`) убрали при подключении фронта к живым данным (фронт пока не отличает этот edge case)
  - `DonatorsService` (`donators.service.ts`) — `getTop()`: получает сырые записи через `DONATORS_PROVIDER` (не зависит от `MockDonatorsProvider` напрямую), отфильтровывает невалидные (`amount` не положительное конечное число, пустой `nickname`), сортирует по убыванию суммы, обрезает до `TOP_DONATORS_LIMIT` (`constants/top-donators-limit.constant.ts`, `= 5`)
  - `DonatorsController` (`donators.controller.ts`) — `GET /donators/top`, публичный, без guard'ов
- Не входит (см. issue #40): реальная интеграция с конкретным провайдером — только мок + env-плейсхолдер; пагинация (список всегда ≤5)

### UploadModule
- Путь: `src/upload/`
- Назначение: `POST /upload` — приём файла (multipart), сохранение на локальную ФС сервера (`uploads/` в корне проекта, не в git), возврат публичного URL. Загрузка защищена `JwtAuthGuard`, отдача самих файлов по URL — публична, без авторизации (см. `useStaticAssets` в `src/main.ts`).
- Компоненты:
  - `UploadController` (`upload.controller.ts`) — `@UseInterceptors(FileInterceptor('file', multerOptions))`
  - `multerOptions` (`upload.options.ts`) — `diskStorage` (имя файла — `randomUUID()` + расширение по MIME из `MIME_EXTENSION_MAP`, не по `originalname` клиента), `limits.fileSize`, `fileFilter` (allowlist MIME)
  - Константы (`constants/upload.constant.ts`) — `UPLOADS_DIR`, `UPLOADS_URL_PREFIX = '/uploads'`, `MAX_UPLOAD_SIZE_BYTES = 5 МБ`, `MIME_EXTENSION_MAP` (allowlist: `image/jpeg`/`image/png`/`image/webp`)
- `imports: [AuthModule]` — для DI-резолва `JwtAuthGuard`
- Ошибки `multer` (превышение лимита размера, недопустимый тип файла) уже транслируются в корректные `HttpException` встроенным `transformException()` из `@nestjs/platform-express` (`FileInterceptor` вызывает его сам) — доп. обработка `MulterError` в `AllExceptionsFilter` не нужна, ошибки доходят как обычный `413`/`400`
- Привязка к полю аватара в `Profile` — реализована в `ProfileModule` (`PATCH /profile/avatar`, #49), а не здесь: `UploadController` по-прежнему только принимает файл и возвращает `{ url }`, ничего не знает про `Profile`

## Сиды

- `prisma/seed.ts` — запускается `npx prisma db seed` (в Prisma 7 команда настраивается в `prisma.config.ts` → `migrations.seed`, раннер — `tsx`, не `ts-node` — см. `backend/CLAUDE.md`). Два независимых шага, оба идемпотентны (`upsert`):
  - `seedSchedule()` (#39) — 7 дней недели (`WEEKDAY_ORDER`), дефолт `isOnline=false`; выполняется **всегда**, не зависит от admin-переменных окружения — `GET /schedule` публичный и должен отдавать 7 строк даже там, где сид администратора не запускался
  - `seedAdmin()` — дефолтный администратор (`role=ADMIN`) по `SEED_ADMIN_LOGIN`/`SEED_ADMIN_PASSWORD` (только для сида, не для обычного старта приложения), пароль хэшируется тем же `BCRYPT_SALT_ROUNDS`, что и в `LocalAuthService.register()`; при отсутствии этих переменных скрипт по-прежнему завершается `process.exit(1)` (поведение #20 не менялось) — но уже после того, как `seedSchedule()` успела отработать

## Модели данных (Prisma)

- Путь схемы: `prisma/schema.prisma`, миграции в `prisma/migrations/`
- `Role` (enum) — `ADMIN` \| `MODERATOR` \| `USER`; "гость" — НЕ значение enum, а отсутствие валидной сессии/JWT
- `Theme` (enum) — `LIGHT` \| `DARK` \| `SYSTEM` ("как на устройстве")
- `User` — `id` (`String`, `cuid()`), `login` (unique), `passwordHash` (nullable — может не быть при чисто Google-аккаунте), `provider`/`googleId` (nullable, `googleId` unique — Google OAuth), `role` (default `USER`), `createdAt`/`updatedAt`
- `Profile` — 1:1 с `User` (`userId` unique), `email` (nullable, не верифицируется, для связи/уведомлений и авто-связки Google по email), `name`/`avatarUrl` (#46, оба nullable — отображаемое имя и URL аватара; `avatarUrl` просто строка-URL, без разделения preset/custom на уровне данных); редактируются через `PATCH /profile`/`PATCH /profile/avatar` (#49)
- `Settings` — 1:1 с `User` (`userId` unique), `theme` (default `SYSTEM`), `receiveNotifications` (`Boolean`, default `true`)
- `Weekday` (enum, #39) — `MONDAY`…`SUNDAY`
- `Schedule` (#39) — ровно 7 строк (по одной на `weekday`, `@unique`), `isOnline` (default `false`), `eventTitle`/`time` (оба nullable, `time` — строка `HH:MM`, заполняются только когда `isOnline=true`)
- `SocialLinkType` (enum, #46) — `EMAIL` \| `TELEGRAM` \| `TIKTOK` \| `PHONE` \| `VIBER`
- `GameAccount` (#46) — 1:N с `User` (`userId`, `onDelete: Cascade`, без `@unique` — пользователь может иметь несколько игровых аккаунтов), `nickname` (`String`), `externalId` (`String` — id аккаунта в игре, намеренно не `id`, чтобы не путать с PK строки), `createdAt`/`updatedAt`; без API-эндпоинтов пока — только модель данных (issue #46)
- `SocialLink` (#46) — 1:N с `User` (`userId`, `onDelete: Cascade`), `type` (`SocialLinkType`), `value` (`String`, произвольный формат — валидация под конкретный `type` не входит в #46); без API-эндпоинтов пока — только модель данных (issue #46)

## Глобальная инфраструктура

- `ValidationPipe` (глобальный, `src/main.ts`) — `whitelist`/`forbidNonWhitelisted`/`transform` включены для всех эндпоинтов
- `ClassSerializerInterceptor` (глобальный, `src/main.ts`, #26) — применяет `@Exclude()`/`@Expose()` (class-transformer) к ответам контроллеров; работает только для настоящих экземпляров классов (не для plain-объектов Prisma), поэтому чувствительные Prisma-модели оборачиваются в сущности вроде `UserEntity` (`src/auth/entities/user.entity.ts`, `passwordHash`/`googleId` под `@Exclude()`) перед возвратом из сервисов
- `AllExceptionsFilter` — `src/shared/filters/http-exception.filter.ts`, регистрируется через `APP_FILTER` в `AppModule`; единый формат ошибки для всего API — `ErrorResponseDto` (`src/shared/dto/error-response.dto.ts`): `statusCode`, `message` (`string | string[]`), `error`, `timestamp`, `path`. Зарегистрирован в Swagger как `extraModels` (без демо-эндпоинта — см. `src/main.ts`)
- Конвенция пагинации/сортировки/фильтрации — `PaginationQueryDto` (`src/shared/dto/pagination-query.dto.ts`: `page`/`limit`/`sortBy`/`sortOrder`, наследуется feature-DTO для своих полей фильтра), `PaginationMetaDto` (`src/shared/dto/pagination-meta.dto.ts`), `buildPaginationMeta()` (`src/shared/pagination/paginate.ts`), `ApiPaginatedResponse()` decorator (`src/shared/decorators/api-paginated-response.decorator.ts`) — пример использования в README

## Эндпоинты

- `GET /` — `src/app.controller.ts` — базовая информация о приложении (`{ name, version }`), пример аннотирования Swagger-декораторами
- `GET /health` — `src/health/health.controller.ts` — `{ status: 'ok' }`, без авторизации, для docker-compose/CI healthcheck
- `GET /api/docs` — Swagger UI (настроен в `src/main.ts`, только вне `NODE_ENV=production`)
- `GET /auth/me` — `src/auth/auth.controller.ts` — защищён `JwtAuthGuard`, возвращает `{ id, login, role, email }` текущей сессии, `401` без/с невалидной cookie
- `POST /auth/logout` — `src/auth/auth.controller.ts` — публичный, сбрасывает auth-cookie
- `POST /auth/register` — `src/auth/auth.controller.ts` — регистрация по логину/паролю, создаёт `User`+`Profile`+`Settings`, выдаёт сессионную cookie, `409` при занятом `login`, `429` при превышении лимита попыток (#27)
- `POST /auth/login` — `src/auth/auth.controller.ts` — логин по логину/паролю, выдаёт сессионную cookie, `401` при неверных данных, `429` при превышении лимита попыток (#27)
- `POST /auth/google` — `src/auth/auth.controller.ts` — приём Google ID-токена, find-or-create пользователя, выдаёт сессионную cookie, `401` при невалидном/просроченном токене
- `GET /profile` — `src/profile/profile.controller.ts` — защищён `JwtAuthGuard`, возвращает `{ id, userId, email, name, avatarUrl }` собственного профиля
- `PATCH /profile` — `src/profile/profile.controller.ts` — защищён `JwtAuthGuard`, обновляет `email`/`name` собственного профиля
- `PATCH /profile/avatar` — `src/profile/profile.controller.ts` — защищён `JwtAuthGuard`, обновляет `avatarUrl` собственного профиля (#49)
- `GET /settings` — `src/settings/settings.controller.ts` — защищён `JwtAuthGuard`, возвращает `{ id, userId, theme, receiveNotifications }` собственных настроек
- `PATCH /settings` — `src/settings/settings.controller.ts` — защищён `JwtAuthGuard`, обновляет `theme`/`receiveNotifications` собственных настроек
- `POST /upload` — `src/upload/upload.controller.ts` — защищён `JwtAuthGuard`, принимает файл (multipart, поле `file`), возвращает `{ url }`; `400` при недопустимом типе/отсутствии файла, `413` при превышении лимита размера
- `GET /uploads/*` — статика, `useStaticAssets` в `src/main.ts`, без авторизации на чтение
- `GET /donators/top` — `src/donators/donators.controller.ts` — публичный, до 5 донатеров (`{ nickname, amount }`), отсортированы по убыванию суммы
- `GET /schedule` — `src/schedule/schedule.controller.ts` — публичный, возвращает все 7 дней недели в порядке Пн→Вс
- `PATCH /schedule/:weekday` — `src/schedule/schedule.controller.ts` — защищён `JwtAuthGuard` + `RolesGuard(ADMIN)`, обновляет один день; `401` без сессии, `403` не-ADMIN, `400` невалидный `:weekday`

## Сервисы

- `PrismaService` — `src/prisma/prisma.service.ts` — расширяет `PrismaClient`; `onModuleInit()` — `$connect()` + проверочный `SELECT 1`, `onModuleDestroy()` — `$disconnect()`; `DATABASE_URL` читается через `ConfigService.getOrThrow()`
- `AuthService` — `src/auth/auth.service.ts` — см. AuthModule выше
- `LocalAuthService` — `src/auth/local-auth.service.ts` — см. AuthModule выше
- `GoogleAuthService` — `src/auth/google-auth.service.ts` — см. AuthModule выше
- `ProfileService` — `src/profile/profile.service.ts` — см. ProfileModule выше
- `SettingsService` — `src/settings/settings.service.ts` — см. SettingsModule выше
- `DonatorsService` — `src/donators/donators.service.ts` — см. DonatorsModule выше
- `ScheduleService` — `src/schedule/schedule.service.ts` — см. ScheduleModule выше

## Опции окружения / feature-флаги

- `DATABASE_URL` — строка подключения к MySQL (`mysql://USER:PASSWORD@HOST:PORT/DATABASE?allowPublicKeyRetrieval=true`), обязательная, валидируется `src/config/env.validation.ts`. **`allowPublicKeyRetrieval=true` обязателен** для MySQL 8+ аккаунтов с `caching_sha2_password` (дефолтный auth-plugin) без SSL — без него JS-драйвер `mariadb` (используется `PrismaService`/`prisma/seed.ts` через `@prisma/adapter-mariadb`) отказывается запрашивать RSA-ключ и приложение падает с pool timeout при старте, хотя `npx prisma migrate`/`db seed` (свой Rust-движок Prisma) при этом подключаются нормально — путаница при диагностике
- `NODE_ENV` — `development` \| `production` \| `test`, по умолчанию `development`
- `PORT` — HTTP-порт приложения, по умолчанию `3000`
- `CORS_ORIGIN` — разрешённый origin для CORS (dev Angular-сервер), по умолчанию `http://localhost:4200`; используется с `credentials: true` (нужно для cookie-based JWT); прод-origin'ы требуют отдельного пересмотра
- `JWT_SECRET` — секрет подписи сессионных JWT, обязательный, минимум 32 символа
- `JWT_EXPIRES_IN` — TTL access-токена, по умолчанию `7d`; также используется как `maxAge` auth-cookie
- `GOOGLE_CLIENT_ID` — Google OAuth Client ID, обязательный, используется как `audience` при верификации ID-токена; реальное значение из `steramer.io#2` (issue ещё открыта на момент реализации — в `.env` временный плейсхолдер, не коммитится)
- `DONATOR_SERVICE_TOKEN` — токен доступа к внешнему сервису доната, опциональный (валидация `Joi.string().optional()`); `MockDonatorsProvider` (#40) его не читает — заведён заранее для реального провайдера, который подключится позже
- `SEED_ADMIN_LOGIN`/`SEED_ADMIN_PASSWORD` — креды дефолтного администратора; нужны только при запуске `npx prisma db seed` (см. «Сиды»), **не** валидируются `env.validation.ts` и не обязательны для обычного старта приложения

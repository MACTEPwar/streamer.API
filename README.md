# streamer.API

Backend API for the steramer.io project.

## Stack

- NestJS
- Prisma ORM
- MySQL

## Requirements

- Node.js 22.x (LTS)
- npm 10.x

## Running locally

```bash
npm install           # also runs `prisma generate` via postinstall
cp .env.example .env  # fill in your local DATABASE_URL
npm run start:dev     # dev server with watch mode
npm run build          # production build (dist/)
npm run test            # unit tests
npm run test:e2e        # e2e tests
```

### Database (MySQL via Prisma)

Requires a running MySQL server reachable at the `DATABASE_URL` set in `.env` (format: `mysql://USER:PASSWORD@HOST:PORT/DATABASE`). The database itself must already exist — Prisma does not create it. `PrismaService` (`src/prisma/`) connects on app startup; no domain schema/models yet (see `prisma/schema.prisma`).

### Environment variables

Loaded and validated at startup via `@nestjs/config` (`src/config/env.validation.ts`) — the app **refuses to start** with a clear error if a required variable is missing or invalid, rather than silently continuing with `undefined`.

| Variable | Required | Default | Notes |
|---|---|---|---|
| `DATABASE_URL` | yes | — | MySQL connection string |
| `NODE_ENV` | no | `development` | `development` \| `production` \| `test` |
| `PORT` | no | `3000` | HTTP port |
| `CORS_ORIGIN` | no | `http://localhost:4200` | Allowed dev origin (Angular dev server), used with `credentials: true` (required for cookie-based JWT auth — see `src/main.ts`). **Not production-ready as-is** — needs review/reconfiguration for real deployment origins. |
| `JWT_SECRET` | yes | — | Signing secret for session JWTs, min. 32 chars. Never commit a real value — `.env` is gitignored, `.env.example` only has a placeholder. |
| `JWT_EXPIRES_IN` | no | `7d` | Access-token TTL (any `jsonwebtoken`-compatible duration string), also used as the auth cookie's `maxAge`. |

### API docs

`GET /api/docs` — Swagger UI, generated from `@ApiTags`/`@ApiOperation`/`@ApiProperty` decorators (see `src/app.controller.ts` for the annotation pattern). Only enabled when `NODE_ENV !== 'production'`.

### Health check

`GET /health` — `{ "status": "ok" }`, no auth required. Intended for docker-compose/CI healthchecks. No DB connectivity check yet (deliberately deferred — see `src/health/health.controller.ts`).

### Error responses

Все ошибки API приведены к единому формату глобальным `AllExceptionsFilter` (`src/shared/filters/`): `{ statusCode, message, error, timestamp, path }` (`message` — строка или массив строк для ошибок валидации). Схема — `ErrorResponseDto`, зарегистрирована в `/api/docs` (без отдельного демо-эндпоинта — покажет себя на первом реальном POST/PUT-эндпоинте).

Валидация входных данных — глобальный `ValidationPipe` (`whitelist`, `forbidNonWhitelisted`, `transform`): неизвестные поля в теле запроса отклоняются, DTO должны использовать декораторы `class-validator`.

### Pagination / sorting / filtering convention

Shared base for list endpoints (`src/shared/`):

```typescript
// 1. Feature query DTO extends the base — page/limit/sortBy/sortOrder are
//    already there, add your own filter fields with class-validator:
export class NewsQueryDto extends PaginationQueryDto {
  @IsOptional()
  @IsString()
  tag?: string;
}

// 2. Build the response with buildPaginationMeta(page, limit, total):
async findAll(query: NewsQueryDto) {
  const [items, total] = await Promise.all([
    this.prisma.news.findMany({ skip: (query.page - 1) * query.limit, take: query.limit }),
    this.prisma.news.count(),
  ]);
  return { items, meta: buildPaginationMeta(query.page, query.limit, total) };
}

// 3. Document it in Swagger:
@Get()
@ApiPaginatedResponse(NewsResponseDto)
findAll(@Query() query: NewsQueryDto) { ... }
```

`filter` is deliberately not part of the shared DTO — it's domain-specific; each feature adds its own fields by extending `PaginationQueryDto`.

### Auth / sessions

`AuthModule` (`src/auth/`) — shared JWT/cookie session infrastructure, reused by the local login and Google OAuth (not implemented yet) flows:

- `AuthService.issueToken({ sub, role })` — signs an access JWT (`JWT_SECRET`/`JWT_EXPIRES_IN`). No refresh token at this stage.
- `AuthService.setAuthCookie(res, token)` / `clearAuthCookie(res)` — sets/clears the `access_token` cookie (`HttpOnly`, `Secure`, `SameSite=Lax`; `maxAge` derived from the token's real `exp`, not by re-parsing `JWT_EXPIRES_IN`). Login/register/OAuth endpoints call these instead of touching cookies directly.
- `JwtAuthGuard` — reads the cookie, verifies it, attaches `req.user = { id, role }`. Applied per-route via `@UseGuards(JwtAuthGuard)` (not global — most current endpoints are public). No role/RBAC checks yet.
- `GET /auth/me` (protected) — returns `{ id, login, role, email }` for the current session; `401` (unified `ErrorResponseDto` shape) if the cookie is missing/invalid.
- `POST /auth/logout` (public) — clears the cookie.
- `POST /auth/register` — `LocalAuthService.register()`: hashes the password (`bcrypt`, 12 salt rounds), creates `User` (`role=USER`) with `Profile`/`Settings` in the same nested write (Prisma nested writes are already atomic — no separate `$transaction` needed) so `GET /profile`/`GET /settings` never hit a missing row, issues the session cookie, returns `UserMeDto`. Duplicate `login` → `409` (`ErrorResponseDto`).
- `POST /auth/login` — `LocalAuthService.validateCredentials()`: looks up by `login`, compares the bcrypt hash, issues the session cookie, returns `UserMeDto`. Wrong login or password (or a Google-only account with no `passwordHash`) → the same `401` message ("Неверный логин или пароль") either way, to avoid leaking which part was wrong.

CSRF: relies on `SameSite=Lax` as the primary defense — no separate CSRF token at this stage, since the frontend never reads the cookie value itself (plain cookie-JWT scheme, not a token echoed back in headers). Revisit if that assumption changes.

`cookie-parser` middleware is registered globally in `src/main.ts` so `req.cookies` is available everywhere.

### Code style

- `npm run lint` — check only (ESLint + Prettier via `eslint-plugin-prettier`), fails on any issue
- `npm run lint:fix` — same, with `--fix`
- `npm run format` — `prettier --write`

`src/generated/` (Prisma Client output) is excluded from both.

## Status

NestJS project skeleton initialized (feature-module folder convention, see [nestjs-best-practices](.claude/skills/nestjs-best-practices) skill), MySQL connection wired up via Prisma, environment configuration validated via `@nestjs/config`, Swagger/OpenAPI docs available in dev. No domain modules yet — see the [steramer.io](https://github.com/MACTEPwar/steramer.io) umbrella repository (this repo is included there as a git submodule at `backend/`) for design source (Figma exports), overall project conventions, and the current dev-prep task plan.

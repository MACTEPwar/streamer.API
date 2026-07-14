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

## Status

NestJS project skeleton initialized (feature-module folder convention, see [nestjs-best-practices](.claude/skills/nestjs-best-practices) skill), MySQL connection wired up via Prisma. No domain modules yet — see the [steramer.io](https://github.com/MACTEPwar/steramer.io) umbrella repository (this repo is included there as a git submodule at `backend/`) for design source (Figma exports), overall project conventions, and the current dev-prep task plan.

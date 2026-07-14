# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository (`streamer.API`).

## Architecture

- NestJS API, MySQL database, Prisma as the ORM.
- REST API by default unless a task explicitly calls for something else.

## Available skills

`.claude/skills/` in this repo carries the following skills, synced manually from their sources (not auto-updating):

- `prisma-cli` (official, [prisma/skills](https://github.com/prisma/skills)) — Prisma CLI command reference (init, migrate, generate, db push/pull, studio).
- `prisma-client-api` (official, [prisma/skills](https://github.com/prisma/skills)) — Prisma Client query API: CRUD, select/include/where, transactions, raw SQL.
- `prisma-database-setup` (official, [prisma/skills](https://github.com/prisma/skills)) — configuring Prisma against a specific database provider, including MySQL/MariaDB (our provider).
- `nestjs-best-practices` (community, [Kadajett/agent-nestjs-skills](https://github.com/Kadajett/agent-nestjs-skills)) — 40 rules across architecture, DI, error handling, security, performance, testing, database/ORM, API design, microservices, and DevOps for NestJS. Prefer these patterns over ad-hoc structure when writing or reviewing NestJS code.

## Параллельная работа (git worktree)

Нужен только когда две сессии Claude Code работают в **этом же** репозитории одновременно (например, две задачи `streamer.API` параллельно) — не нужен, если параллельная сессия работает в `frontend/` или в умбрелла-репо, это уже отдельные git-репозитории.

`.claude/settings.json` уже настроен: `symlinkDirectories: ["node_modules"]` — новый worktree не тянет отдельный `npm install`, а симлинкает существующий `node_modules`.

Создание: `git worktree add -b <type>/<issue>-<описание> ../streamer.API-wt-<issue>`, затем открыть эту папку отдельным окном VS Code.

Уборка после мержа ветки: `git worktree remove ../streamer.API-wt-<issue>` (и удалить ветку, если не удалилась автоматически при мерже PR).

## Реестр проекта (PROJECT_MAP.md)

`PROJECT_MAP.md` в корне репозитория — живой список того, что уже реализовано (модули, эндпоинты, сервисы с методами, опции окружения). Перед началом задачи сначала смотри `PROJECT_MAP.md`, а не обходи весь проект руками, чтобы понять, что уже есть.

**Обновление — не отдельный пункт, а автоматическая часть завершения работы.** Заканчивая задачу (перед тем как поставить статус "выполнена"), агент сам, без напоминания, дописывает в `PROJECT_MAP.md` всё новое, что создал за эту задачу — модуль/эндпоинт/сервис/метод/опцию, включая тот же коммит/PR. Не полагаться на то, что пользователь попросит отдельно.

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

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
npm install
npm run start:dev   # dev server with watch mode
npm run build        # production build (dist/)
npm run test          # unit tests
npm run test:e2e      # e2e tests
```

## Status

NestJS project skeleton initialized (feature-module folder convention, see [nestjs-best-practices](.claude/skills/nestjs-best-practices) skill). No domain modules yet — see the [steramer.io](https://github.com/MACTEPwar/steramer.io) umbrella repository (this repo is included there as a git submodule at `backend/`) for design source (Figma exports), overall project conventions, and the current dev-prep task plan.

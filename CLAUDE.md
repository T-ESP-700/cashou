# CLAUDE.md

Guidance for Claude Code working in this repository.

## What this is

Cashou — a gamified financial-education platform. Bun-workspaces monorepo, TypeScript (strict), PostgreSQL + Prisma, tRPC end-to-end, Better-Auth. Run every command from the repo root.

## Layout

```
apps/
  backend/      Bun.serve API — tRPC server, WebSockets, pg-boss workers, Expo push
  backoffice/   Admin dashboard — Vite + React + Radix + TanStack (port 5173)
  mobile/       Expo / React Native app — SDK 54, expo-router, NativeWind
  website/      Marketing site (placeholder)
packages/@cashou/
  api            Shared tRPC client + types (backend ↔ clients contract)
  auth           Better-Auth config (server + client)
  db-app         Prisma schema/client — main app DB
  db-backoffice  Prisma schema/client — admin DB
  ui / utils / config   Shared UI, helpers, config
```

Mobile internals: routes in `apps/mobile/app` (expo-router, file-based), plus `components/`, `contexts/`, `hooks/`, `lib/` (tRPC, auth, `game-socket.ts`), `constants/`. Styling via NativeWind/Tailwind.

## Commands

**Dev**
- `bun run dev:setup` — first run: install, start DBs, generate client, migrate
- `bun run dev` — DBs (Docker) + backend + backoffice
- `bun run dev:all` — the above + mobile
- `bun run dev:mobile` / `dev:mobile:go` — Expo dev server / Expo Go

**Check / build / test**
- `bun run typecheck` — type-check every workspace
- `bun run build` — backend + backoffice (`build:mobile` = Expo export)
- `bun test` — full suite (`test:fast` = quick backend subset)

**Database** (Prisma lives in `packages/@cashou/db-app`)
- `bun run db:generate` — generate Prisma clients
- `bun run migrate` — dev migration · `bun run migrate:reset` — reset
- `bun run studio` — Prisma Studio
- `bun run db:seed:level1` / `db:seed:dico` — seed data
- `bun run setup` — full local bootstrap (Docker + migrate + seed)

## Notes

- API contract is tRPC: routers in `apps/backend/src/routers`, consumed by mobile and backoffice via `@cashou/api`.
- Env vars live in the root `.env` (`CASHOU_DB_URL`, Better-Auth keys); DB scripts load it with `dotenv -e ../../../.env`.
- Realtime game updates go over WebSocket (backend `src/ws`, mobile `lib/game-socket.ts` + `use-game-realtime`).

# Repository Guide

## Structure

- This is a pnpm `10.16.1` workspace managed by Turborepo; use Node.js 20+.
- `packages/frontend` is the React 19/Vite app. `src/main.tsx` configures Clerk, `src/App.tsx` gates auth, and `src/auth/` and `src/dashboard/` own the main UI areas.
- `packages/backend/src/index.ts` creates the Express HTTP/WebSocket server; feature routers live under `src/modules/` and mount at `/api/v1`.
- Frontend Vite proxies `/api` to `http://localhost:3000`; use relative `/api/...` URLs for API calls. Backend API docs are served at `/docs`.
- Follow `biome.json` for lint/format. The frontend uses Tailwind v4 via `@tailwindcss/vite` and React Compiler; do not add ESLint, Prettier, or Tailwind 3.

## Commands And Environment

- Root scripts: `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`; `pnpm format` writes formatting changes.
- Run one package with `pnpm --filter @des-proyecto/frontend <script>` or `pnpm --filter @des-proyecto/backend <script>`.
- Backend tests use Vitest: `pnpm --filter @des-proyecto/backend test`; pass a file after `--` for a focused test.
- Backend `build` and `typecheck` run `prisma generate`; use `db:validate`, `db:generate`, `db:seed`, and `db:migrate` from the backend package for database tasks. Migrations use `DIRECT_URL`; runtime Prisma uses `DATABASE_URL`.
- Backend env is loaded from `packages/backend/.env` and requires `DATABASE_URL` and `CLERK_SECRET_KEY`; `CORS_ORIGIN` defaults to `*` and `PORT` to `3000`. Use `.env.example` as the variable list.
- Frontend startup requires `packages/frontend/.env.local` with `VITE_CLERK_PUBLISHABLE_KEY`; keep local credentials untracked.

## Generated And Domain Files

- The Prisma source of truth is `packages/backend/prisma/schema.prisma`; migrations are in `packages/backend/prisma/migrations/` and generated client code is `packages/backend/src/generated/prisma/`. Do not hand-edit generated output, `dist/`, or `.turbo/`.
- Clerk authorization uses organization roles `org:admin` and `org:member`; admins satisfy member-level checks. `actorId` values are external Clerk identities, not local user foreign keys.
- Preserve schema enums and Prisma `Decimal` values at API boundaries. `Client`, `Supplier`, and `InventoryItem` use nullable `deletedAt` soft deletion, so list/read behavior must explicitly handle deactivated records.
- Read `CONTEXT.md` before changing domain terms and check relevant `docs/adr/` decisions; `docs/agents/domain.md` explains that vocabulary and ADR workflow.

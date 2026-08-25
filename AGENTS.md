# Repository Guide

## Boundaries

- This is a pnpm `10.16.1` workspace (`packages/frontend`, `packages/backend`) managed by Turborepo; use Node.js 20+.
- `packages/frontend` is the React 19/Vite app. `src/main.tsx` owns Clerk, `src/App.tsx` gates auth, `src/auth/` contains auth UI, and `src/dashboard/` contains ERP UI.
- `packages/backend/src/index.ts` is the Express API entrypoint. Public health check: `GET /api/v1/health`; authenticated API routes mount under `/api/v1`.
- Vite proxies `/api` to `http://localhost:3000`; frontend API calls should use relative `/api/...` URLs.
- Tailwind is v4 through `@tailwindcss/vite`; follow the existing Biome configuration and do not introduce Tailwind 3, ESLint, or Prettier.
- Turborepo caches only `dist/**` for builds; generated/build artifacts under `dist/`, `.turbo/`, and `packages/backend/src/generated/prisma/` are not hand-edited.

## Commands And Environment

- Root commands: `pnpm install`, `pnpm dev`, `pnpm lint`, `pnpm typecheck`, `pnpm build`; `pnpm format` writes changes.
- Focus a package with `pnpm --filter @des-proyecto/frontend <script>` or `pnpm --filter @des-proyecto/backend <script>`.
- Backend scripts include `db:generate`, `db:validate`, and `db:migrate`; `build` and `typecheck` also run Prisma generation.
- Backend loads `packages/backend/.env` through `dotenv/config` and requires `DATABASE_URL`, `CLERK_SECRET_KEY`, and valid `CORS_ORIGIN`; `PORT` defaults to `3000`.
- Runtime Prisma connections use `DATABASE_URL`; Prisma migrations use `DIRECT_URL` from `packages/backend/prisma.config.ts` (with a local fallback if absent).
- Frontend startup requires `packages/frontend/.env.local` with `VITE_CLERK_PUBLISHABLE_KEY`; credentials stay out of version control.
- There is currently no test script or test suite; verify changes with the relevant package lint/typecheck/build commands.

## Prisma Data Model

- PostgreSQL is the datasource. The schema is `packages/backend/prisma/schema.prisma`; migrations are in `packages/backend/prisma/migrations/`; generated client output is `packages/backend/src/generated/prisma/`.
- There is no local `User` model. `actorId` on `ProductionEvent`, `StockMovement`, `Payment`, and `AuditLog` stores an external Clerk identity and is not a database foreign key. Auth roles are Clerk metadata roles `owner` and `staff`, with owners allowed to perform staff actions.
- `Client` is the customer root: one optional `ClientMeasurement`, many `Quote`, and many `CustomerOrder`. `Client`, `Supplier`, and `InventoryItem` use nullable `deletedAt` soft deletion; normal reads must decide whether to exclude soft-deleted records.
- `Quote` belongs to one `Client`, has many `QuoteItem`, and may produce at most one `CustomerOrder` (`CustomerOrder.quoteId` is nullable and unique). `QuoteItem` is composition-owned and cascades on quote deletion.
- `CustomerOrder` belongs to one `Client`, optionally one `Quote`, and has many `OrderItem` and `ProductionJob`; it may have one `Sale`. `OrderItem` cascades with its order. Monetary values use `Decimal(12,2)`; quantities use `Decimal(10,3)`.
- Production flow is `ProductionStage` -> many `ProductionJob` -> many `ProductionEvent`. A job may optionally target an `OrderItem`; every job has a stage. Events record the transition from optional `fromStage` to required `toStage`, and cascade when the job is deleted. Stage names and positions are unique.
- Inventory flow is `Supplier` -> many optional-supplier `InventoryItem` -> many `StockMovement`. Inventory quantities use `Decimal(14,3)` and movements are append-only records with type, unit, reason/reference, and external actor.
- Sales flow is one `Sale` per `CustomerOrder` (`Sale.orderId` unique), with many `SaleItem` and `Payment`; sale items and payments cascade on sale deletion. Sale totals/money use `Decimal(12,2)`.
- `AuditLog` is independent and records external actor, entity type/id, action, and optional JSON `before`/`after` snapshots; do not infer relational integrity from `entityId`.
- Preserve enum/state vocabulary from the schema: `QuoteStatus`, `OrderStatus`, `ProductionJobStatus`, `UnitOfMeasure`, `StockMovementType`, `SaleStatus`, and `PaymentMethod`. Use Prisma `Decimal` values deliberately at API boundaries rather than silently converting business quantities or money to binary floating point.

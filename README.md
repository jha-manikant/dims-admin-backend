# DIMS Admin Portal — Backend

Express + TypeScript backend that sits in front of the third-party DIMS .NET API.
Handles Google OAuth (hosted-domain restricted), RBAC, audit logging, and signs
short-lived RS256 service JWTs that DIMS verifies via this app's JWKS endpoint.

Start here:

- [`docs/project.md`](docs/project.md) — full project brief, architecture, auth/authz flows.
- [`docs/project.html`](docs/project.html) — same brief as a stakeholder-friendly HTML page.
- [`docs/architecture-plan.md`](docs/architecture-plan.md) — consolidated design plan (decisions, schema, .NET snippet, phases, ops, best-practices compliance matrix).
- [`docs/setup-and-run.md`](docs/setup-and-run.md) — exhaustive dev + Windows-Server-prod (IIS + NSSM) deploy guide.
- [`docs/dims-dotnet-integration.md`](docs/dims-dotnet-integration.md) — drop-in snippet for the DIMS .NET team.
- [`docs/best-practices.md`](docs/best-practices.md) — the enterprise rules this codebase follows.

## Local setup

```bash
# 1. Spin up MS SQL Server + Redis
docker compose up -d mssql redis

# 2. Install deps
npm install

# 3. Copy env template and fill in values
cp .env.example .env

# 4. Generate the local RSA keypair (service-JWT signer)
npm run keys:generate

# 5. Apply the SQL schema + seed data
npm run db:migrate:raw

# 6. Seed yourself as the first SuperAdmin (Phase 1)
npm run bootstrap:superadmin -- you@datagainservices.com

# 7. Run
npm run dev
```

Health endpoints:

- `GET /health` — liveness, always 200 if the process is up.
- `GET /ready` — readiness, 200 only when MS SQL **and** Redis are reachable.

## Scripts

| Script                         | Purpose                                             |
| ------------------------------ | --------------------------------------------------- |
| `npm run dev`                  | Watch-mode dev server (`tsx watch`)                 |
| `npm run build`                | Type-check and emit `dist/`                         |
| `npm run start`                | Run the compiled `dist/server.js`                   |
| `npm run lint`                 | ESLint (`strict-type-checked`)                      |
| `npm run typecheck`            | `tsc --noEmit`                                      |
| `npm run db:generate`          | Generate Prisma client                              |
| `npm run db:migrate:raw`       | Apply `src/db/migrations/*.sql` to MS SQL Server    |
| `npm run keys:generate`        | Produce `keys/private.pem` + `keys/public.pem`      |
| `npm run bootstrap:superadmin` | Seed the first SuperAdmin                           |

## Project layout

Layered by concern (per file-naming convention). Each domain module is
spread across its concern folders rather than living in a self-contained
folder. See [`docs/project.md`](docs/project.md) → "Repository layout" for
the canonical version. The short version:

```
src/
├── controllers/         <module>.controllers.ts          — req/res only
├── services/            <module>.services.ts             — business logic
├── repositories/        <module>.repositories.ts         — DB queries (Prisma)
├── routes/              <module>.routes.ts               — Express routers
├── validationSchemas/   <module>.validationSchema.ts     — Zod
├── types/               <module>.types.ts + ambient .d.ts
├── middlewares/         requestId, logger, authenticate, RBAC, helmet, cors, ratelimit, csrf, session, error
├── configs/             env (Zod-validated) + per-concern configs
├── auth-tokens/         keystore + RS256 service-JWT signer (routes/jwks.routes.ts publishes JWKS)
├── errors/              AppError hierarchy
├── audit/               audit log writer
├── cache/               Redis client + typed key builders + permission read-through cache
├── db/                  Prisma client + raw SQL migrations
├── health/              SIGTERM shutdown handler
├── utils/               small focused helpers (logger, ids, asyncHandler, …)
├── app.ts               composes middleware + mounts /api/v1
└── server.ts            binds port, registers shutdown
```

## Conventions

- Read `.env` only via `src/configs/env.ts`. `process.env.*` access elsewhere is
  blocked by ESLint (best-practices rule #6).
- File naming: `<module>.controllers.ts` (plural), `<module>.services.ts`
  (plural), `<module>.repositories.ts` (plural), `<module>.routes.ts`
  (plural), `<module>.types.ts` (plural), `<module>.validationSchema.ts`
  (singular). One module's pieces live in different folders by concern.
- Controllers don't touch the DB. Repositories don't carry business logic.
- Throw `AppError` subclasses; never `new Error(...)`. The global error
  middleware translates them to the standard response shape.
- Use `req.log` (pino-http child logger) — `console.log` is banned by ESLint.

## What's NOT in this repo

- The Next.js frontend lives in `../frontend/`.
- DIMS .NET API is owned by Datagain Services. Integration spec lives in
  [`docs/dims-dotnet-integration.md`](docs/dims-dotnet-integration.md).

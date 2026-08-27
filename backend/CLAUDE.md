# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev                  # Start with hot reload (tsx watch), http://localhost:3000
npm run build                # TypeScript -> dist/
npm run start                # Production (node dist/index.js)
npm run test                 # Vitest watch mode
npm run test:run             # Vitest single run
npm run typecheck            # tsc --noEmit
npm run lint                 # ESLint src/
npm run db:push              # Sync Drizzle schema to database (dev)
npm run db:generate          # Generate Drizzle migration SQL
npm run db:migrate           # Run pending migrations
npm run db:seed              # Seed test data (tsx src/db/seed.ts)
npm run db:studio            # Drizzle Studio GUI
docker compose up -d         # Start Postgres 16 + Redis 7 locally
```

## Architecture

**Stack**: Fastify 5 + Socket.IO 4.8 + Drizzle ORM + PostgreSQL 16 + Redis 7 + BullMQ + Zod + firebase-admin

**ESM project** (`"type": "module"` in package.json). Target ES2022, `moduleResolution: "bundler"`.

### Entry Point

`src/index.ts` — boots Fastify, registers plugins (cors, helmet, compress, jwt), mounts all route modules under `/api/v1`, attaches Socket.IO to the HTTP server, starts 4 BullMQ workers, and schedules recurring jobs.

### Module Pattern

Each domain lives in `src/modules/<name>/` with up to 3 files:

- `<name>.schemas.ts` — Zod schemas for request validation + inferred TypeScript types
- `<name>.service.ts` — business logic, all DB queries via Drizzle
- `<name>.routes.ts` — Fastify route handler registering as a plugin (`async function xxxRoutes(app)`)

Routes parse request body/query with Zod (`schema.parse(request.body)`), then delegate to service functions. All route modules except auth apply `authMiddleware` via `app.addHook('preHandler', authMiddleware)`.

**Modules**: auth, users, friends, conversations, messages, gasps, reactions, webhooks. Two are service-only (no routes): notifications, presence.

### Config Layer (`src/config/`)

- `env.ts` — Zod-validated env vars. Required: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET` (min 16 chars), `FIREBASE_PROJECT_ID`.
- `database.ts` — Drizzle ORM instance (`db`) using `postgres` driver. Import `db` from here for all queries.
- `redis.ts` — 3 ioredis connections: `redis` (general/BullMQ), `redisPub`, `redisSub` (Socket.IO adapter). All use `maxRetriesPerRequest: null` (BullMQ requirement).
- `firebase.ts` — firebase-admin init with credential fallback chain. Exports `firebaseAuth` and `firebaseMessaging`.
- `socket.ts` — Socket.IO server factory with Redis adapter for horizontal scaling.

### Database (`src/db/`)

- **Schema**: `src/db/schema/` — 8 table files + `index.ts` barrel. Tables: users, friendships, conversations, conversation_participants, messages, gasps, reactions, devices, webhooks.
- **IDs**: CUID2 via `@paralleldrive/cuid2` (`$defaultFn(() => createId())`).
- **Timestamps**: All tables use `timestamp(..., { withTimezone: true })`.
- **Types**: Each schema file exports inferred types (`type User = typeof users.$inferSelect`).
- **Migrations**: `src/db/migrations/`, managed by Drizzle Kit. Config in `drizzle.config.ts`.

### Real-time (`src/socket/`)

- `middleware.ts` — Socket.IO auth via `jsonwebtoken.verify()` (not `@fastify/jwt`). Augments `Socket` interface with `user: AuthPayload`.
- `chat.gateway.ts` — Events: `chat:send_message`, `chat:typing_start/stop`, `chat:mark_read`, `chat:join/leave_conversation`. Uses room pattern `conversation:{id}` and `user:{userId}`.
- `presence.gateway.ts` — Online/offline status tracking.
- `gasp.gateway.ts` — Gasp-specific real-time events.

### Background Jobs (`src/jobs/`)

- `queue.ts` — 4 BullMQ queues (notifications, webhooks, gasp-expiry, cleanup) + `scheduleRecurringJobs()`.
- `workers/` — One worker per queue. Gasp expiry runs every 60s, cleanup daily at 3 AM.

### Shared (`src/shared/`)

- `errors.ts` — `AppError` base class + `NotFoundError`, `UnauthorizedError`, `ForbiddenError`, `BadRequestError`, `ConflictError`, `RateLimitError`. The global error handler in `src/index.ts` serializes these automatically.
- `pagination.ts` — Cursor-based helpers: `encodeCursor`/`decodeCursor` (base64url-encoded ISO timestamps), `buildCursorCondition`, `getCursorOrderBy`. Response shape: `{ data, nextCursor, hasMore }`.
- `types.ts` — Shared enums/interfaces: `AuthPayload`, `PaginatedResponse<T>`, `MessageType`, `FriendshipStatus`, `GaspStatus`, etc.
- `rate-limit.ts` — Rate limit presets (auth: 10/min, messages: 30/min, global: 100/min).

### Auth Flow

1. Mobile app authenticates via Firebase Auth (phone SMS)
2. App sends `firebaseToken` to `POST /api/v1/auth/register` or `/login`
3. Backend verifies token with `firebase-admin`, finds/creates user, issues JWT via `@fastify/jwt`
4. All subsequent HTTP requests use JWT in `Authorization` header, verified by `authMiddleware`
5. Socket.IO connections pass JWT in `socket.handshake.auth.token`

## Import Conventions

- **`src/db/schema/` files**: Use **extensionless** imports (`from './users'`) — required by Drizzle Kit.
- **All other files**: Use **`.js` extension** imports (`from './config/env.js'`) — required by ESM.
- **Path alias**: `@/*` maps to `./src/*` (configured in tsconfig but not widely used yet).

## Known Gotchas

1. **BullMQ connection**: Pass `{ url: env.REDIS_URL }` to BullMQ queues/workers, NOT the ioredis instance (bundled ioredis version conflict).
2. **`@fastify/jwt` type augmentation**: Declare `FastifyJWT` interface in the `@fastify/jwt` module (`declare module '@fastify/jwt'`), not on `FastifyRequest`. See `src/modules/auth/auth.middleware.ts`.
3. **Socket.IO type augmentation**: `Socket` interface extended with `user: AuthPayload` in `src/socket/middleware.ts` (`declare module 'socket.io'`).
4. **firebase-admin exports**: Need explicit type annotations (e.g., `const firebaseAuth: admin.auth.Auth`) to avoid TS2742 errors.
5. **tsconfig strict**: `noUncheckedIndexedAccess: true` is enabled — array/object index access returns `T | undefined`.

# GASP Backend API 🚀

Welcome to the backend repository of **GASP**.
This is the modern backend infrastructure that powers the real-time chat, gasps (reactions/messages), and notifications for the GASP platform. It is built using Fastify and runs on Node.js.

## 🛠️ Technology Stack

- **Core**: Node.js, Fastify
- **Database**: PostgreSQL (via Neon Serverless)
- **ORM**: Drizzle ORM
- **Cache & Message Broker**: Redis (ioredis)
- **Real-time WebSockets**: Socket.IO (with Redis Adapter)
- **Background Jobs**: BullMQ (Notifications, Webhooks, Expiry, Cleanup)
- **Auth**: Fastify JWT & Firebase Admin (for Apple/Phone Auth handling)
- **Testing**: Vitest
- **Language**: TypeScript

## 📦 Getting Started

### Prerequisites

You need the following installed:
- Node.js (v20+ recommended)
- PostgreSQL
- Redis server
- pnpm / npm

### Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Set up your environment variables by creating a `.env` file at the root level (see *Environment Variables*).

3. Setup your Database schemas:
   ```bash
   npm run db:generate
   npm run db:push
   npm run db:seed
   ```

### Running the App

Start the development server:
```bash
npm run dev
```
The server runs on `http://localhost:3000` by default.

## ⚙️ Environment Variables

Create a `.env` file referencing the structure below:

```env
# Application
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
CORS_ORIGIN=*

# PostgreSQL & Redis Connections
DATABASE_URL=postgres://user:password@hostname/dbname
REDIS_URL=redis://localhost:6379

# Authentication & Security
JWT_SECRET=your_super_secret_jwt_key
JWT_EXPIRES_IN=24h

# Firebase Admin SDK (used for Apple/Phone Auth)
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_PRIVATE_KEY=your_firebase_private_key
```

## 🗄️ Available Scripts

- `npm run dev` — Starts the API in TS watch mode automatically.
- `npm run build` — Transpiles TypeScript files to JS for production.
- `npm run start` — Runs the API in production mode (requires `npm run build` first).
- `npm run db:generate` — Generates Drizzle migrations based on your schema.
- `npm run db:push` — Pushes current schema changes directly to the database.
- `npm run db:studio` — Opens Drizzle visual database manager.
- `npm run db:seed` — Runs the seed script to populate initial data.
- `npm run test` — Runs the test suite in watch mode.
- `npm run lint` — Runs ESLint.
- `npm run typecheck` — Checks TS types without emitting files.

## 🏗️ Architecture Modules

Current route modules available:
- **`/auth`**: User authentication pipelines (Firebase tokens / Guests)
- **`/users`**: User profile management and search
- **`/friends`**: Friend requests and network
- **`/conversations` & `/conversations/:id/messages`**: Private/group chat and real-time syncing
- **`/gasps`**: Sending real reactions/messages (Gasps)
- **`/reactions`**: Emotes & reaction logging
- **`/webhooks`**: Inbound webhook processing

## ⚖️ License

All rights reserved.

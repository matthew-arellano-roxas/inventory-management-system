# Inventory Management System

Full-stack inventory and point-of-sale application with a React frontend, an Express/TypeScript backend, PostgreSQL via Prisma, and BullMQ-backed scheduled jobs using Redis.

## Stack

- Frontend: React, Vite, TypeScript, Tailwind CSS, TanStack Query, Auth0
- Backend: Node.js, Express 5, TypeScript, Prisma, Socket.IO
- Data: PostgreSQL
- Background jobs: BullMQ + Redis
- Deployment: Docker, Docker Compose, Render

## Project Structure

```text
.
|-- frontend/   # Vite + React client
|-- backend/    # Express API + Prisma + scheduler
|-- .env        # Docker Compose variables
`-- docker-compose.yml
```

## Core Features

- Product, category, branch, and stock management
- Point-of-sale flow for sale, return, purchase, and damage transactions
- Product, branch, daily, monthly, and current-day reporting
- Operating expense tracking
- Auth0-protected API routes
- Scheduled cleanup and reporting jobs

## Scheduled Jobs

The backend starts BullMQ workers on boot and uses Redis for recurring jobs.

Current scheduled jobs:

- `daily-cleanup`
  - Runs daily at `2:00 AM` (`Asia/Manila`)
  - Cleans old transactions, stock movements, announcements, and old daily report rows
  - Current retention:
    - Transactions: 3 months
    - Stock movements: 14 days
    - Announcements: 14 days
    - Daily reports: 30 days
- `daily-report-and-stock-check`
  - Runs daily at midnight (`Asia/Manila`)
  - Creates the previous day's daily report snapshot
  - Runs stock level checks
- `monthly-report`
  - Runs at midnight on the 1st day of each month (`Asia/Manila`)
  - Creates the monthly report snapshot and resets report totals

## Local Development

### Requirements

- Node.js 20+
- npm
- PostgreSQL
- Redis

Docker Desktop is the simplest way to run PostgreSQL and Redis locally.

### Backend

Create `backend/.env.development`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb?schema=public
REDIS_URL=redis://127.0.0.1:6379
AUTH_AUDIENCE=https://inventory-system-api.com
AUTH_ISSUER_BASE_URL=https://your-auth0-domain/
ALLOWED_ORIGINS=http://localhost:5173
PORT=3000
```

Then run:

```bash
cd backend
npm install
npx prisma generate
npm run prisma:migrate
npm run dev
```

Backend default URL: `http://localhost:3000`

Health check:

```text
http://localhost:3000/health
```

### Frontend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_AUTH0_AUDIENCE=https://inventory-system-api.com
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_BACKEND_API_IDENTIFIER=https://inventory-system-api.com
VITE_AUTH0_SCOPE=openid profile email offline_access
```

Then run:

```bash
cd frontend
npm install
npm run dev
```

Frontend default URL: `http://localhost:5173`

## Docker Compose

This repo uses a root `.env` file for `docker-compose.yml` placeholders.

Current Compose services:

- `db` (PostgreSQL)
- `redis`
- `backend`
- `frontend`

### Root Compose Variables

The root `.env` is used by Docker Compose for:

- Postgres container settings
- backend runtime variables
- backend build `DATABASE_URL`
- frontend build-time `VITE_*` values

Example:

```env
POSTGRES_DB=mydb
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
DATABASE_URL=postgresql://postgres:postgres@db:5432/mydb?schema=public
NODE_ENV=production
PORT=3000
REDIS_URL=redis://redis:6379
AUTH_AUDIENCE=https://inventory-system-api.com
AUTH_ISSUER_BASE_URL=https://your-auth0-domain/
ALLOWED_ORIGINS=http://localhost:5173
VITE_API_URL=http://localhost:3000
VITE_AUTH0_AUDIENCE=https://inventory-system-api.com
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_BACKEND_API_IDENTIFIER=https://inventory-system-api.com
VITE_AUTH0_SCOPE=openid profile email offline_access
```

### Start the Stack

```bash
docker compose up --build
```

Default service URLs:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Stop services:

```bash
docker compose down
```

Remove services and database volume:

```bash
docker compose down -v
```

### Compose Notes

- If you change only runtime envs in root `.env` (for example `REDIS_URL`), recreating containers is usually enough.
- If you change build args (`DATABASE_URL`, `VITE_*`) or dependency files, rebuild the images.
- The backend container currently runs Prisma migrations on startup before starting the API.

## Prisma Workflow

Generate Prisma client:

```bash
cd backend
npx prisma generate
```

Create and apply a migration during development:

```bash
cd backend
npm run prisma:migrate
```

Apply existing migrations:

```bash
cd backend
npm run migrate:deploy
```

Quick schema sync without creating a migration:

```bash
cd backend
npm run prisma:push
```

## Deployment Notes

### Render

Frontend:

- Deploy as a Static Site
- Root directory: `frontend`
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Add a rewrite rule from `/*` to `/index.html`

Backend:

- Deploy as a Web Service using Docker
- Set backend env vars in Render
- Use your production `DATABASE_URL`
- Use a Redis/Key Value `REDIS_URL`

For Render Key Value:

- Use the internal Redis URL for Render-to-Render communication
- Use the external `rediss://...` URL only for local/external testing
- External access requires your public IP to be allowlisted

## Scripts

### Backend

```bash
npm run dev
npm run dev:development
npm run dev:production
npm run build
npm run start
npm run start:dev
npm run start:prod
npm run lint
npm run lint:fix
npm run prisma:migrate
npm run prisma:generate
npm run prisma:push
npm run migrate:deploy
npm run prisma:migrate:dev
npm run prisma:migrate:prod
npm run prisma:generate:dev
npm run prisma:generate:prod
npm run migrate:deploy:dev
npm run migrate:deploy:prod
npm run prisma:studio
npm run prisma:studio:dev
npm run prisma:studio:prod
npm run prisma:push:dev
npm run prisma:push:prod
npm run prisma:reset
npm run prisma:reset:dev
npm run prisma:reset:prod
```

### Frontend

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

## Notes

- Keep Prisma package versions aligned (`prisma`, `@prisma/client`, and `@prisma/adapter-pg`).
- Local backend development should use a local Redis URL such as `redis://127.0.0.1:6379`.
- Docker Compose backend should use the Compose Redis service URL: `redis://redis:6379`.
- The root `.env` contains real config values for Compose; do not commit secrets carelessly.

## License

Apache-2.0

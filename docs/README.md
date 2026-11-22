# Setup and Documentation

This guide covers local setup, database workflows, demo data, and deployment.

## Documentation navigation

- [Project overview and screenshots](../README.md)
- [Backend overview](../backend/README.md)
- [Frontend overview](../frontend/README.md)
- [Database schema and migrations](../backend/prisma/)
- [UI screenshots](images/)

## Requirements

- Node.js 20 or later and npm
- PostgreSQL
- Redis
- Docker Desktop (recommended for local PostgreSQL and Redis)
- Auth0 application and API configuration for authenticated frontend access

## Local development

### 1. Start PostgreSQL and Redis

For the easiest setup, create a root `.env` file using the Compose variables below, then start the database and Redis services:

```bash
docker compose up -d db redis
```

You can also use existing PostgreSQL and Redis services. For local development, the backend normally connects to PostgreSQL at `localhost:5432` and Redis at `127.0.0.1:6379`.

### 2. Configure the backend

Create `backend/.env.development`:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mydb?schema=public
REDIS_URL=redis://127.0.0.1:6379
AUTH_AUDIENCE=https://inventory-system-api.com
AUTH_ISSUER_BASE_URL=https://your-auth0-domain/
ALLOWED_ORIGINS=http://localhost:5173
PORT=3000
```

Install dependencies, generate the Prisma client, and apply migrations:

```bash
cd backend
npm install
npm run prisma:generate:dev
npm run prisma:migrate:dev
npm run dev
```

The API listens on `http://localhost:3000`. Its health endpoint is `http://localhost:3000/health`.

### 3. Configure the frontend

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000
VITE_AUTH0_AUDIENCE=https://inventory-system-api.com
VITE_AUTH0_DOMAIN=your-auth0-domain
VITE_AUTH0_CLIENT_ID=your-auth0-client-id
VITE_AUTH0_BACKEND_API_IDENTIFIER=https://inventory-system-api.com
VITE_AUTH0_SCOPE=openid profile email offline_access
```

In another terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend is available at `http://localhost:5173`.

## Docker Compose

Create a root `.env` for Compose:

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

Start the full stack:

```bash
docker compose up --build
```

Services:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

Stop the stack with `docker compose down`. To also remove the local database volume and its data, use `docker compose down -v`.

## Database workflow

Run commands from `backend/`.

```bash
npm run prisma:generate:dev
npm run prisma:migrate:dev
```

Apply existing migrations to a database with `npm run migrate:deploy:dev`. Use `npm run prisma:push:dev` only when you intentionally want to sync the schema without creating a migration.

## Demo data

The seed creates clearly labeled demo branches, categories, products, inventory, sales and purchase history, reports, and expenses. It is idempotent and does not delete existing records. It is not run automatically when the app starts.

Use the development database:

```bash
cd backend
npm run seed:dev
```

For a recruiter-facing deployment, seed only a dedicated demo database after applying migrations. The deployed backend uses its configured `DATABASE_URL`; run this explicitly from the Render shell:

```bash
npm run seed:prod
```

Do not run the demo seed against a database containing real business data.

## Render deployment

### Frontend

- Deploy `frontend/` as a Static Site.
- Build command: `npm install && npm run build`
- Publish directory: `dist`
- Add a rewrite from `/*` to `/index.html`.
- Configure the required `VITE_*` environment variables.

### Backend

- Deploy `backend/` as a Docker Web Service.
- Configure the backend environment variables, including `DATABASE_URL`, Auth0 settings, `ALLOWED_ORIGINS`, `PORT`, and `REDIS_URL`.
- Use Render's internal Redis URL for service-to-service connections. Use the external `rediss://` URL only for local/external testing, with the appropriate IP access configured.
- Set the service's HTTP health-check path to `/health` if using HTTP health checks.

## Backend scripts

Run these from `backend/`:

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Compile the backend |
| `npm run lint` | Lint backend code |
| `npm run seed:dev` | Seed the development database with demo data |
| `npm run seed:prod` | Explicitly seed the configured production/demo database |
| `npm run prisma:studio:dev` | Open Prisma Studio for development |

Use the environment-specific Prisma scripts (`:dev` or `:prod`) to generate clients and manage migrations.

## Notes

- Keep `prisma`, `@prisma/client`, and `@prisma/adapter-pg` versions aligned.
- Use `redis://127.0.0.1:6379` for a local Redis service and `redis://redis:6379` inside Compose.
- Keep credentials and real environment files out of source control.

# Intellia360

AI-powered adaptive learning platform for primary school students.

**Stack:** Next.js 16 · Prisma 6 · MongoDB · TypeScript · Zod · Resend · Groq

---

## Repository layout

An npm-workspaces monorepo with a separate frontend and backend:

```
.
├── apps/
│   ├── frontend/             # the web app: pages and UI. Next.js static export → S3 + CloudFront
│   │   ├── src/              # app/ (routes), components/, context/, styles/, data/, lib/
│   │   ├── public/           # images, videos, pdf.js worker
│   │   ├── scripts/          # sync-curriculum, check-routes, fix-export-segments
│   │   ├── next.config.ts    # output: "export"
│   │   └── .env.example      # NEXT_PUBLIC_* only
│   └── backend/              # the API: Next.js Route Handlers (/api/*) → EC2 (PM2 + Nginx)
│       ├── src/app/api/      # every API route
│       ├── src/lib/          # auth, database, curriculum store, AI, audit
│       ├── src/data/grades/  # curriculum JSON (read and written at runtime by the editor)
│       ├── src/proxy.ts      # CORS for the frontend origin
│       ├── prisma/           # schema.prisma, seed.ts
│       ├── scripts/          # database backup / restore / maintenance
│       └── .env.example      # API secrets and settings
├── packages/
│   └── shared/               # used by both: role rules, lesson-module rules, streak badges, API types
├── deploy/                   # PM2, Nginx, deploy script, CloudWatch, CloudFront router + headers
├── docs/                     # runbooks, auth docs, product docs, reports
├── .github/workflows/        # frontend-deploy.yml, backend-deploy.yml, database-backup.yml
├── scripts/dev.mjs           # runs both apps for local development
├── docker-compose.yml        # local MongoDB
└── package.json              # workspace root
```

The frontend calls the API at `NEXT_PUBLIC_API_URL` (`apps/frontend/src/lib/api.ts`).
Both import `@intellia360/shared/...` for anything they must agree on.

---

## Prerequisites

- Node.js 22+ and npm 10+
- A MongoDB connection string (MongoDB Atlas free tier, or local via Docker, see below)

---

## Local development

Run everything from the repository root:

```bash
# 1. Install dependencies (all workspaces, one lockfile at the root)
npm install

# 2. Configure environment
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env.local
# Fill in apps/backend/.env (see Environment variables below)

# 3. Push the schema to MongoDB (also generates the Prisma client)
npm run prisma:push

# 4. (Optional) Seed demo data. Local databases only.
npm run seed

# 5. Start the API and the web app together
npm run dev
```

- Frontend: **http://localhost:3000**
- API: **http://localhost:4000**

`npm run dev:frontend` / `npm run dev:backend` start one of them.

### Production build

```bash
npm run build            # both apps
npm run build:backend    # prisma generate + next build (apps/backend/.next)
npm run build:frontend   # static export → apps/frontend/out
npm run start            # the API (next start on :4000)
```

The frontend has no server in production; `apps/frontend/out` is uploaded to S3.

---

## Environment variables

**Backend**: `apps/backend/.env`, template
[apps/backend/.env.example](apps/backend/.env.example). Read by Next.js, the
Prisma CLI, the seed and the `db:*` scripts. (`.env.local` also works, except
for the Prisma CLI.)

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | MongoDB connection string |
| `AUTH_JWT_SECRET` | ✅ | Secret used to sign session JWTs (min 32 chars; the API and its build refuse to start without it) |
| `AUTH_JWT_EXPIRES_IN` | — | JWT expiry (default `7d`) |
| `CORS_ORIGIN` | ✅ | Frontend origin(s) allowed to call the API, comma-separated (dev: `http://localhost:3000`) |
| `NEXT_PUBLIC_APP_URL` / `FRONTEND_URL` | — | Public URL of the **frontend**, used in email links |
| `ADMIN_EMAIL` / `ADMIN_NAME` / `ADMIN_PASSWORD` | — | Platform admin created by the seed or `POST /api/admin/seed-admin` |
| `RESEND_API_KEY` / `RESEND_FROM` | ✅ | Transactional email via Resend |
| `AUTH_REQUIRE_EMAIL_VERIFICATION` | — | `true` to require the emailed verification link |
| `GOOGLE_CLIENT_ID` | — | Google sign-in (verifies the ID token) |
| `GROQ_API_KEY` / `GROQ_MODEL` | — | AI tutor |
| `BACKUP_*`, retention variables | — | Backups, see [docs/DATABASE-BACKUP-RECOVERY.md](docs/DATABASE-BACKUP-RECOVERY.md) |

**Frontend**: `apps/frontend/.env.local`, template
[apps/frontend/.env.example](apps/frontend/.env.example). These values are
compiled into the browser bundle at build time, so they must not be secret.

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_API_URL` | Base URL of the API (dev `http://localhost:4000`, prod `https://api.yourdomain.com`) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google sign-in button (same client id as the backend's `GOOGLE_CLIENT_ID`) |

Never commit real values. `.gitignore` excludes every `.env*` file except the
`.env.example` templates.

---

## Local MongoDB with Docker

A `docker-compose.yml` is included. Start a local MongoDB 7 container with:

```bash
docker compose up -d
```

Then set:

```
DATABASE_URL="mongodb://root:example@localhost:27017/intellia360?authSource=admin"
```

---

## npm scripts

Run from the repository root. Extra arguments go after `--`.

| Script | What it does |
|---|---|
| `npm run dev` | API (:4000) + frontend (:3000) in development mode |
| `npm run dev:backend` / `dev:frontend` | One of them |
| `npm run build` | Production build of both apps |
| `npm run build:backend` / `build:frontend` | One of them |
| `npm run start` | Start the production API |
| `npm run typecheck` | TypeScript check of shared, backend and frontend |
| `npm run lint` | ESLint (both apps) |
| `npm run seed` | Seed the database via `prisma/seed.ts` (demo accounts, local only) |
| `npm run prisma:generate` / `prisma:push` / `prisma:migrate` | Prisma client and schema |
| `npm run db:backup` / `db:restore` / `db:verify-backup` | Database backup and restore |
| `npm run db:restore-curriculum` | Rehydrate `apps/backend/src/data/grades` from the database mirror |
| `npm run db:maintenance` | Retention sweep |
| `npm run db:indexes` | `prisma db push`: apply schema and indexes |
| `npm run check:routes -w @intellia360/frontend` | After `build:frontend`: verify the CloudFront router serves every exported page |

---

## Deployment (AWS)

```
Frontend:  Route 53 → CloudFront (ACM, router function, security headers) → S3 (apps/frontend/out)
API:       Route 53 → CloudFront (ACM, no caching) → EC2: Nginx → PM2 → next start (apps/backend) → MongoDB Atlas
```

- **Frontend CI/CD:** `.github/workflows/frontend-deploy.yml`. It builds the
  static export, verifies routing, syncs to S3, publishes the router function
  and invalidates CloudFront.
- **Backend CI/CD:** `.github/workflows/backend-deploy.yml`. It type-checks and
  builds, then runs `deploy/deploy.sh` on EC2 through SSM. Each release is built
  in its own directory, health-checked on `/api/health`, and rolled back
  automatically on failure.
- Both authenticate to AWS with GitHub OIDC; no AWS keys are stored.
- The frontend and API must share a parent domain (`yourdomain.com` +
  `api.yourdomain.com`) so the login cookie works.

The full one-time setup (S3, CloudFront, EC2, security groups, Atlas, ACM,
Route 53, IAM/OIDC, GitHub variables, CloudWatch) is in
**[docs/DEPLOYMENT-AWS.md](docs/DEPLOYMENT-AWS.md)**.

---

## Frontend structure (`apps/frontend/src`)

Every role's UI is a route group inside `src/app`.

```
src/
  app/
    (auth)/          # Login, register, forgot/reset password pages
    student/         # Student-facing pages (dashboard, courses, leaderboard, …)
    teacher/         # Teacher Console — see below
    admin/, editor/  # Admin console, content editor
  components/
    auth/            # Providers, RouteGuard (page access rules), SessionGuard
    teacher/         # Teacher Console shell, UI kit and modals
  context/
    AuthContext.tsx         # Session shared by the whole app (reads /api/auth/me)
    StudentContext.tsx
    TeacherDataContext.jsx  # Teacher Console data layer
  data/
    teacher/         # Teacher Console seed data
    grades/          # generated at build: copy of the backend's curriculum.json files
  lib/
    api.ts           # apiFetch / apiUrl — every call to the backend
    route-params.ts  # dynamic route ids ([id], …) in the static export
  styles/
    globals.css      # Tailwind entry — imports variables.css and teacher.css
    teacher.css      # Teacher Console design tokens (@theme) + component classes
```

## Backend structure (`apps/backend`)

```
src/
  app/api/           # Route Handlers: auth/, student/, teacher/, admin/, editor/, health/
  lib/
    auth/            # JWT, bcrypt hashing, sessions, rate limiting, email, Zod validation
    content/         # curriculum store (src/data/grades) and its MongoDB mirror
    db.ts            # Prisma client singleton
  data/grades/       # curriculum and lesson JSON per grade
  proxy.ts           # CORS + origin check for /api/*
prisma/
  schema.prisma      # MongoDB data models (User, StudentProfile, progress, etc.)
  seed.ts            # Database seed script
```

The API resolves `src/data/...` from its working directory, so it always runs
with `apps/backend` as its cwd. The root npm scripts and the PM2 config both do
this.

---

## Teacher Console

Reached at **`/teacher`** (which redirects to `/teacher/dashboard`). Signing in
as a `TEACHER` or `SCHOOL` account lands there automatically: `dashboardFor()`
in `packages/shared/src/auth/roles.ts` decides, and the frontend's `RouteGuard`
(`apps/frontend/src/components/auth/RouteGuard.tsx`) guards the routes.

| Route | Page |
|---|---|
| `/teacher/dashboard` | Command centre — class snapshot, engagement chart, AI quick actions, top performers |
| `/teacher/classes` | Roster cards with live average progress |
| `/teacher/classes/[id]` | One class — full roster, assignments, quick actions |
| `/teacher/students` | Searchable directory with a student profile drawer |
| `/teacher/lessons` | Curriculum browser by grade/chapter, with lesson creation |
| `/teacher/assignments` | Kanban board (Not Started → In Progress → Completed / Overdue) |
| `/teacher/reports` | Completion/engagement trends, per-class comparison, at-risk list |
| `/teacher/attendance` | Mark present/late/absent per class per day |
| `/teacher/rewards` | Badge catalog, XP/coin rules, class leaderboard |
| `/teacher/messages` | Threaded inbox with reply |
| `/teacher/ai-assistant` | Chat grounded in the live class data |
| `/teacher/resources` | Shared teaching materials |
| `/teacher/settings` | Profile, notification preferences, account |

`/teacher/analytics`, `/teacher/ai-planner` and `/teacher/profile` are kept as
redirects to `/teacher/reports`, `/teacher/ai-assistant` and `/teacher/settings`
so older links keep working.

**Data.** Identity comes from `AuthContext` (the real session) and roster
figures from `GET /api/teacher/me` when the signed-in teacher has classes in the
database. Everything else (lessons, assignments, attendance, messages) is
served by `TeacherDataContext` from `apps/frontend/src/data/teacher/mockData.js`
and persisted to `localStorage`, so the console is fully interactive before
those endpoints exist. To move a section onto the API, replace the matching
state in `TeacherDataContext.jsx` with fetches; the context shape is what the
pages use.

**Design.** Fraunces (display) + Inter (UI) + JetBrains Mono (data), loaded via
`next/font` in `apps/frontend/src/app/teacher/layout.tsx`. Colours and the
ledger-rule motif live in `apps/frontend/src/styles/teacher.css` as Tailwind v4
`@theme` tokens.

---

## Roles

Defined in `apps/backend/prisma/schema.prisma` as the `Role` enum:

| Role | Access |
|---|---|
| `STUDENT` | Student dashboard and learning pages |
| `PARENT` | Student dashboard (read-only view for parents) |
| `TEACHER` | Teacher dashboard, classes, analytics, assignments |
| `SCHOOL` | Same as TEACHER |
| `ADMIN` | All routes |

---

## Authentication

- Passwords hashed with **bcryptjs** (cost factor 12)
- Session cookies: `httpOnly`, `sameSite=lax`, `secure` in production. The API
  sets them; the frontend sends them with `credentials: "include"`. The two
  hosts must share a parent domain (e.g. `yourdomain.com` + `api.yourdomain.com`).
- JWT signed with `AUTH_JWT_SECRET` and verified by the API via `jose`. Pages
  are guarded in the browser by `RouteGuard`, and every API route authorizes
  each request itself.
- CORS: only the origins in `CORS_ORIGIN` may call the API with the cookie.
  State-changing requests from any other origin get 403.
- Password-reset tokens are single-use, expire in 1 hour, and are invalidated when a new one is requested
- Anti-enumeration: all auth responses that could reveal account existence return identical messages

---

## Documentation

| Document | Contents |
|---|---|
| [docs/DEPLOYMENT-AWS.md](docs/DEPLOYMENT-AWS.md) | AWS architecture, one-time setup, deploys, security checklist |
| [docs/DATABASE-BACKUP-RECOVERY.md](docs/DATABASE-BACKUP-RECOVERY.md) | Backups, restore drills, recovery scenarios |
| [docs/AUTHENTICATION_FLOW.md](docs/AUTHENTICATION_FLOW.md), [docs/AUTHENTICATION_AUDIT_REPORT.md](docs/AUTHENTICATION_AUDIT_REPORT.md), `docs/auth/` | Authentication design and audit |
| `docs/product/` | PRD and TRD |
| `docs/reports/` | QA and code-quality reports, functional gap analysis |
| `docs/reference/` | UI reference screenshots |
| `docs/implementation-plans/` | Implementation plans |
#   i n t e l l i a 3 6 0 t e s t  
 
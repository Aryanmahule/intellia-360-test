# Intellia360 — Code Quality Remediation Report

**Repository:** intellia360  
**Stack:** Next.js 16 + Prisma 6 (MongoDB)  
**Remediation date:** August 11, 2026  
**Based on:** Intellia360 Code Quality Report (prepared August 10, 2026)

---

## Executive Summary

All 7 issues identified in the original code quality report have been resolved in a single remediation pass. The codebase was verified with `npx tsc --noEmit` after every change — the TypeScript compiler exits clean (exit code 0) with no errors or warnings.

---

## Issues Resolved

### 1 — Bug: Concurrent-request failure in `forgot-password` route
**Severity:** MAJOR  
**Status:** ✅ Fixed

**File:** `src/app/api/auth/forgot-password/route.ts`

The route built a single `NextResponse` object at module scope (`GENERIC_RESPONSE`) and returned the same instance for every request. `Response` bodies are single-use streams; under concurrent traffic this produces "body already read" style failures on the second and subsequent requests that hit the shared instance.

**Change applied:**

```diff
- const GENERIC_RESPONSE = NextResponse.json<AuthResponse>(
-   { success: true, message: "If an account with that email exists..." },
-   { status: 200 }
- );
+ function genericResponse() {
+   return NextResponse.json<AuthResponse>(
+     { success: true, message: "If an account with that email exists..." },
+     { status: 200 }
+   );
+ }
```

Both return sites (`!user` early-return and post-email path) updated to call `genericResponse()`. Each concurrent request now receives its own fresh `Response` instance.

---

### 2 — Dead code: Entire NestJS backend
**Severity:** CRITICAL  
**Status:** ✅ Deleted

The following directories and files were confirmed to have **zero imports** from the live Next.js application. They served a superseded NestJS backend that was never wired into the running app (only the `nest:*` npm scripts referenced them, and those scripts were never invoked by `npm run dev/build/start`).

**Deleted (1,861 lines removed):**

| Path | Description |
|---|---|
| `src/auth/` | NestJS auth module (controller, service, guards, strategies, DTOs) |
| `src/users/` | NestJS users module (controller, service, DTOs) |
| `src/student/` | NestJS student module (controller, service, leaderboard controller, DTOs) |
| `src/teacher/` | NestJS teacher module (controller, service, DTOs) |
| `src/common/` | Shared NestJS code (decorators, guards, filters, interceptors, enums, interfaces) |
| `src/database/` | NestJS `PrismaModule` and `PrismaService` |
| `src/config/` | NestJS config loader (with hardcoded `JWT_SECRET` fallback) and env validator |
| `src/main.ts` | NestJS bootstrap entry point |
| `src/app.module.ts` | Root NestJS module |
| `src/app.controller.ts` | NestJS root controller (`GET /`, `GET /health`) |
| `nest-cli.json` | NestJS CLI configuration |

The live app's auth system (`src/app/api/auth/`, `src/lib/auth/`, `src/lib/db.ts`) was unaffected — it was already independent of the deleted code.

---

### 3 — Dead code: Orphaned Express/Mongoose server
**Severity:** MAJOR  
**Status:** ✅ Deleted

**File deleted:** `server.js`

This was a standalone Express + Mongoose server (health check, graceful shutdown, retry logic) at the repo root. It was not referenced by any npm script and could not run as-is because its dependencies (`express`, `mongoose`, `cors`) were not listed in `package.json`. It was left over from a pre-NestJS architectural phase.

---

### 4 — Duplicate and dead dependencies
**Severity:** MINOR  
**Status:** ✅ Cleaned

**File:** `package.json`

The package.json merged two full backend dependency sets. The following were removed:

**NestJS framework (production):**  
`@nestjs/common`, `@nestjs/config`, `@nestjs/core`, `@nestjs/jwt`, `@nestjs/mapped-types`, `@nestjs/passport`, `@nestjs/platform-express`, `@nestjs/swagger`, `class-transformer`, `class-validator`, `passport`, `passport-jwt`, `reflect-metadata`, `rxjs`

**Duplicate password hashing:**  
`bcrypt`, `@types/bcrypt` — removed (the live Next.js code uses `bcryptjs`; `bcrypt` was only used by the deleted NestJS auth service)

**NestJS devDependencies:**  
`@nestjs/cli`, `@nestjs/schematics`, `@nestjs/testing`, `@types/express`, `ts-loader`, `tsconfig-paths`, `source-map-support`

**Dead npm scripts removed:**  
`nest:build`, `nest:start`, `nest:dev`, `nest:prod`

**Result:** `dependencies` shrank from 27 packages to 13. The live stack retains exactly what it needs: `next`, `react`, `react-dom`, `@prisma/client`, `bcryptjs`, `jose`, `jsonwebtoken`, `resend`, `uuid`, `zod`, and their types.

---

### 5 — `any` types in live Next.js code
**Severity:** MINOR  
**Status:** ✅ Fixed

All `any` usages in the live (non-deleted) codebase were eliminated. Changes by file:

**`src/context/StudentContext.tsx`**
- `heroSlide?: any` → replaced with a typed `HeroSlide` interface (`tag?`, `subtitle?`, `visualizerKey?`, `visualizerData?: Record<string, unknown>`)
- `actionCards?: any` → replaced with a typed `ActionCards` interface (keyed activity-type strings)
- `(c: any) => c.topics` → `(c: CurriculumChapter) => c.topics`
- `(t: any) => t.id === prev` → `(t: CurriculumTopic) => t.id === prev`

**`src/app/student/dashboard/page.tsx`**
- `handleHeroCtaClick(slide: any)` → `handleHeroCtaClick(slide: HeroSlideWithActivity, _slideIndex?: number)` using a local typed interface
- `handleCardClick(card: any)` → `handleCardClick(card: ExtendedActionCard)` using a local typed interface
- `slides={heroSlides as any}` → `slides={heroSlides}` (cast removed; see types/student.ts change below)
- `cards={mappedCards as any}` → `cards={mappedCards}` (cast removed)
- `buttonColor: "purple"` etc. → `buttonColor: "purple" as const` (all four cards) to preserve the union literal type

**`src/types/student.ts`**
- `DashboardHeroSlide.visualizerData: Record<string, any>` → `Record<string, unknown>`
- `AdventureSlide.visualizerData: Record<string, any>` → `Record<string, unknown>`
- `LessonMetadata.heroVisualizerData: Record<string, any>` → `Record<string, unknown>`
- `DashboardHeroSlide.lessonId` made optional (was `string`, dashboard does not always supply it)
- `DashboardHeroSlide.visualizerKey` widened from the `VisualizerKey` enum to `string` (dashboard uses arbitrary keys for dynamic scene routing)
- Added optional activity-tracking fields (`activityType?`, `xpReward?`, `gemsReward?`) so the dashboard's slide objects satisfy the type without casting

**`src/components/student/HeroSectionContainer.tsx`**
- `visualizerData` values cast to `number` before arithmetic (`as number`) — required after `Record<string, any>` → `Record<string, unknown>` tightening

**`src/components/student/LearningGridContainer.tsx`**
- Removed the dynamic `Wrapper = isExternal ? "a" : Link` pattern that required `{...props as any}`. Replaced with an explicit branch: external links render an `<a>` tag with explicit props; internal links render `<Link>` with explicit `href`. The shared content is extracted into an `inner` variable to avoid duplication.

---

### 6 — Stale artifact: docker-compose.yml (Postgres vs MongoDB)
**Severity:** MAJOR  
**Status:** ✅ Replaced

The original `docker-compose.yml` started a PostgreSQL 16 container. The application uses `prisma/schema.prisma` with `provider = "mongodb"` — Postgres provides no usable database for this app.

**Replaced with** a MongoDB 7 container on port 27017, aligned with the actual datasource. Connection string to use with the new container:

```
DATABASE_URL="mongodb://root:example@localhost:27017/intellia360?authSource=admin"
```

---

### 7 — Stale artifact: README.md (NestJS/TypeORM/Postgres documentation)
**Severity:** MAJOR  
**Status:** ✅ Rewritten

The original README documented the Phase 1 NestJS + TypeORM + PostgreSQL API — an architecture that no longer exists in the codebase. It referenced Swagger at `/api/docs`, NestJS endpoints, TypeORM auto-sync, and `docker compose up` for Postgres.

**Replaced with** documentation that accurately describes the current stack:
- Setup steps: `npm install` → `.env.local` → `prisma generate && db push` → `npm run dev`
- All required environment variables with descriptions
- Correct npm scripts (Next.js only, no `nest:*`)
- Accurate project structure (`src/app/`, `src/lib/`, `prisma/`)
- Role table matching the actual `Role` enum in `prisma/schema.prisma` (ADMIN, STUDENT, PARENT, TEACHER, SCHOOL — no "coach")
- Authentication behavior (bcryptjs, httpOnly cookies, JWT, anti-enumeration)

---

## Verification

```
npx tsc --noEmit
```

Exit code: **0** — no type errors across the entire codebase after all changes.

---

## Issues Not Addressed (Out of Scope / Runtime Required)

The following items from the original report were noted but could not be addressed in this static pass:

| Item | Reason deferred |
|---|---|
| Student progress lives only in `localStorage` (no Prisma sync) | Requires building new API routes and migrating state management — a feature-level task, not a bug fix |
| 15 of 16 student/teacher pages are empty scaffolds | Product work, not a code quality fix |
| `npx prisma validate`, `next lint` audit | Requires `npm install` with a live network connection |
| End-to-end runtime testing | Requires a MongoDB connection string and live environment |

---

## File Change Summary

| File | Action |
|---|---|
| `src/app/api/auth/forgot-password/route.ts` | Modified — `GENERIC_RESPONSE` → `genericResponse()` |
| `src/auth/` | Deleted |
| `src/users/` | Deleted |
| `src/student/` (NestJS module) | Deleted |
| `src/teacher/` (NestJS module) | Deleted |
| `src/common/` | Deleted |
| `src/database/` | Deleted |
| `src/config/` | Deleted |
| `src/main.ts` | Deleted |
| `src/app.module.ts` | Deleted |
| `src/app.controller.ts` | Deleted |
| `nest-cli.json` | Deleted |
| `server.js` | Deleted |
| `package.json` | Modified — removed 21 dead packages and 4 dead scripts |
| `src/context/StudentContext.tsx` | Modified — replaced 4 `any` usages with typed interfaces |
| `src/app/student/dashboard/page.tsx` | Modified — replaced 4 `any` usages with typed interfaces and `as const` |
| `src/types/student.ts` | Modified — tightened `Record<string, any>` → `Record<string, unknown>` (×3), widened `DashboardHeroSlide` |
| `src/components/student/HeroSectionContainer.tsx` | Modified — added numeric casts for `visualizerData` arithmetic |
| `src/components/student/LearningGridContainer.tsx` | Modified — replaced dynamic `Wrapper` pattern with explicit `<a>`/`<Link>` branches |
| `docker-compose.yml` | Replaced — Postgres 16 → MongoDB 7 |
| `README.md` | Replaced — NestJS/Postgres docs → Next.js/Prisma/MongoDB docs |

# Intellia360 Authentication Audit Report

**Date:** 2026-09-04
**Branch:** `db-backup-recovery`
**Scope:** registration, login, email verification, session handling, role-based access control
**Trigger:** "Validation failed" on the signup form with the Editor role selected

---

## Executive Summary

The reported failure was **not** a role problem. `EDITOR` is a valid, correctly
wired value at every layer. The signup request was rejected because the
**password did not satisfy the server's complexity rule**, and the UI discarded
the field-level reason the API had returned — rendering only the generic
top-level `"Validation failed"`.

Two things made this invisible to the user:

- The API returns `{ message: "Validation failed", errors: { password: [...] } }`.
  The register page rendered `message` and dropped `errors`.
- The on-screen hint read "Use 8+ characters with a mix of letters, numbers &
  symbols" — advisory phrasing for a rule that is actually mandatory, with no
  client-side check to catch it before the round trip.

Confirmed against the live database: the account from the screenshot was never
created, so the request genuinely failed validation rather than failing later.

Three further defects were found while tracing the flow, one of which broke
Editor sign-ups specifically:

| # | Severity | Defect |
| --- | --- | --- |
| 1 | High | Field-level validation errors discarded by the UI (the reported symptom) |
| 2 | High | TEACHER / SCHOOL / EDITOR sign-ups created a STUDENT-role account **with no `studentProfile`** |
| 3 | High | Email never normalised — mixed-case addresses produced unloggable-into and duplicate accounts |
| 4 | Medium | `/api/auth/register` had no rate limit, unlike every other auth endpoint |
| 5 | Medium | Verification-email delivery failures were swallowed; the UI still said "check your inbox" |
| 6 | Low | Role lists duplicated across five files; editor-created users bypassed the shared password rules |

All six are fixed. **110 automated end-to-end checks pass, 0 fail.**

---

## Current Architecture

Single Next.js 16 application; there is no separate backend service.

| Concern | Implementation |
| --- | --- |
| Framework | Next.js 16.2.12 App Router (Turbopack) |
| API | Route Handlers, `src/app/api/**/route.ts` |
| Edge guard | `src/proxy.ts` (Next.js 16's renamed `middleware.ts`) |
| Database | MongoDB via Prisma 6, `src/lib/db.ts` |
| Validation | Zod 4.4.3 |
| Sessions | Stateless HS256 JWT (`jose`) in an HttpOnly cookie |
| Hashing | bcryptjs, cost 12 |
| Email | Resend |

Full detail in [`AUTHENTICATION_FLOW.md`](./AUTHENTICATION_FLOW.md).

---

## Registration Flow

`POST /api/auth/register`, `Content-Type: application/json`, no auth header, no
CSRF token, same-origin (no CORS layer).

```json
{
  "name": "Samm",
  "email": "user@example.com",
  "password": "…",
  "confirmPassword": "…",
  "requestedRole": "EDITOR",
  "agreeToTerms": true
}
```

Server sequence:

```
IP rate limit (10/hour)
  → RegisterSchema.safeParse     ← 422 with per-field errors
  → duplicate email check        ← 409
  → bcrypt.hash(password, 12)
  → generate raw token, store SHA-256
  → transaction: user (role=STUDENT, requestedRole=<intent>)
                 + studentProfile (always)
                 + teacherProfile (TEACHER/SCHOOL intent)
                 + emailVerificationToken
  → send verification email (failure reported, not fatal)
  → 201 { userId, emailSent }
```

No session cookie is issued; the account is unusable until the email is verified.

---

## Login Flow

`POST /api/auth/login` → IP rate limit → schema (email trimmed + lowercased) →
per-email rate limit → user lookup → `bcrypt.compare` (always executed, against
a fixed dummy hash when the email is unknown) → soft-delete gate → email-verified
gate → sign JWT → `Set-Cookie: intellia_session` (HttpOnly, SameSite=Lax) → 200.

---

## Role-Based Access Control

Roles are SCREAMING_CASE everywhere and now come from one module,
`src/lib/auth/roles.ts`.

Every account is created as `STUDENT`; the picker on the signup form only sets
`requestedRole`. An admin promotes via `PATCH /api/admin/users/[userId]/role`.

Two independent enforcement layers:

- **`src/proxy.ts`** guards *page* routes at the edge and redirects. Its matcher
  excludes `/api/`, so it is UX routing, not the security boundary.
- **Per-request guards** inside each API handler are the real boundary:
  `requireStudentSession` (STUDENT, PARENT, ADMIN), `requireEditorSession`
  (EDITOR, ADMIN), `requireAdminSession` (ADMIN). 401 without a session, 403 with
  the wrong role.

---

## Root Cause of the "Validation Failed" Issue

**Exact cause:** the submitted password failed `PasswordSchema`'s complexity
rules — it lacked a special character (or a number). The API returned the
precise reason; the UI threw it away.

| | |
| --- | --- |
| **Affected API** | `POST /api/auth/register` |
| **Rejecting code** | `RegisterSchema` in `src/lib/auth/validation.ts` — `.regex(/[^A-Za-z0-9]/, "Password must contain at least one special character")` |
| **Response** | `422 { success:false, message:"Validation failed", errors:{ password:["Password must contain at least one special character"] } }` |
| **Swallowing code** | `handleSubmit` in `src/app/(auth)/register/page.tsx` — `setError(result.message)`, ignoring `result.errors` |
| **Misleading copy** | the hint "Use 8+ characters with a mix of letters, numbers & symbols" reads as a suggestion, not a requirement |
| **Why it failed** | frontend and backend agreed on the rule; only the *reporting* was broken, so the user had no way to learn which field was wrong |

Reproduced directly against the running server:

```
password "Password123456" (14 chars, no symbol)
  → 422 {"message":"Validation failed",
         "errors":{"password":["Password must contain at least one special character"]}}

password "passwordabc!@#" (14 chars, no digit)
  → 422 {"errors":{"password":["Password must contain at least one number"]}}
```

### The Editor role was ruled out, with evidence

`EDITOR` is consistent across every layer — Prisma `enum Role`, the `UserRole`
TypeScript union, the Zod `requestedRole` enum, the signup UI, `proxy.ts`, and
`requireEditorSession`. A clean payload with `"requestedRole":"EDITOR"` returned
**201 Created**. The candidate mismatches listed in the brief were each checked
and ruled out:

| Checked | Result |
| --- | --- |
| Frontend sends `"Editor"` / `"editor"` / `"content_editor"` | No — the picker's value is the literal `"EDITOR"` |
| Backend role enum missing EDITOR | No — present in Zod, Prisma, TS union, guards |
| Database enum rejects EDITOR | No — `enum Role` includes it; `requestedRole` column exists |
| Payload shape differs from the schema | No — all six fields match; extra keys are permitted |
| Email rejected | No — valid format, and the address was absent from the database |
| Name rejected | No — "Samm" satisfies `min(2)` |
| Missing hidden required field | No — `confirmPassword` and `agreeToTerms` were both sent |
| API error mis-converted into "Validation failed" | Partly — the string was correct, but the accompanying `errors` object was dropped by the UI |
| Authorization middleware rejects EDITOR | No — `requireEditorSession` allows EDITOR and ADMIN |

**But a real Editor-specific defect did exist**, one step later — see fix #2.

---

## Fix Implemented

### New file

**`src/lib/auth/roles.ts`** — single source of truth for role strings:
`ALL_ROLES`, `REGISTRABLE_ROLES` (ADMIN excluded), `DEFAULT_ROLE`, and
`dashboardFor(role)`. `ALL_ROLES` is `satisfies readonly UserRole[]`, so adding
a role to the Prisma enum without updating the TypeScript union is a compile
error.

### Changed files

| File | Change | Why |
| --- | --- | --- |
| `src/app/(auth)/register/page.tsx` | Per-field error state; each input gets `aria-invalid`, `aria-describedby` and a `.auth-field-error` message; banner reads "Please check the highlighted fields below."; client `validate()` mirrors the server schema and lists every failing password rule; password hint reworded to state the real requirement; role options derived from `REGISTRABLE_ROLES` | **Fix #1** — the reported symptom. The reason for a rejection is now attached to the field that caused it |
| `src/app/api/auth/register/route.ts` | `studentProfile` is now created **always**, keyed off the assigned role rather than `requestedRole`; `teacherProfile` still added for TEACHER/SCHOOL intent | **Fix #2** — the old branch created no `studentProfile` for EDITOR (and only a `teacherProfile` for TEACHER/SCHOOL), while the account's actual role was STUDENT. Every such account was an orphan with a broken student dashboard. Confirmed in the live database: the one EDITOR sign-up present was the only STUDENT-role user with no profile |
| `src/lib/auth/validation.ts` | Email `trim().toLowerCase()` before format validation, in Register, Login and ForgotPassword; name `trim()` before `min(2)`; `passwordSchema` exported as `PasswordSchema`; role enum sourced from `REGISTRABLE_ROLES`; removed a dead `import { Role } from "@prisma/client"` | **Fix #3** — MongoDB's unique index is case-sensitive, so `Sam@Gmail.com` created an account that a lowercase login could never find, and a near-duplicate row was allowed. Also, a name of two spaces passed `min(2)` |
| `src/app/api/auth/register/route.ts` | Added IP rate limit, 10 sign-ups/hour, before parsing or any DB work | **Fix #4** — the only auth endpoint without one; also stopped it being usable to send verification email to arbitrary addresses |
| `src/app/api/auth/register/route.ts` | Response now carries `data.emailSent`; the message changes when delivery failed; only the error *message* is logged | **Fix #5** — Resend failures were silently swallowed while the UI said "Check your inbox", stranding users who could then never verify or log in |
| `src/app/(auth)/register/page.tsx` | Confirmation screen renders a distinct state when `emailSent === false`, pointing at Resend verification | **Fix #5** |
| `src/context/AuthContext.tsx` | `register()` returns a typed `RegisterResult` including `emailSent`; local `getDashboardPath` replaced by the shared `dashboardFor` | Fixes #5, #6 |
| `src/proxy.ts` | Dropped its private `Role` type and duplicate `dashboardFor`; imports both from the shared modules | **Fix #6** — three copies of the same redirect table |
| `src/app/api/admin/users/[userId]/role/route.ts` | `z.enum(ALL_ROLES)` | **Fix #6** |
| `src/app/api/editor/users/route.ts` | `z.enum(ALL_ROLES)`; password now uses the shared `PasswordSchema`; email trimmed + lowercased; name trimmed | **Fix #6** — this endpoint accepted `min(8)` with no complexity rules and un-normalised emails, so an editor could create an account weaker than the signup form allows, or one its owner could not log into |
| `src/app/editor/users/page.tsx` | Role list from `ALL_ROLES` | **Fix #6** |
| `src/lib/student/require-student-session.ts` | `readonly UserRole[]` | Prevents accidental mutation of the allow-list |
| `src/styles/auth.css` | Added `.auth-input.has-error` | Red border for invalid inputs; matches the existing `.auth-field-error` style that was defined but never used |

Nothing was masked: no validation was removed or weakened, no role check
loosened, no security gate bypassed, no credential hardcoded. Password rules,
the verified-email gate, the STUDENT-default policy and every role guard are
unchanged in strictness — three of them are now enforced in *more* places than
before.

---

## Validation Matrix

All results produced by driving the running application over HTTP and reading
the resulting database rows with Prisma. 110 checks, 0 failures.

### Registration → database → verify → login → RBAC

| Test | Student | Teacher | Parent | School | Editor |
| --- | --- | --- | --- | --- | --- |
| Registration returns 201 | PASS | PASS | PASS | PASS | PASS |
| User row created | PASS | PASS | PASS | PASS | PASS |
| Role forced to STUDENT | PASS | PASS | PASS | PASS | PASS |
| `requestedRole` recorded | PASS | PASS | PASS | PASS | PASS |
| `studentProfile` created *(fix #2)* | PASS | PASS | PASS | PASS | PASS |
| `teacherProfile` created | n/a | PASS | n/a | PASS | n/a |
| Password stored as bcrypt hash | PASS | PASS | PASS | PASS | PASS |
| `emailVerified` starts false | PASS | PASS | PASS | PASS | PASS |
| Login blocked before verification | PASS | PASS | PASS | PASS | PASS |
| Verify-email issues a session | PASS | PASS | PASS | PASS | PASS |
| Verification token cannot be replayed | PASS | PASS | PASS | PASS | PASS |
| Login with UPPERCASE email *(fix #3)* | PASS | PASS | PASS | PASS | PASS |
| Session cookie is HttpOnly | PASS | PASS | PASS | PASS | PASS |
| JWT carries the correct role | PASS | PASS | PASS | PASS | PASS |
| `/api/auth/me` returns the user | PASS | PASS | PASS | PASS | PASS |
| Student dashboard API works *(fix #2)* | PASS | PASS | PASS | PASS | PASS |
| Editor API forbidden while role=STUDENT | PASS | PASS | PASS | PASS | PASS |

### Negative validation

| Test | Result |
| --- | --- |
| Invalid email → 422 `errors.email` | PASS |
| Password under 8 characters → 422 `errors.password` | PASS |
| Password with no symbol → 422 `errors.password` | PASS |
| Password with no number → 422 `errors.password` | PASS |
| Empty name → 422 `errors.name` | PASS |
| Whitespace-only name → 422 `errors.name` *(fix #3)* | PASS |
| Password mismatch → 422 `errors.confirmPassword` | PASS |
| Terms not accepted → 422 `errors.agreeToTerms` | PASS |
| `"Editor"` (wrong case) → 422 `errors.requestedRole` | PASS |
| `"SUPERADMIN"` → 422 `errors.requestedRole` | PASS |
| `"ADMIN"` self-assignment → 422 `errors.requestedRole` | PASS |
| Mixed-case padded email accepted and stored normalised | PASS |
| Duplicate email in different case → 409 | PASS |
| Exact duplicate email → 409 | PASS |
| Register rate limit returns 429 *(fix #4)* | PASS |

### Authentication and authorization

| Test | Result |
| --- | --- |
| Wrong password → 401 | PASS |
| Unknown user → 401 with an identical message (no enumeration) | PASS |
| Protected API with no token → 401 | PASS |
| Protected API with a malformed token → 401 | PASS |
| Protected API with an expired token → 401 | PASS |
| Token signed with the wrong secret → rejected | PASS |
| Admin logs in, JWT carries `role=ADMIN` | PASS |
| Admin promotes an account to EDITOR via the real API | PASS |
| Promoted user logs in, JWT carries `role=EDITOR` | PASS |
| EDITOR reaches `/api/editor/stats` | PASS |
| EDITOR blocked from the student API (403) | PASS |
| EDITOR blocked from the admin API (403) | PASS |
| Logout clears the session cookie | PASS |
| Unauthenticated `/student/dashboard` → redirect to `/login?next=…` | PASS |
| Unauthenticated `/editor/dashboard` → redirect to `/login?next=…` | PASS |

Test accounts were removed afterwards; the database is back to its
pre-audit state, with **0** STUDENT-role users lacking a `studentProfile`.

Build verification: `npx tsc --noEmit` clean, `npx eslint` clean on all changed
files (one pre-existing unused-import warning), `npx next build` succeeds
including the Proxy (Middleware) bundle.

---

## Security Review

| Area | Assessment |
| --- | --- |
| Password storage | Good — bcryptjs cost 12, never logged, never returned |
| Password policy | Good, and now uniformly enforced; the editor user-creation endpoint no longer accepts a weaker password |
| Privilege escalation | Good — role is server-assigned, ADMIN is absent from `REGISTRABLE_ROLES`, and a forged `requestedRole` cannot change the created role |
| Session security | Good — HttpOnly, SameSite=Lax, Secure in production, nothing in `localStorage` |
| JWT | Good — HS256 via `jose`, hard startup failure on a missing or short secret, wrong-secret tokens rejected |
| Token hygiene | Good — verification and reset tokens stored as SHA-256, single-use, TTL-bounded |
| User enumeration | Good — constant-time-ish login, identical failure messages, generic forgot-password and resend responses |
| Rate limiting | Good — DB-backed so it holds across instances; registration now covered; identifiers hashed; fails open by design |
| Input validation | Good — Zod on every auth endpoint, with normalisation before persistence |
| Authorization | Good — API guards are independent of the Edge proxy, so a proxy misconfiguration cannot expose an API |
| Secret management | Good — environment only, `.env*` gitignored |
| Logging | Good — messages only; the register handler was tightened to log `error.message` rather than the error object |
| Bootstrap endpoint | **Weak** — `/api/admin/seed-admin` is unauthenticated with a hardcoded password. It self-disables once an admin exists (currently returns 410), but should be deleted |
| Session revocation | **Absent** — stateless tokens cannot be invalidated before `exp` |

---

## Potential Risks

1. **No token revocation.** Deactivating or demoting a user does not end their
   current session; the change lands on their next login. Acceptable for
   stateless JWT, but it should be a conscious decision.
2. **Email deliverability is a hard dependency.** Login is gated on
   `emailVerified`, so with `RESEND_FROM` still pointing at the sandbox sender
   `onboarding@resend.dev`, every user other than the Resend account owner is
   blocked from logging in. The API now reports this honestly instead of
   claiming the mail was sent, but it remains a launch blocker.
3. **`seed-admin` is still present** and creates a well-known credential.
4. **Rate limiting fails open.** Correct for availability, but a database
   outage removes brute-force protection.
5. **Prisma enum drift.** `enum Role` in the schema and `UserRole` in TypeScript
   are still linked by convention. `ALL_ROLES` catches TS drift at compile time,
   but nothing catches a role added to Prisma alone.

---

## Recommendations

Before production:

1. Delete `src/app/api/admin/seed-admin/route.ts` and rotate
   `admin@intellia.dev`'s password.
2. Configure a verified Resend sending domain and set `RESEND_FROM` to it.
3. Remove the three empty directories under `src/app/api/admin/`.

Worth doing soon:

4. Surface field-level errors on the login and reset-password pages the same way
   the register page now does.
5. Add a `sessionVersion` integer to `User`, include it in the JWT, and reject
   tokens whose version is stale — giving real logout-everywhere and immediate
   effect for deactivation and demotion.
6. Add a small automated test suite for the auth flow. The 110-check matrix above
   is reproducible and would make a good starting point.
7. Audit `/api/auth/google`, which this review did not cover.
8. Confirm that `/api/student/edunotes` and `/api/student/leaderboard` are
   intentionally public.

---

## Final Status

**PASS**

The reported "Validation failed" is resolved: the API's field-level reason now
reaches the user, and the client checks the same rules before submitting, so the
failure is explained at the password field instead of appearing as an
unexplained banner. Registration succeeds for all five selectable roles, and the
separate defect that left Editor, Teacher and School sign-ups with a broken
profile is fixed and verified. 110 end-to-end checks pass with none failing;
type-check, lint and production build are all clean.

Two items from the Recommendations list — the `seed-admin` bootstrap route and
the sandbox email sender — should be closed before this goes to production.

# Authentication & Login --- Technical Plan

**Status:** Proposed\
**Scope:** Authentication for the existing application

------------------------------------------------------------------------

## 1. Goal

Build a secure and maintainable authentication system containing:

-   Login
-   Registration
-   Logout
-   Password reset
-   Protected routes
-   Role-based access

------------------------------------------------------------------------

## 2. Architecture Decision

> **Implement authentication inside the existing repository as a
> dedicated module.**

Do **not** create a separate repository just for login/authentication
unless multiple independent company applications need the same
authentication service.

### Recommended

``` text
Existing Repository
│
├── Frontend
│   └── Auth UI
│
├── Backend
│   └── Auth Module
│
└── Database
    └── User Data
```

### Future option

If the company later has multiple applications:

``` text
             Auth Service
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      Web App  Admin App  Mobile App
```

------------------------------------------------------------------------

## 3. Repository & Git Workflow

Create a feature branch from the existing project.

``` text
main
  │
  └── develop
        │
        └── feature/authentication
```

Workflow:

``` text
Pull latest code
      ↓
Create feature/authentication
      ↓
Implement
      ↓
Test
      ↓
Pull Request
      ↓
Code Review
      ↓
Merge
```

> **Do not develop directly on `main`.**

------------------------------------------------------------------------

## 4. Module Structure

Keep authentication isolated from the rest of the application.

``` text
auth/
├── controller
├── service
├── routes
├── middleware
├── validation
└── types
```

Frontend:

``` text
auth/
├── Login
├── Register
├── ForgotPassword
├── ResetPassword
└── ProtectedRoute
```

------------------------------------------------------------------------

## 5. Main Authentication Flow

``` text
Login Page
    ↓
POST /api/auth/login
    ↓
Validate Input
    ↓
Find User
    ↓
Verify Password
    ↓
Create Session
    ↓
Secure HTTP-only Cookie
    ↓
Access Protected Routes
```

------------------------------------------------------------------------

## 6. Main API Endpoints

``` http
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
GET  /api/auth/me

POST /api/auth/forgot-password
POST /api/auth/reset-password
POST /api/auth/change-password
```

Add email verification if required.

------------------------------------------------------------------------

## 7. User Model

Minimum user data:

``` text
User
├── id
├── name
├── email
├── passwordHash
├── role
├── isVerified
├── isActive
├── createdAt
└── updatedAt
```

> **Never store plaintext passwords.**

Use a strong password hashing algorithm such as **Argon2id** or
**bcrypt**.

------------------------------------------------------------------------

## 8. Authentication vs Authorization

### Authentication

> **Who is the user?**

Examples:

-   Login
-   Logout
-   Password verification
-   Session management

### Authorization

> **What can the user access?**

Examples:

``` text
SUPER_ADMIN
ADMIN
MANAGER
EMPLOYEE
USER
```

The backend must enforce permissions even if the frontend hides
restricted pages.

------------------------------------------------------------------------

## 9. Security Requirements

Minimum security requirements:

-   HTTPS in production
-   Strong password hashing
-   Secure HTTP-only cookies
-   Input validation
-   Rate limiting on login
-   Server-side authorization
-   Safe authentication error messages
-   CORS configuration
-   CSRF protection where applicable
-   Secrets stored in environment variables
-   No passwords/tokens in logs

Example:

``` env
DATABASE_URL=...
AUTH_SESSION_SECRET=...
FRONTEND_URL=...
```

Never commit real secrets to Git.

------------------------------------------------------------------------

## 10. Protected Routes

### Public

``` text
/login
/register
/forgot-password
/reset-password
```

### Protected

``` text
/dashboard
/profile
/settings
/projects
```

### Role-based

``` text
/admin → ADMIN / SUPER_ADMIN
```

> Frontend route protection is not enough. Backend APIs must also verify
> authentication and authorization.

------------------------------------------------------------------------

## 11. Testing

### Unit Tests

-   Password hashing
-   Validation
-   Permission checks

### Integration Tests

-   Register
-   Login
-   Logout
-   Current user
-   Protected API
-   Password reset

### E2E Test

``` text
Login
 ↓
Dashboard
 ↓
Refresh
 ↓
Session remains valid
 ↓
Logout
 ↓
Protected page blocked
```

------------------------------------------------------------------------

## 12. Definition of Done

Authentication is ready when:

-   [ ] Login works
-   [ ] Registration works
-   [ ] Logout works
-   [ ] Passwords are securely hashed
-   [ ] Protected routes work
-   [ ] Roles/permissions work
-   [ ] Password reset works
-   [ ] Rate limiting is enabled
-   [ ] Validation is implemented
-   [ ] Tests pass
-   [ ] Secrets are protected
-   [ ] Code review is completed

------------------------------------------------------------------------

## 13. Final Decision

> **Use the existing repository and build authentication as a dedicated
> module.**

The implementation should be:

**Modular → Secure → Simple → Testable → Scalable**

A standalone authentication service should only be introduced when the
company has a genuine need for shared authentication across multiple
independent applications.

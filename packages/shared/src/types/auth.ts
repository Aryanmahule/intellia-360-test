// ─── User Roles (aligned with Prisma Role enum) ───────────────────────────────
export type UserRole =
  | "ADMIN"
  | "STUDENT"
  | "PARENT"
  | "TEACHER"
  | "SCHOOL"
  | "EDITOR";

// ─── Core User Model ──────────────────────────────────────────────────────────
export interface AuthUser {
  id:            string;
  name:          string;
  email:         string;
  role:          UserRole;
  emailVerified: boolean;
  /** Role asked for at sign-up that an administrator has not approved yet. */
  requestedRole?: UserRole | null;
  createdAt:     string;
  updatedAt:     string;
}

// ─── Session stored in JWT payload ────────────────────────────────────────────
export interface JWTPayload {
  sub: string;    // user id
  email: string;
  role: UserRole;
  name: string;
  iat?: number;
  exp?: number;
}

// ─── Auth Session (decoded, enriched) ────────────────────────────────────────
export interface AuthSession {
  user: AuthUser;
  token: string;
  expiresAt: number;
}

// ─── Input DTOs ───────────────────────────────────────────────────────────────
export interface LoginInput {
  emailOrUsername: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterInput {
  name:          string;
  email:         string;
  password:      string;
  confirmPassword: string;
  requestedRole?: string;   // intent only — server always creates STUDENT
  grade?:        string;    // optional grade hint for student profile
  agreeToTerms:  boolean;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
  confirmPassword: string;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

// ─── API Response Shapes ─────────────────────────────────────────────────────
export interface AuthResponse<T = undefined> {
  success: boolean;
  message: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PasswordResetToken {
  id:        string;
  userId:    string;
  tokenHash: string;   // SHA-256 of the raw token — never the raw token itself
  expiresAt: Date;
  used:      boolean;
}

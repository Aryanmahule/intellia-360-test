import { z } from "zod";
import { REGISTRABLE_ROLES, DEFAULT_ROLE } from "@intellia360/shared/auth/roles";

/**
 * Email normalisation.
 *
 * Trim + lowercase BEFORE the format check so the value that is validated is
 * the exact value written to (and later looked up in) the database. Without
 * this, "  Sam@Gmail.com " registers as a distinct account that can never be
 * found by a lowercase login or resend-verification lookup.
 */
const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address");

/**
 * Password rules. Exported so every path that creates an account (self
 * registration, admin/editor user creation, password reset) enforces the same
 * minimum, rather than each re-declaring a weaker `min(8)`.
 */
export const PasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

export const LoginSchema = z.object({
  // Accounts are keyed by email only (there is no username column), so the
  // same normalisation as registration must be applied or a mixed-case login
  // will never match the stored row.
  emailOrUsername: z.string().trim().toLowerCase().min(1, "Email is required"),
  password: z.string().min(1, "Password is required"),
  rememberMe: z.boolean().optional().default(false),
});

export const RegisterSchema = z
  .object({
    // .trim() first so a name of only spaces cannot satisfy min(2).
    name:  z.string().trim().min(2, "Full name must be at least 2 characters"),
    email: emailSchema,
    password: PasswordSchema,
    confirmPassword: z.string(),
    // Role submitted here is treated as intent only — the server always
    // creates the account as STUDENT. ADMIN is not a valid intent choice.
    requestedRole: z
      .enum(REGISTRABLE_ROLES)
      .optional()
      .default(DEFAULT_ROLE),
    // Optional grade hint — used to pre-set the student profile grade
    grade: z.string().optional(),
    // Optional profile hints — used to pre-set student/teacher profile fields
    school: z.string().optional(),
    subject: z.string().optional(),
    agreeToTerms: z.literal(true, {
      error: () => ({ message: "You must agree to the Terms of Service" }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ForgotPasswordSchema = z.object({
  email: emailSchema,
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: PasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;
export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

// Central re-export for the auth library — import from "@/lib/auth"
export { hashPassword, verifyPassword } from "./hash";
export { signToken, verifyToken, decodeToken } from "./jwt";
export { setSessionCookie, clearSessionCookie, getSession, SESSION_COOKIE } from "./session";
export { sendPasswordResetEmail } from "./email";
export {
  LoginSchema,
  RegisterSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
  ChangePasswordSchema,
} from "./validation";

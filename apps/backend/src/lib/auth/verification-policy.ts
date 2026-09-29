/**
 * Email verification policy.
 *
 * An emailed verification link only works once the sender domain is verified
 * with the email provider (RESEND_FROM) and NEXT_PUBLIC_APP_URL points at the
 * public site. Until then most people never receive the link, and an
 * unverified account cannot sign in at all.
 *
 * So by default an account is verified the moment it is created, and an
 * existing unverified account is verified when its owner signs in with the
 * correct password — sign-up and sign-in both complete in a few seconds.
 *
 * Set AUTH_REQUIRE_EMAIL_VERIFICATION=true to require the emailed link again.
 *
 * Role requests (Teacher, School, Editor) are unaffected: they still need an
 * administrator's approval.
 */
export function requireEmailVerification(): boolean {
  return process.env.AUTH_REQUIRE_EMAIL_VERIFICATION?.trim().toLowerCase() === "true";
}

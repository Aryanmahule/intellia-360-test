import "@/app/home.css";
import "@/styles/auth.css";
import SiteHeader from "@/components/common/SiteHeader";
import SiteFooter from "@/components/common/SiteFooter";

/**
 * Login, register and the password/verification pages sit behind the home
 * page's "Login" button, so they carry the same site header and footer as the
 * rest of the public site rather than a nav of their own.
 *
 * Each page still renders its own `.auth-nav` and `.auth-page-footer` markup;
 * auth.css hides those now that the shared chrome supplies them, which keeps
 * this to one layout change instead of six page edits.
 *
 * home.css is imported first so auth.css still wins on any shared selector.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="auth-page-wrapper">
      <SiteHeader />
      {children}
      <SiteFooter />
    </div>
  );
}

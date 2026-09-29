import { usePathname } from "next/navigation";
import { ROUTE_PLACEHOLDER } from "@/lib/route-placeholder";

/**
 * Dynamic route params ([id], [gradeId], …) read from the URL in the static
 * export, where `useParams()` would report the build-time placeholder
 * (see lib/route-placeholder.ts).
 */

function decode(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

/** Matches `path` against a pattern such as "/student/lesson/:id". */
export function matchRoute<K extends string>(pattern: string, path: string): Partial<Record<K, string>> {
  const want = pattern.split("/").filter(Boolean);
  const have = path.split("/").filter(Boolean);
  if (want.length !== have.length) return {};

  const params: Partial<Record<K, string>> = {};
  for (let i = 0; i < want.length; i++) {
    if (want[i].startsWith(":")) params[want[i].slice(1) as K] = decode(have[i]);
    else if (want[i] !== have[i]) return {};
  }
  return params;
}

/**
 * The dynamic params of the current URL for `pattern`.
 *
 * The router's pathname is used when it names a real id: during a client-side
 * navigation it is updated before the address bar is. When the page was
 * served as the placeholder shell, the router may still report the
 * placeholder, and the address bar holds the real id.
 */
export function useRouteParams<K extends string>(pattern: string): Partial<Record<K, string>> {
  const routerPath = usePathname() ?? "";
  const fromRouter = matchRoute<K>(pattern, routerPath);
  const isPlaceholder = Object.values(fromRouter).includes(ROUTE_PLACEHOLDER);

  if ((isPlaceholder || Object.keys(fromRouter).length === 0) && typeof window !== "undefined") {
    return matchRoute<K>(pattern, window.location.pathname);
  }
  return fromRouter;
}

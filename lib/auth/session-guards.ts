import type { PortalRole } from "./types.ts";

export type RouteClassification =
  | "AUTH_HUB"
  | "ADMIN_PORTAL"
  | "STAFF_PORTAL"
  | "PUBLIC_ASSET"
  | "OTHER";

export interface ResolvedSession {
  isAuthenticated: boolean;
  role: PortalRole | null;
  userId?: string;
  source: "supabase" | "demo" | "none";
}

export interface GuardDecision {
  action: "ALLOW" | "REDIRECT";
  destination?: string;
  statusCode?: 307 | 308;
}

export interface CookieReader {
  get(name: string): { value: string } | undefined;
}

const STATIC_EXTENSIONS = [
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".css",
  ".js",
];

function normalizePathname(pathname: string): string {
  let p = pathname.toLowerCase();
  while (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p || "/";
}

function isStaticAsset(path: string): boolean {
  if (path.startsWith("/_next") || path.startsWith("/favicon.ico")) {
    return true;
  }
  return STATIC_EXTENSIONS.some((ext) => path.endsWith(ext));
}

/**
 * Classifies an incoming pathname into SWIFT route domains.
 */
export function classifyRoute(pathname: string): RouteClassification {
  const normalized = normalizePathname(pathname);

  if (isStaticAsset(normalized)) {
    return "PUBLIC_ASSET";
  }

  if (normalized === "/" || normalized === "/login") {
    return "AUTH_HUB";
  }

  if (normalized === "/admin" || normalized.startsWith("/admin/")) {
    return "ADMIN_PORTAL";
  }

  if (normalized === "/staff" || normalized.startsWith("/staff/")) {
    return "STAFF_PORTAL";
  }

  return "OTHER";
}

/**
 * Resolves authentication status from cookies and optional Supabase user record.
 */
export function resolveSession(
  cookies?: CookieReader | null,
  supabaseUser?: { id: string; user_metadata?: Record<string, unknown>; app_metadata?: Record<string, unknown> } | null
): ResolvedSession {
  const roleCookie = cookies?.get("swift-session-role")?.value?.toLowerCase();
  const validCookieRole: PortalRole | null =
    roleCookie === "admin" || roleCookie === "staff" ? roleCookie : null;

  if (supabaseUser) {
    const metaRole =
      (supabaseUser.user_metadata?.role as string)?.toLowerCase() ||
      (supabaseUser.app_metadata?.role as string)?.toLowerCase();

    const role: PortalRole =
      metaRole === "admin" || metaRole === "staff"
        ? (metaRole as PortalRole)
        : validCookieRole || "admin";

    return {
      isAuthenticated: true,
      role,
      userId: supabaseUser.id,
      source: "supabase",
    };
  }

  if (validCookieRole) {
    return {
      isAuthenticated: true,
      role: validCookieRole,
      source: "demo",
    };
  }

  return {
    isAuthenticated: false,
    role: null,
    source: "none",
  };
}

/**
 * Pure route guard evaluator determining if an incoming request is allowed or redirected.
 */
export function evaluateRouteAccess(
  pathname: string,
  session: ResolvedSession
): GuardDecision {
  const classification = classifyRoute(pathname);
  const normalized = normalizePathname(pathname);

  switch (classification) {
    case "AUTH_HUB": {
      if (session.isAuthenticated && session.role) {
        const destination = session.role === "admin" ? "/admin" : "/staff/pos";
        return {
          action: "REDIRECT",
          destination,
          statusCode: 307,
        };
      }
      return { action: "ALLOW" };
    }

    case "ADMIN_PORTAL": {
      if (!session.isAuthenticated) {
        return {
          action: "REDIRECT",
          destination: "/",
          statusCode: 307,
        };
      }

      if (session.role === "staff") {
        return {
          action: "REDIRECT",
          destination: "/staff/pos",
          statusCode: 307,
        };
      }

      return { action: "ALLOW" };
    }

    case "STAFF_PORTAL": {
      if (!session.isAuthenticated) {
        return {
          action: "REDIRECT",
          destination: "/",
          statusCode: 307,
        };
      }

      // Root of staff portal redirects to the default Fast-Lane POS view
      if (normalized === "/staff") {
        return {
          action: "REDIRECT",
          destination: "/staff/pos",
          statusCode: 307,
        };
      }

      return { action: "ALLOW" };
    }

    case "PUBLIC_ASSET":
    case "OTHER":
    default:
      return { action: "ALLOW" };
  }
}

/**
 * Helper for Server Components and layouts to retrieve the current session.
 */
export async function getServerSession(): Promise<ResolvedSession> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    let user = null;

    if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const { createClient } = await import("@/lib/supabase/server");
        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
      } catch {
        // Fallback if Supabase is offline
      }
    }

    return resolveSession(cookieStore, user);
  } catch {
    return {
      isAuthenticated: false,
      role: null,
      source: "none",
    };
  }
}

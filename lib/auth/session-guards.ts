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
  isInactive?: boolean;
  hasPendingPinChallenge?: boolean;
  pendingStaffEmail?: string;
  pendingStaffName?: string;
  pendingStaffRole?: string;
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
  const isElevated = cookies?.get("swift_admin_elevated")?.value === "true";
  const userIdCookie = cookies?.get("swift-session-user-id")?.value;
  const validCookieRole: PortalRole | null =
    roleCookie === "admin" || roleCookie === "staff" ? roleCookie : null;

  const pendingChallengeCookie = cookies?.get("swift-pending-staff-auth")?.value;
  let hasPendingPinChallenge = false;
  let pendingStaffEmail: string | undefined;
  let pendingStaffName: string | undefined;
  let pendingStaffRole: string | undefined;

  if (pendingChallengeCookie) {
    try {
      const parsed = JSON.parse(decodeURIComponent(pendingChallengeCookie));
      if (parsed?.userId && parsed?.portalRole === "staff") {
        hasPendingPinChallenge = true;
        pendingStaffEmail = parsed.email;
        pendingStaffName = parsed.name;
        pendingStaffRole = parsed.role;
      }
    } catch {
      // Ignore JSON parse errors
    }
  }

  if (supabaseUser) {
    const metaRole =
      (supabaseUser.user_metadata?.role as string)?.toLowerCase() ||
      (supabaseUser.app_metadata?.role as string)?.toLowerCase();

    const baseRole: PortalRole =
      metaRole === "admin" || metaRole === "staff"
        ? (metaRole as PortalRole)
        : validCookieRole || "admin";

    const role: PortalRole = isElevated ? "admin" : baseRole;

    return {
      isAuthenticated: true,
      role,
      userId: supabaseUser.id,
      source: "supabase",
      hasPendingPinChallenge,
      pendingStaffEmail,
      pendingStaffName,
      pendingStaffRole,
    };
  }

  if (isElevated) {
    return {
      isAuthenticated: true,
      role: "admin",
      userId: userIdCookie,
      source: "demo",
      hasPendingPinChallenge,
      pendingStaffEmail,
      pendingStaffName,
      pendingStaffRole,
    };
  }

  if (validCookieRole) {
    return {
      isAuthenticated: true,
      role: validCookieRole,
      userId: userIdCookie,
      source: "demo",
      hasPendingPinChallenge,
      pendingStaffEmail,
      pendingStaffName,
      pendingStaffRole,
    };
  }

  return {
    isAuthenticated: false,
    role: null,
    source: "none",
    hasPendingPinChallenge,
    pendingStaffEmail,
    pendingStaffName,
    pendingStaffRole,
  };
}

function evaluatePortalAccess(
  classification: RouteClassification,
  normalized: string,
  session: ResolvedSession
): GuardDecision {
  if (!session.isAuthenticated) {
    if (session.hasPendingPinChallenge) {
      return {
        action: "REDIRECT",
        destination: "/login?notice=pin_challenge_pending",
        statusCode: 307,
      };
    }
    return {
      action: "REDIRECT",
      destination: "/",
      statusCode: 307,
    };
  }


  if (classification === "ADMIN_PORTAL" && session.role === "staff") {
    return {
      action: "REDIRECT",
      destination: "/staff/pos",
      statusCode: 307,
    };
  }

  if (classification === "STAFF_PORTAL" && normalized === "/staff") {
    return {
      action: "REDIRECT",
      destination: "/staff/pos",
      statusCode: 307,
    };
  }

  return { action: "ALLOW" };
}

/**
 * Pure route guard evaluator determining if an incoming request is allowed or redirected.
 */
export function evaluateRouteAccess(
  pathname: string,
  session: ResolvedSession
): GuardDecision {
  if (session.isInactive) {
    return {
      action: "REDIRECT",
      destination: "/login?notice=inactive",
      statusCode: 307,
    };
  }

  const classification = classifyRoute(pathname);
  const normalized = normalizePathname(pathname);

  if (classification === "AUTH_HUB") {
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

  if (classification === "ADMIN_PORTAL" || classification === "STAFF_PORTAL") {
    return evaluatePortalAccess(classification, normalized, session);
  }

  return { action: "ALLOW" };
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
        const { createClient } = await import("../supabase/server.ts");

        const supabase = await createClient();
        const { data } = await supabase.auth.getUser();
        user = data?.user ?? null;
      } catch {
        // Fallback if Supabase is offline
      }
    }

    const session = resolveSession(cookieStore, user);
    if (!session.isAuthenticated) {
      return session;
    }

    // Verify if user account was deactivated while session was active
    const targetUserId = session.userId || cookieStore.get("swift-session-user-id")?.value;
    if (targetUserId) {
      try {
        const { getStaffUserStatus } = await import("../admin/user-actions.ts");
        const status = await getStaffUserStatus(targetUserId);
        if (status === "Inactive" || status === "Suspended") {
          cookieStore.delete("swift-session-role");
          cookieStore.delete("swift-user-name");
          cookieStore.delete("swift-session-user-id");
          cookieStore.delete("swift_admin_elevated");
          cookieStore.delete("swift_active_shift_id");

          return {
            isAuthenticated: false,
            role: null,
            userId: targetUserId,
            source: "none",
            isInactive: true,
          };
        }
      } catch {
        // Suppress lookup errors
      }
    }

    return session;
  } catch {
    return {
      isAuthenticated: false,
      role: null,
      source: "none",
    };
  }
}

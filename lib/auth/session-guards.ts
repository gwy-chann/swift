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
  userName?: string;
  staffRole?: string;
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

function parsePendingChallenge(cookieValue?: string): {
  hasPendingPinChallenge: boolean;
  pendingStaffEmail?: string;
  pendingStaffName?: string;
  pendingStaffRole?: string;
} {
  if (!cookieValue) {
    return { hasPendingPinChallenge: false };
  }
  try {
    const parsed = JSON.parse(decodeURIComponent(cookieValue));
    if (parsed?.userId && parsed?.portalRole === "staff") {
      return {
        hasPendingPinChallenge: true,
        pendingStaffEmail: parsed.email,
        pendingStaffName: parsed.name,
        pendingStaffRole: parsed.role,
      };
    }
  } catch {
    // Ignore JSON parse errors
  }
  return { hasPendingPinChallenge: false };
}

function determineBaseRole(
  metaRole?: string,
  isStaffRole?: boolean,
  validCookieRole?: PortalRole | null
): PortalRole {
  if (metaRole === "admin") {
    return "admin";
  }
  if (isStaffRole) {
    return "staff";
  }
  return validCookieRole || "admin";
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
  const userNameCookie = cookies?.get("swift-user-name")?.value;
  const staffRoleCookie = cookies?.get("swift-session-staff-role")?.value;
  const validCookieRole: PortalRole | null =
    roleCookie === "admin" || roleCookie === "staff" ? roleCookie : null;

  const {
    hasPendingPinChallenge,
    pendingStaffEmail,
    pendingStaffName,
    pendingStaffRole,
  } = parsePendingChallenge(cookies?.get("swift-pending-staff-auth")?.value);

  const isAdminSession = validCookieRole === "admin" || isElevated;

  // If a PIN challenge is active, staff is strictly unauthenticated until Step 2 is finalized
  if (hasPendingPinChallenge && !isAdminSession) {
    return {
      isAuthenticated: false,
      role: null,
      userId: userIdCookie || supabaseUser?.id,
      userName: userNameCookie || pendingStaffName || (supabaseUser?.user_metadata?.full_name as string),
      staffRole: pendingStaffRole || staffRoleCookie,
      source: supabaseUser ? "supabase" : "demo",
      hasPendingPinChallenge: true,
      pendingStaffEmail,
      pendingStaffName,
      pendingStaffRole,
    };
  }

  if (supabaseUser) {
    const metaRole =
      (supabaseUser.user_metadata?.role as string)?.toLowerCase() ||
      (supabaseUser.app_metadata?.role as string)?.toLowerCase();

    const isStaffRole =
      metaRole === "staff" ||
      metaRole === "cashier" ||
      metaRole === "mechanic" ||
      metaRole === "inventory_clerk";

    // Staff members strictly require two-step PIN verification before gaining authenticated status.
    // If cookies exist, staff must have validCookieRole === "staff" (or admin elevation).
    if (isStaffRole && !isElevated && cookies && validCookieRole !== "staff") {
      return {
        isAuthenticated: false,
        role: null,
        userId: supabaseUser.id,
        userName: userNameCookie,
        staffRole: metaRole || staffRoleCookie,
        source: "supabase",
        hasPendingPinChallenge: false,
        pendingStaffEmail,
        pendingStaffName,
        pendingStaffRole,
      };
    }

    const baseRole = determineBaseRole(metaRole, isStaffRole, validCookieRole);
    const role: PortalRole = isElevated ? "admin" : baseRole;
    const resolvedFullName =
      (supabaseUser.user_metadata?.full_name as string) ||
      (supabaseUser.user_metadata?.name as string) ||
      userNameCookie;

    return {
      isAuthenticated: true,
      role,
      userId: supabaseUser.id,
      userName: resolvedFullName,
      staffRole: metaRole || staffRoleCookie,
      source: "supabase",
      hasPendingPinChallenge: false,
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
      userName: userNameCookie || "Carlos Rodriguez",
      staffRole: "admin",
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
      userName: userNameCookie,
      staffRole: staffRoleCookie,
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
  if (session.hasPendingPinChallenge) {
    return {
      action: "REDIRECT",
      destination: "/login?notice=pin_challenge_pending",
      statusCode: 307,
    };
  }

  if (!session.isAuthenticated) {
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

  if (classification === "STAFF_PORTAL" && session.role === "admin") {
    return {
      action: "REDIRECT",
      destination: "/admin",
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
    if (session.hasPendingPinChallenge) {
      return { action: "ALLOW" };
    }
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

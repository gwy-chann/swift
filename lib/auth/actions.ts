"use server";

import type {
  AuthResult,
  LoginCredentials,
  UserSession,
  PendingStaffAuthChallenge,
  PendingStaffSummary,
} from "./types.ts";
import {
  ALL_DEMO_ACCOUNTS,
  PORTAL_CONFIG,
  INACTIVE_ACCOUNT_ERROR,
  PIN_ERROR_INVALID,
  PIN_VALIDATION_ERROR_MSG,
} from "./constants.ts";
import { createClient } from "../supabase/server.ts";
import { getStaffUserStatus, getStaffUserRole } from "../admin/user-actions.ts";
import { memoryCookieJar } from "./test-cookie-jar.ts";

interface CookieWriter {
  get(name: string): { value: string } | undefined;
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
}

async function getSafeCookieStore(): Promise<CookieWriter> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    return {
      get: (name: string) => {
        const liveVal = cookieStore.get(name)?.value;
        const val = liveVal ?? memoryCookieJar.get(name);
        return val !== undefined ? { value: val } : undefined;
      },
      set: (name: string, value: string, options?: Record<string, unknown>) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // Suppress if outside request context
        }
        memoryCookieJar.set(name, value);
      },
      delete: (name: string) => {
        try {
          cookieStore.delete(name);
        } catch {
          // Suppress if outside request context
        }
        memoryCookieJar.delete(name);
      },
    };
  } catch {
    return {
      get: (name: string) => {
        const val = memoryCookieJar.get(name);
        return val !== undefined ? { value: val } : undefined;
      },
      set: (name: string, value: string) => {
        memoryCookieJar.set(name, value);
      },
      delete: (name: string) => {
        memoryCookieJar.delete(name);
      },
    };
  }
}

function setSessionCookies(
  cookieStore: CookieWriter,
  role: string,
  name: string,
  rememberTerminal: boolean,
  userId?: string,
  staffRole?: string
) {
  const maxAge = rememberTerminal ? 60 * 60 * 24 * 30 : 60 * 60 * 24;
  cookieStore.set("swift-session-role", role, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge,
  });
  cookieStore.set("swift-user-name", name, {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    maxAge,
  });
  if (userId) {
    cookieStore.set("swift-session-user-id", userId, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge,
    });
  }
  if (staffRole) {
    cookieStore.set("swift-session-staff-role", staffRole, {
      path: "/",
      httpOnly: false,
      sameSite: "lax",
      maxAge,
    });
  }
  if (role !== "admin") {
    cookieStore.delete("swift_admin_elevated");
  }
}

function setPendingStaffChallengeCookie(
  cookieStore: CookieWriter,
  challenge: PendingStaffAuthChallenge
) {
  cookieStore.set(
    "swift-pending-staff-auth",
    encodeURIComponent(JSON.stringify(challenge)),
    {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 900, // 15 minutes
    }
  );
}

function clearPendingStaffChallengeCookie(cookieStore: CookieWriter) {
  cookieStore.delete("swift-pending-staff-auth");
}

function resolveDemoAccount(normalizedEmail: string) {
  const match = ALL_DEMO_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === normalizedEmail
  );
  if (match) {
    return {
      id: match.id || "00000000-0000-0000-0000-000000000002",
      role: match.role,
      staffRole: match.staffRole,
      name: match.name || match.label,
      targetUrl: match.targetUrl,
      pin: match.pin,
    };
  }
  return null;
}

type ResolvedDemoAccount = NonNullable<ReturnType<typeof resolveDemoAccount>>;

async function handleDemoAuthentication(
  demoAccount: ResolvedDemoAccount,
  normalizedEmail: string,
  selectedRole: string,
  rememberTerminal: boolean,
  targetRedirect: string,
  cookieStore: CookieWriter
): Promise<AuthResult> {
  const status =
    (await getStaffUserStatus(normalizedEmail)) ||
    (await getStaffUserStatus(demoAccount.id));

  if (status === "Inactive" || status === "Suspended") {
    return {
      success: false,
      error: INACTIVE_ACCOUNT_ERROR,
      code: "ACCOUNT_INACTIVE",
    };
  }

  const liveRole =
    (await getStaffUserRole(normalizedEmail)) ||
    (await getStaffUserRole(demoAccount.id)) ||
    demoAccount.staffRole ||
    "cashier";

  const isStaff = selectedRole === "staff" || demoAccount.role === "staff" || (liveRole !== "admin");
  if (isStaff && liveRole !== "admin") {
    const { ROLE_ROUTE_CONFIG } = await import("../staff/navigation.ts");
    const targetRoute =
      ROLE_ROUTE_CONFIG[liveRole as keyof typeof ROLE_ROUTE_CONFIG]?.targetPath || "/staff/pos";

    const challenge: PendingStaffAuthChallenge = {
      userId: demoAccount.id,
      email: normalizedEmail,
      name: demoAccount.name,
      role: liveRole,
      portalRole: "staff",
      targetUrl: targetRoute,
      rememberTerminal,
      challengeIssuedAt: Date.now(),
    };

    setPendingStaffChallengeCookie(cookieStore, challenge);

    return {
      success: true,
      requiresPin: true,
      step: "ENTER_PIN",
      staffSummary: {
        userId: challenge.userId,
        name: challenge.name,
        email: challenge.email,
        role: challenge.role,
        targetUrl: challenge.targetUrl,
      },
    };
  }

  // Admin direct authentication
  const session: UserSession = {
    id: demoAccount.id,
    email: normalizedEmail,
    name: demoAccount.name,
    role: demoAccount.role,
    expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * (rememberTerminal ? 30 : 1),
  };

  setSessionCookies(cookieStore, demoAccount.role, demoAccount.name, rememberTerminal, demoAccount.id);

  return {
    success: true,
    redirectTo: demoAccount.targetUrl || targetRedirect,
    session,
  };
}

/**
 * Authenticates a user against Supabase Auth with fallback to demo accounts
 * For staff roles, enforces two-step login: verifies credentials then issues a PIN challenge.
 */
export async function authenticateUserAction(
  credentials: LoginCredentials
): Promise<AuthResult> {
  const { email, password, selectedRole, rememberTerminal } = credentials;

  // 1. Basic validation
  if (!email?.trim()) {
    return {
      success: false,
      error: "Username or email is required.",
      code: "INVALID_CREDENTIALS",
    };
  }

  const normalizedEmail = email.trim().toLowerCase();
  const targetRedirect = PORTAL_CONFIG[selectedRole].defaultRoute;
  const cookieStore = await getSafeCookieStore();

  // 2. Demo account bypass check
  const demoAccount = resolveDemoAccount(normalizedEmail);
  if (demoAccount) {
    return handleDemoAuthentication(
      demoAccount,
      normalizedEmail,
      selectedRole,
      Boolean(rememberTerminal),
      targetRedirect,
      cookieStore
    );
  }

  // 3. Live Supabase Authentication
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password || "",
    });

    if (error || !data.user) {
      return {
        success: false,
        error: error?.message || "Invalid email or password. Please check your credentials.",
        code: "INVALID_CREDENTIALS",
      };
    }

    // Verify account status in profile ledger
    const status =
      (await getStaffUserStatus(data.user.id)) ||
      (await getStaffUserStatus(normalizedEmail));

    if (status === "Inactive" || status === "Suspended") {
      await supabase.auth.signOut();
      return {
        success: false,
        error: INACTIVE_ACCOUNT_ERROR,
        code: "ACCOUNT_INACTIVE",
      };
    }

    const metaRole =
      (data.user.user_metadata?.role as string)?.toLowerCase() ||
      (data.user.app_metadata?.role as string)?.toLowerCase();

    const liveRole =
      (await getStaffUserRole(data.user.id)) ||
      (await getStaffUserRole(normalizedEmail)) ||
      metaRole ||
      "cashier";

    const isStaff =
      selectedRole === "staff" ||
      liveRole === "staff" ||
      liveRole === "cashier" ||
      liveRole === "mechanic" ||
      liveRole === "inventory_clerk";

    const fullNameMeta =
      (data.user.user_metadata?.full_name as string) ||
      (data.user.user_metadata?.name as string);

    let resolvedName = fullNameMeta;
    if (!resolvedName) {
      try {
        const { data: dbProfile } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", data.user.id)
          .maybeSingle();
        if (dbProfile?.full_name) {
          resolvedName = dbProfile.full_name;
        }
      } catch {
        // Suppress lookup errors
      }
    }

    const name = resolvedName || data.user.email?.split("@")[0] || "User";

    if (isStaff && liveRole !== "admin") {
      const staffRole = liveRole;
      const { ROLE_ROUTE_CONFIG } = await import("../staff/navigation.ts");
      const targetRoute =
        ROLE_ROUTE_CONFIG[staffRole as keyof typeof ROLE_ROUTE_CONFIG]?.targetPath || "/staff/pos";

      const challenge: PendingStaffAuthChallenge = {
        userId: data.user.id,
        email: data.user.email || normalizedEmail,
        name,
        role: staffRole,
        portalRole: "staff",
        targetUrl: targetRoute,
        rememberTerminal,
        challengeIssuedAt: Date.now(),
      };

      setPendingStaffChallengeCookie(cookieStore, challenge);

      return {
        success: true,
        requiresPin: true,
        step: "ENTER_PIN",
        staffSummary: {
          userId: challenge.userId,
          name: challenge.name,
          email: challenge.email,
          role: challenge.role,
          targetUrl: challenge.targetUrl,
        },
      };
    }

    const role = selectedRole;
    const session: UserSession = {
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      name,
      role,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * (rememberTerminal ? 30 : 1),
    };

    setSessionCookies(cookieStore, role, name, rememberTerminal, data.user.id, liveRole);

    return {
      success: true,
      redirectTo: targetRedirect,
      session,
    };
  } catch (err) {
    console.error("Auth action error:", err);
    return {
      success: false,
      error: "Authentication service encountered a network error. Please try again.",
      code: "NETWORK_ERROR",
    };
  }
}

async function resolveExpectedStaffPin(userId: string, email: string): Promise<string> {
  const demo = ALL_DEMO_ACCOUNTS.find(
    (a) =>
      a.email.toLowerCase() === email.toLowerCase() ||
      a.id === userId
  );
  if (demo?.pin) {
    return demo.pin;
  }

  try {
    const { DEFAULT_DEMO_PINS } = await import("../staff/constants.ts");
    if (DEFAULT_DEMO_PINS[userId]) {
      return DEFAULT_DEMO_PINS[userId];
    }
  } catch {
    // Fallback
  }

  if (
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    try {
      const { createAdminClient, createClient } = await import("../supabase/server.ts");
      let supabase;
      try {
        supabase = createAdminClient();
      } catch {
        supabase = await createClient();
      }
      const { data } = await supabase
        .from("profiles")
        .select("pin_code")
        .eq("id", userId)
        .maybeSingle();

      if (data?.pin_code) {
        return data.pin_code;
      }
    } catch {
      // Fallback
    }
  }

  return "1234";
}

/**
 * Completes Step 2 of the two-step staff login by validating the employee's PIN.
 */
export async function completeStaffTwoStepLoginAction(payload: {
  pin: string;
  rememberTerminal?: boolean;
}): Promise<AuthResult> {
  const cookieStore = await getSafeCookieStore();
  const rawChallenge = cookieStore.get("swift-pending-staff-auth")?.value;

  if (!rawChallenge) {
    return {
      success: false,
      error: "Session challenge expired. Please enter your password again.",
      code: "CHALLENGE_EXPIRED",
    };
  }

  let challenge: PendingStaffAuthChallenge;
  try {
    challenge = JSON.parse(decodeURIComponent(rawChallenge));
  } catch {
    return {
      success: false,
      error: "Malformed session challenge. Please log in again.",
      code: "CHALLENGE_EXPIRED",
    };
  }

  const cleanPin = (payload.pin || "").trim();
  if (!/^\d{4,6}$/.test(cleanPin)) {
    return {
      success: false,
      error: PIN_VALIDATION_ERROR_MSG,
      code: "INVALID_PIN",
    };
  }

  // Verify status is not inactive
  const status =
    (await getStaffUserStatus(challenge.userId)) ||
    (await getStaffUserStatus(challenge.email));

  if (status === "Inactive" || status === "Suspended") {
    clearPendingStaffChallengeCookie(cookieStore);
    return {
      success: false,
      error: INACTIVE_ACCOUNT_ERROR,
      code: "ACCOUNT_INACTIVE",
    };
  }

  const expectedPin = await resolveExpectedStaffPin(challenge.userId, challenge.email);

  if (cleanPin !== expectedPin) {
    return {
      success: false,
      error: PIN_ERROR_INVALID,
      code: "INVALID_PIN",
    };
  }


  // PIN verified successfully
  clearPendingStaffChallengeCookie(cookieStore);
  cookieStore.delete("swift_admin_elevated");

  const rememberTerminal =
    payload.rememberTerminal ?? challenge.rememberTerminal ?? true;

  const liveRole =
    (await getStaffUserRole(challenge.userId)) ||
    (await getStaffUserRole(challenge.email)) ||
    challenge.role;

  setSessionCookies(
    cookieStore,
    "staff",
    challenge.name,
    rememberTerminal,
    challenge.userId,
    liveRole
  );

  const session: UserSession = {
    id: challenge.userId,
    email: challenge.email,
    name: challenge.name,
    role: "staff",
    expiresAt:
      Math.floor(Date.now() / 1000) +
      60 * 60 * 24 * (rememberTerminal ? 30 : 1),
  };

  const { ROLE_ROUTE_CONFIG } = await import("../staff/navigation.ts");
  const fallbackUrl =
    ROLE_ROUTE_CONFIG[liveRole as keyof typeof ROLE_ROUTE_CONFIG]?.targetPath || "/staff/pos";
  let finalRedirect = "/staff/pos";
  if (fallbackUrl && !fallbackUrl.startsWith("/admin")) {
    finalRedirect = fallbackUrl;
  } else if (challenge.targetUrl && !challenge.targetUrl.startsWith("/admin")) {
    finalRedirect = challenge.targetUrl;
  }

  return {
    success: true,
    redirectTo: finalRedirect,
    session,
  };
}

/**
 * Cancels pending PIN challenge and restores Step 1 login state.
 */
export async function cancelStaffPinChallengeAction(): Promise<{ success: boolean }> {
  const cookieStore = await getSafeCookieStore();
  clearPendingStaffChallengeCookie(cookieStore);
  return { success: true };
}

/**
 * Retrieves the current pending staff challenge if active.
 */
export async function getPendingStaffChallengeAction(): Promise<PendingStaffSummary | null> {
  const cookieStore = await getSafeCookieStore();
  const rawChallenge = cookieStore.get("swift-pending-staff-auth")?.value;
  if (!rawChallenge) return null;
  try {
    const challenge: PendingStaffAuthChallenge = JSON.parse(
      decodeURIComponent(rawChallenge)
    );
    return {
      userId: challenge.userId,
      email: challenge.email,
      name: challenge.name,
      role: challenge.role,
      targetUrl: challenge.targetUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Terminates user session, clears cookies, and returns login redirect target
 */
export async function logoutAction(): Promise<{ success: boolean; redirectTo: string }> {
  const cookieStore = await getSafeCookieStore();
  const userId = cookieStore.get("swift-session-user-id")?.value;

  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Graceful fallback if Supabase is offline
  }

  // Authoritatively clock-out any active database shift for this staff user
  if (userId && process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    try {
      const { createAdminClient } = await import("../supabase/server.ts");
      const adminClient = createAdminClient();
      const { normalizeProfileId } = await import("../staff/constants.ts");
      const normalizedId = normalizeProfileId(userId) || userId;

      const { data: activeShifts } = await adminClient
        .from("staff_shifts")
        .select("id, clock_in")
        .eq("profile_id", normalizedId)
        .in("status", ["on_shift", "break"]);

      if (activeShifts && activeShifts.length > 0) {
        const now = new Date();
        const updatePromises = activeShifts.map((shift) => {
          const clockInTime = new Date(shift.clock_in).getTime();
          const durationSeconds = Math.max(0, Math.floor((now.getTime() - clockInTime) / 1000));
          return adminClient
            .from("staff_shifts")
            .update({
              status: "completed",
              clock_out: now.toISOString(),
              duration_seconds: durationSeconds,
              notes: "Automatic clock-out on user logout",
            })
            .eq("id", shift.id);
        });
        await Promise.all(updatePromises);
      }
    } catch (err) {
      console.warn("[logoutAction] Auto clock-out database cleanup error:", err);
    }
  }

  cookieStore.delete("swift-session-role");
  cookieStore.delete("swift-session-staff-role");
  cookieStore.delete("swift-user-name");
  cookieStore.delete("swift-session-user-id");
  cookieStore.delete("swift_admin_elevated");
  cookieStore.delete("swift_active_shift_id");
  cookieStore.delete("swift-pending-staff-auth");

  return {
    success: true,
    redirectTo: "/",
  };
}

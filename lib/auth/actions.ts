"use server";

import type { AuthResult, LoginCredentials, UserSession } from "./types.ts";
import { ALL_DEMO_ACCOUNTS, PORTAL_CONFIG } from "./constants.ts";
import { createClient } from "../supabase/server.ts";
import { getStaffUserStatus } from "../admin/user-actions.ts";

export const INACTIVE_ACCOUNT_ERROR =
  "Account is inactive. Please contact your workshop administrator.";

interface CookieWriter {
  set(name: string, value: string, options?: Record<string, unknown>): void;
  delete(name: string): void;
}

async function getSafeCookieStore(): Promise<CookieWriter> {
  try {
    const { cookies } = await import("next/headers");
    return await cookies();
  } catch {
    return {
      set: () => {},
      delete: () => {},
    };
  }
}

function setSessionCookies(
  cookieStore: CookieWriter,
  role: string,
  name: string,
  rememberTerminal: boolean,
  userId?: string
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
}

function resolveDemoAccount(normalizedEmail: string) {
  const match = ALL_DEMO_ACCOUNTS.find(
    (acc) => acc.email.toLowerCase() === normalizedEmail
  );
  if (match) {
    return {
      id: match.id || "00000000-0000-0000-0000-000000000002",
      role: match.role,
      name: match.name || match.label,
      targetUrl: match.targetUrl,
    };
  }
  return null;
}

/**
 * Authenticates a user against Supabase Auth with fallback to demo accounts
 * Replicates the role routing and demo flow defined in mockup/index.html & SIAA-8
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
    // Check account status in ledger
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

    const role = selectedRole;
    const name = data.user.user_metadata?.name || data.user.email?.split("@")[0] || "User";

    const session: UserSession = {
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      name,
      role,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * (rememberTerminal ? 30 : 1),
    };

    setSessionCookies(cookieStore, role, name, rememberTerminal, data.user.id);

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

/**
 * Terminates user session, clears cookies, and returns login redirect target
 */
export async function logoutAction(): Promise<{ success: boolean; redirectTo: string }> {
  try {
    const supabase = await createClient();
    await supabase.auth.signOut();
  } catch {
    // Graceful fallback if Supabase is offline
  }

  const cookieStore = await getSafeCookieStore();
  cookieStore.delete("swift-session-role");
  cookieStore.delete("swift-user-name");
  cookieStore.delete("swift-session-user-id");
  cookieStore.delete("swift_admin_elevated");
  cookieStore.delete("swift_active_shift_id");

  return {
    success: true,
    redirectTo: "/",
  };
}

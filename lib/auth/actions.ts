"use server";

import { cookies } from "next/headers";
import { AuthResult, LoginCredentials, UserSession } from "./types";
import { DEMO_ACCOUNTS, PORTAL_CONFIG } from "./constants";
import { createClient } from "@/lib/supabase/server";

function setSessionCookies(
  cookieStore: Awaited<ReturnType<typeof cookies>>,
  role: string,
  name: string,
  rememberTerminal: boolean
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
}

function resolveDemoAccount(normalizedEmail: string) {
  const adminDemo = DEMO_ACCOUNTS.admin.email.toLowerCase();
  const staffDemo = DEMO_ACCOUNTS.staff.email.toLowerCase();

  if (normalizedEmail === adminDemo) {
    return {
      id: "00000000-0000-0000-0000-000000000001",
      role: "admin" as const,
      name: "Shop Administrator",
    };
  }
  if (normalizedEmail === staffDemo) {
    return {
      id: "00000000-0000-0000-0000-000000000002",
      role: "staff" as const,
      name: "Shop Floor Cashier",
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
  const cookieStore = await cookies();

  // 2. Demo account bypass check
  const demoAccount = resolveDemoAccount(normalizedEmail);
  if (demoAccount) {
    const session: UserSession = {
      id: demoAccount.id,
      email: normalizedEmail,
      name: demoAccount.name,
      role: demoAccount.role,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * (rememberTerminal ? 30 : 1),
    };

    setSessionCookies(cookieStore, demoAccount.role, demoAccount.name, rememberTerminal);

    return {
      success: true,
      redirectTo: targetRedirect,
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

    const role = selectedRole;
    const name = data.user.user_metadata?.name || data.user.email?.split("@")[0] || "User";

    const session: UserSession = {
      id: data.user.id,
      email: data.user.email || normalizedEmail,
      name,
      role,
      expiresAt: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * (rememberTerminal ? 30 : 1),
    };

    setSessionCookies(cookieStore, role, name, rememberTerminal);

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

  const cookieStore = await cookies();
  cookieStore.delete("swift-session-role");
  cookieStore.delete("swift-user-name");

  return {
    success: true,
    redirectTo: "/",
  };
}

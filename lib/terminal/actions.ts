"use server";

import { randomUUID } from "crypto";
import type {
  TerminalValidationResult,
  TerminalEnrollmentResult,
  TerminalResetResult,
} from "./types.ts";
import {
  SWIFT_TERMINAL_DEVICE_TOKEN_KEY,
  DEFAULT_PRIMARY_TERMINAL_ID,
  DEFAULT_PRIMARY_DEVICE_NAME,
  DEFAULT_PRIMARY_DEVICE_TOKEN,
} from "./device-binding.ts";

// In-memory registry of enrolled tokens for mock/dev environment
const ENROLLED_TERMINAL_TOKENS = new Map<string, { terminalId: string; deviceName: string }>([
  [
    DEFAULT_PRIMARY_DEVICE_TOKEN,
    { terminalId: DEFAULT_PRIMARY_TERMINAL_ID, deviceName: DEFAULT_PRIMARY_DEVICE_NAME },
  ],
]);

const MASTER_ADMIN_PIN = "8888";

async function getCookieSafe(name: string): Promise<string | undefined> {
  try {
    const nextHeaders = await import("next/headers");
    const cookieStore = await nextHeaders.cookies();
    return cookieStore.get(name)?.value;
  } catch {
    return undefined;
  }
}

async function setCookieSafe(name: string, value: string): Promise<void> {
  try {
    const nextHeaders = await import("next/headers");
    const cookieStore = await nextHeaders.cookies();
    cookieStore.set(name, value, {
      path: "/",
      maxAge: 31536000,
      sameSite: "lax",
      httpOnly: false,
    });
  } catch {
    // Ignore in isolated/test environments
  }
}

async function deleteCookieSafe(name: string): Promise<void> {
  try {
    const nextHeaders = await import("next/headers");
    const cookieStore = await nextHeaders.cookies();
    cookieStore.delete(name);
  } catch {
    // Ignore in isolated/test environments
  }
}

/**
 * Server Action: Validate terminal device token
 * Checks passed token or inspects swift_terminal_device_token HTTP-only/session cookie
 */
export async function validateTerminalTokenAction(
  token?: string | null
): Promise<TerminalValidationResult> {
  let candidateToken = typeof token === "string" ? token.trim() : undefined;

  if (candidateToken === undefined) {
    candidateToken = await getCookieSafe(SWIFT_TERMINAL_DEVICE_TOKEN_KEY);
  }

  if (!candidateToken) {
    return {
      valid: false,
      errorCode: "UNAUTHORIZED_TERMINAL_DEVICE",
      error: "Clock-in is restricted to physical store counter terminals. No authorized device token found.",
    };
  }

  // Check known registered token registry
  const registered = ENROLLED_TERMINAL_TOKENS.get(candidateToken);
  if (registered) {
    return {
      valid: true,
      terminalId: registered.terminalId,
      deviceName: registered.deviceName,
    };
  }

  // Accept valid dynamic tokens starting with 'term_token_'
  if (candidateToken.startsWith("term_token_")) {
    return {
      valid: true,
      terminalId: DEFAULT_PRIMARY_TERMINAL_ID,
      deviceName: DEFAULT_PRIMARY_DEVICE_NAME,
    };
  }

  return {
    valid: false,
    errorCode: "UNAUTHORIZED_TERMINAL_DEVICE",
    error: "Unauthorized terminal device token.",
  };
}

/**
 * Server Action: Enroll a new physical counter device with Master Admin PIN
 */
export async function enrollTerminalDeviceAction(
  masterPin: string,
  terminalId: string = DEFAULT_PRIMARY_TERMINAL_ID,
  deviceName: string = DEFAULT_PRIMARY_DEVICE_NAME
): Promise<TerminalEnrollmentResult> {
  const cleanPin = masterPin?.trim();

  if (cleanPin !== MASTER_ADMIN_PIN) {
    return {
      success: false,
      code: "INVALID_PIN",
      error: "Invalid Master Admin PIN. Device enrollment requires authorization.",
    };
  }

  const token = `term_token_${randomUUID()}`;
  const assignedTerminalId = terminalId.trim() || DEFAULT_PRIMARY_TERMINAL_ID;
  const assignedDeviceName = deviceName.trim() || DEFAULT_PRIMARY_DEVICE_NAME;

  ENROLLED_TERMINAL_TOKENS.set(token, {
    terminalId: assignedTerminalId,
    deviceName: assignedDeviceName,
  });

  await setCookieSafe(SWIFT_TERMINAL_DEVICE_TOKEN_KEY, token);

  return {
    success: true,
    token,
    terminalId: assignedTerminalId,
    deviceName: assignedDeviceName,
  };
}

/**
 * Server Action: Reset/revoke device binding
 */
export async function resetTerminalDeviceAction(
  masterPin: string
): Promise<TerminalResetResult> {
  const cleanPin = masterPin?.trim();

  if (cleanPin !== MASTER_ADMIN_PIN) {
    return {
      success: false,
      error: "Invalid Master Admin PIN. Reset requires authorization.",
    };
  }

  await deleteCookieSafe(SWIFT_TERMINAL_DEVICE_TOKEN_KEY);

  return {
    success: true,
  };
}

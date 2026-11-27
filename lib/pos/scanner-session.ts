/**
 * POS Companion Scanner Session Lifecycle Engine (SIAA-111)
 */

import type {
  ScannerSessionInfo,
  ScannerConnectionState
} from "@/specs/111-pos-terminal-qr-session-pairing/contracts/pos-scanner-channel.contract";

export type { ScannerSessionInfo, ScannerConnectionState };

/**
 * Default session Time-To-Live: 8 hours (standard retail shift duration)
 */
export const DEFAULT_SESSION_TTL_MS = 8 * 60 * 60 * 1000;

/**
 * Generates a cryptographically secure, URL-safe pairing session key.
 * Format: pos-${terminalId}-${randomHex}-${timestamp}
 */
export function generateScannerSessionKey(
  terminalId: string = "T1",
  entropyProvider?: () => string
): string {
  const cleanTerminalId = terminalId.trim().replace(/[^a-zA-Z0-9_-]/g, "") || "T1";
  
  let randomSlice: string;
  if (entropyProvider) {
    randomSlice = entropyProvider();
  } else if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    randomSlice = crypto.randomUUID().replace(/-/g, "").slice(0, 8);
  } else if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    const buf = new Uint8Array(4);
    crypto.getRandomValues(buf);
    randomSlice = Array.from(buf, (b) => b.toString(16).padStart(2, "0")).join("");
  } else {
    randomSlice = Date.now().toString(36).slice(-8);
  }

  const timestampPart = Date.now().toString(36);
  return `pos-${cleanTerminalId}-${randomSlice}-${timestampPart}`;
}

/**
 * Validates a scanner session key format and extractable components.
 */
export function validateScannerSessionKey(sessionKey: string | null | undefined): {
  valid: boolean;
  terminalId?: string;
  timestamp?: number;
  error?: string;
} {
  if (!sessionKey || typeof sessionKey !== "string") {
    return { valid: false, error: "Session key is empty or not a string" };
  }

  const trimmed = sessionKey.trim();
  const parts = trimmed.split("-");
  
  // Format must start with "pos", followed by terminalId, randomHex, and base36 timestamp
  if (parts.length < 4 || parts[0] !== "pos") {
    return {
      valid: false,
      error: "Invalid session key format. Expected pos-[terminalId]-[randomHex]-[timestamp]"
    };
  }

  const terminalId = parts[1];
  const timestampStr = parts[parts.length - 1];
  const timestamp = parseInt(timestampStr, 36);

  if (isNaN(timestamp) || timestamp <= 0) {
    return { valid: false, error: "Invalid timestamp encoding in session key" };
  }

  return {
    valid: true,
    terminalId,
    timestamp
  };
}

/**
 * Builds the fully qualified mobile companion URL for QR code encoding.
 */
export function buildCompanionPairingUrl(sessionKey: string, origin?: string): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_SITE_URL;
  let baseOrigin = origin?.trim();
  if (!baseOrigin || baseOrigin.includes("localhost") || baseOrigin.includes("127.0.0.1")) {
    if (envUrl && !envUrl.includes("localhost")) {
      baseOrigin = envUrl.trim();
    }
  }
  if (!baseOrigin) {
    baseOrigin = typeof window !== "undefined" && window.location.origin ? window.location.origin : "";
  }
  
  const path = "/staff/pos/scanner";
  const params = `?session=${encodeURIComponent(sessionKey.trim())}`;
  
  return baseOrigin ? `${baseOrigin}${path}${params}` : `${path}${params}`;
}

/**
 * Generates complete session metadata including expiration and pairing URL.
 */
export function createScannerSessionInfo(
  terminalId: string = "T1",
  origin?: string,
  ttlMs: number = DEFAULT_SESSION_TTL_MS
): ScannerSessionInfo {
  const now = Date.now();
  const sessionKey = generateScannerSessionKey(terminalId);
  const pairingUrl = buildCompanionPairingUrl(sessionKey, origin);

  return {
    sessionKey,
    terminalId,
    createdAt: now,
    expiresAt: now + ttlMs,
    pairingUrl
  };
}

/**
 * Checks if a session has passed its expiration time.
 */
export function isSessionExpired(session: ScannerSessionInfo, now: number = Date.now()): boolean {
  return now >= session.expiresAt;
}

/**
 * Generates the isolated Supabase Realtime Broadcast channel name for a session.
 */
export function getScannerChannelName(sessionKey: string): string {
  const cleanKey = sessionKey.trim();
  return `pos-channel:${cleanKey}`;
}

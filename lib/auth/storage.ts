import { PortalRole } from "./types";
import { TERMINAL_ROLE_STORAGE_KEY } from "./constants";

/**
 * Hydration-safe getter for terminal role preference
 */
export function getSavedTerminalRole(): PortalRole | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const value = localStorage.getItem(TERMINAL_ROLE_STORAGE_KEY);
    if (value === "admin" || value === "staff") {
      return value as PortalRole;
    }
  } catch {
    // Gracefully handle privacy mode / disabled localStorage
  }
  return null;
}

/**
 * Setter for terminal role preference
 */
export function saveTerminalRole(role: PortalRole | null): void {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (role) {
      localStorage.setItem(TERMINAL_ROLE_STORAGE_KEY, role);
    } else {
      localStorage.removeItem(TERMINAL_ROLE_STORAGE_KEY);
    }
  } catch {
    // Gracefully handle storage quotas or restricted contexts
  }
}

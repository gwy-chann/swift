/**
 * SWIFT Role-Based Authentication Type Definitions
 * Source of truth: SIAA-8 (STORY-1.1), mockup/index.html, and specs/001-auth-hub-login-switcher/data-model.md
 */

export type PortalRole = "admin" | "staff";

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: PortalRole;
  terminalId?: string;
  createdAt?: string;
  expiresAt: number;
}

export interface LoginCredentials {
  email: string;
  password?: string;
  selectedRole: PortalRole;
  rememberTerminal: boolean;
}

export type AuthErrorCode =
  | "INVALID_CREDENTIALS"
  | "NETWORK_ERROR"
  | "USER_NOT_FOUND"
  | "ACCOUNT_LOCKED"
  | "UNKNOWN_ERROR";

export type AuthResult =
  | {
      success: true;
      redirectTo: string;
      session: UserSession;
    }
  | {
      success: false;
      error: string;
      code: AuthErrorCode;
    };

export interface DemoAccount {
  label: string;
  email: string;
  role: PortalRole;
  targetUrl: string;
  buttonLabel: string;
  defaultPassword?: string;
}

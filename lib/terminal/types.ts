export type TerminalErrorCode =
  | 'UNAUTHORIZED_TERMINAL_DEVICE'
  | 'TOKEN_EXPIRED'
  | 'DEVICE_REVOKED'
  | 'INVALID_PIN';

export interface TerminalDevice {
  terminalId: string;
  deviceToken: string;
  deviceName: string;
  isAuthorized: boolean;
  enrolledAt: string;
  lastUsedAt?: string;
  fingerprint?: string;
}

export interface TerminalRegistrationPayload {
  terminalId: string;
  deviceName: string;
  masterPin: string;
}

export interface TerminalValidationResult {
  valid: boolean;
  terminalId?: string;
  deviceName?: string;
  errorCode?: TerminalErrorCode;
  error?: string;
}

export interface TerminalEnrollmentResult {
  success: boolean;
  token?: string;
  terminalId?: string;
  deviceName?: string;
  error?: string;
  code?: TerminalErrorCode;
}

export interface TerminalResetResult {
  success: boolean;
  error?: string;
}

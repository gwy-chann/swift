import type { TerminalDevice, TerminalValidationResult } from './types.ts';

export const SWIFT_TERMINAL_DEVICE_TOKEN_KEY = 'swift_terminal_device_token';
export const DEFAULT_PRIMARY_TERMINAL_ID = 'Terminal #01';
export const DEFAULT_PRIMARY_DEVICE_NAME = 'Primary Counter Laptop';
export const DEFAULT_PRIMARY_DEVICE_TOKEN = 'term_token_swift_primary_counter_01';

/**
 * Read cookie by name in browser context
 */
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp('(^|;\\s*)(' + name + ')=([^;]*)'));
  return match ? decodeURIComponent(match[3]) : null;
}

/**
 * Set cookie in browser context
 */
function setCookie(name: string, value: string, maxAgeSeconds: number = 31536000): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAgeSeconds}; SameSite=Lax`;
}

/**
 * Delete cookie in browser context
 */
function deleteCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${name}=; path=/; max-age=0; SameSite=Lax`;
}

/**
 * Get stored terminal device details from localStorage (or cookie fallback)
 */
export function getStoredTerminalDevice(): TerminalDevice | null {
  if (typeof window === 'undefined' || !window.localStorage) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(SWIFT_TERMINAL_DEVICE_TOKEN_KEY);
    if (raw) {
      // Try parsing structured TerminalDevice JSON
      try {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object' && parsed.deviceToken) {
          return {
            terminalId: parsed.terminalId || DEFAULT_PRIMARY_TERMINAL_ID,
            deviceToken: parsed.deviceToken,
            deviceName: parsed.deviceName || DEFAULT_PRIMARY_DEVICE_NAME,
            isAuthorized: parsed.isAuthorized !== false,
            enrolledAt: parsed.enrolledAt || new Date().toISOString(),
            lastUsedAt: parsed.lastUsedAt,
            fingerprint: parsed.fingerprint,
          };
        }
      } catch {
        // Raw string fallback
        return {
          terminalId: DEFAULT_PRIMARY_TERMINAL_ID,
          deviceToken: raw,
          deviceName: DEFAULT_PRIMARY_DEVICE_NAME,
          isAuthorized: true,
          enrolledAt: new Date().toISOString(),
        };
      }
    }

    // Fallback: check cookie
    const cookieToken = getCookie(SWIFT_TERMINAL_DEVICE_TOKEN_KEY);
    if (cookieToken) {
      return {
        terminalId: DEFAULT_PRIMARY_TERMINAL_ID,
        deviceToken: cookieToken,
        deviceName: DEFAULT_PRIMARY_DEVICE_NAME,
        isAuthorized: true,
        enrolledAt: new Date().toISOString(),
      };
    }
  } catch (err) {
    console.warn('[getStoredTerminalDevice] Failed to read from storage:', err);
  }

  return null;
}

/**
 * Get stored device token string
 */
export function getStoredTerminalDeviceToken(): string | null {
  const device = getStoredTerminalDevice();
  return device ? device.deviceToken : null;
}

/**
 * Persist terminal device registration
 */
export function setStoredTerminalDevice(device: TerminalDevice): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(
        SWIFT_TERMINAL_DEVICE_TOKEN_KEY,
        JSON.stringify(device)
      );
    } catch (err) {
      console.warn('[setStoredTerminalDevice] Failed to write localStorage:', err);
    }
  }

  setCookie(SWIFT_TERMINAL_DEVICE_TOKEN_KEY, device.deviceToken);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('swift:terminal-device-changed', { detail: device })
    );
  }
}

/**
 * Helper to store terminal token by parameters
 */
export function setStoredTerminalDeviceToken(
  token: string,
  terminalId: string = DEFAULT_PRIMARY_TERMINAL_ID,
  deviceName: string = DEFAULT_PRIMARY_DEVICE_NAME
): TerminalDevice {
  const device: TerminalDevice = {
    terminalId,
    deviceToken: token,
    deviceName,
    isAuthorized: true,
    enrolledAt: new Date().toISOString(),
  };

  setStoredTerminalDevice(device);
  return device;
}

/**
 * Clear terminal device binding (e.g. for testing unauthorized devices or unenrollment)
 */
export function clearStoredTerminalDeviceToken(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.removeItem(SWIFT_TERMINAL_DEVICE_TOKEN_KEY);
    } catch (err) {
      console.warn('[clearStoredTerminalDeviceToken] Failed to remove item:', err);
    }
  }

  deleteCookie(SWIFT_TERMINAL_DEVICE_TOKEN_KEY);

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('swift:terminal-device-changed', { detail: null })
    );
  }
}

/**
 * Check if current client has an authorized terminal device token
 */
export function isTerminalEnrolled(): boolean {
  const device = getStoredTerminalDevice();
  return Boolean(device && device.isAuthorized && device.deviceToken);
}

/**
 * Primary laptop device auto-enrollment:
 * When accessed on the shop counter laptop, automatically enrolls as Terminal #01 if not yet enrolled.
 */
export function autoEnrollPrimaryTerminalIfFirstRun(): TerminalDevice {
  const existing = getStoredTerminalDevice();
  if (existing && existing.deviceToken && existing.isAuthorized) {
    return existing;
  }

  const primaryDevice: TerminalDevice = {
    terminalId: DEFAULT_PRIMARY_TERMINAL_ID,
    deviceToken: DEFAULT_PRIMARY_DEVICE_TOKEN,
    deviceName: DEFAULT_PRIMARY_DEVICE_NAME,
    isAuthorized: true,
    enrolledAt: new Date().toISOString(),
  };

  setStoredTerminalDevice(primaryDevice);
  return primaryDevice;
}

/**
 * Validate terminal device structure and authorization
 */
export function validateClientTerminalDevice(
  device?: TerminalDevice | null
): TerminalValidationResult {
  const target = device !== undefined ? device : getStoredTerminalDevice();

  if (!target || !target.deviceToken || !target.isAuthorized) {
    return {
      valid: false,
      errorCode: 'UNAUTHORIZED_TERMINAL_DEVICE',
      error: 'Clock-in is restricted to physical store counter terminals. This device is not authorized.',
    };
  }

  return {
    valid: true,
    terminalId: target.terminalId || DEFAULT_PRIMARY_TERMINAL_ID,
    deviceName: target.deviceName || DEFAULT_PRIMARY_DEVICE_NAME,
  };
}

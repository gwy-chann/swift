/**
 * In-memory cookie jar for fallback and unit testing environments
 */
export const memoryCookieJar = new Map<string, string>();

export function __setTestCookie(name: string, value: string): void {
  memoryCookieJar.set(name, value);
}

export function __getTestCookie(name: string): string | undefined {
  return memoryCookieJar.get(name);
}

export function __clearTestCookies(): void {
  memoryCookieJar.clear();
}

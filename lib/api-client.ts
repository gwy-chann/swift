/**
 * SWIFT Lean REST API Client
 * SIAA-98: Next.js Backend Decommissioning & Lean Client Architecture
 * 
 * Provides unified, type-safe HTTP communication from Next.js Server Components,
 * Server Actions, and Client Components directly to the Spring Boot REST API
 * via the Strangler Fig Reverse-Proxy Gateway.
 */

export interface ApiClientConfig {
  baseUrl?: string;
  timeoutMs?: number;
  headers?: Record<string, string>;
}

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export class LeanApiClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;

  constructor(config: ApiClientConfig = {}) {
    // Resolve gateway or direct backend URL
    this.baseUrl =
      config.baseUrl ||
      process.env.NEXT_PUBLIC_GATEWAY_URL ||
      process.env.SPRING_BACKEND_URL ||
      (typeof window !== 'undefined' ? '' : 'http://127.0.0.1:8080');

    this.timeoutMs = config.timeoutMs || 10000;
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'X-Swift-Client': 'nextjs-lean-client',
      ...(config.headers || {}),
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = endpoint.startsWith('http')
      ? endpoint
      : `${this.baseUrl}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...this.defaultHeaders,
          ...(options.headers || {}),
        },
      });

      clearTimeout(timeoutId);

      // Check for Strangler fallback telemetry header
      const wasFallback = response.headers.get('x-swift-fallback') === 'true';
      if (wasFallback && process.env.NODE_ENV !== 'production') {
        console.warn(`[ApiClient] Request to ${endpoint} served via emergency fallback.`);
      }

      // Handle non-2xx responses
      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: response.statusText };
        }

        throw new ApiClientError(
          response.status,
          errorData.code || 'API_REQUEST_FAILED',
          errorData.message || errorData.error || `HTTP ${response.status} on ${endpoint}`,
          errorData.details
        );
      }

      // Handle empty / 204 response
      if (response.status === 204) {
        return {} as T;
      }

      // Check content type for CSV streaming vs JSON
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('text/csv') || contentType.includes('text/plain')) {
        return (await response.text()) as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error: any) {
      clearTimeout(timeoutId);
      if (error instanceof ApiClientError) {
        throw error;
      }

      if (error.name === 'AbortError') {
        throw new ApiClientError(408, 'REQUEST_TIMEOUT', `Request to ${endpoint} timed out after ${this.timeoutMs}ms.`);
      }

      throw new ApiClientError(500, 'NETWORK_ERROR', error.message || 'Network communication failure with backend.');
    }
  }

  public async get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET', headers });
  }

  public async post<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async put<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async patch<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public async delete<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', headers });
  }
}

export const apiClient = new LeanApiClient();
export default apiClient;

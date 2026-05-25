/**
 * API utility functions for communicating with the PodCraft backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/** Unified API response shape returned by the backend. */
export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

/** Shape of a paginated response. */
export interface PaginatedData<T = unknown> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

/** Options that can be passed to apiRequest. */
interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

/**
 * Low-level fetch wrapper that adds common headers and parses the unified
 * ``{code, data, message}`` response envelope.
 *
 * @throws `ApiError` when the backend returns ``code !== 0`` or a network error occurs.
 */
async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  } catch {
    throw new ApiError(0, "Network error — please check your connection");
  }

  let body: ApiResponse;
  try {
    body = (await response.json()) as ApiResponse;
  } catch {
    throw new ApiError(response.status, `Unexpected response: ${response.status}`);
  }

  if (body.code !== 0) {
    throw new ApiError(body.code, body.message || "Unknown error");
  }

  return body.data as T;
}

/** Error thrown when an API call returns ``code !== 0``. */
export class ApiError extends Error {
  code: number;

  constructor(code: number, message: string) {
    super(message);
    this.code = code;
    this.name = "ApiError";
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

export async function get<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "GET" });
}

export async function post<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "POST", body });
}

export async function patch<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "PATCH", body });
}

export async function del<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Domain-specific API calls
// ---------------------------------------------------------------------------

/** Health check — verify the backend API is reachable. */
export async function checkHealth(): Promise<{ status: string }> {
  return get<{ status: string }>("/api/health");
}

/** Get current user's credit balance. */
export async function getCreditBalance(): Promise<{ balance: number; frozen: number }> {
  return get<{ balance: number; frozen: number }>("/api/credits/balance");
}

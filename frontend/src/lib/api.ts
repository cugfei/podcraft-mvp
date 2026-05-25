/**
 * API utility functions for communicating with the backend.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/**
 * Perform a fetch request to the backend API.
 *
 * @param endpoint - The API endpoint path (e.g., "/api/health")
 * @param options - Optional fetch options
 * @returns The parsed JSON response
 */
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json() as Promise<T>;
}

/**
 * Health check - verify the backend API is reachable.
 */
export async function checkHealth(): Promise<{ status: string }> {
  return fetchApi<{ status: string }>("/api/health");
}

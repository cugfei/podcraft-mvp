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

export async function put<T>(endpoint: string, body?: unknown, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "PUT", body });
}

export async function del<T>(endpoint: string, options?: ApiRequestOptions): Promise<T> {
  return apiRequest<T>(endpoint, { ...options, method: "DELETE" });
}

// ---------------------------------------------------------------------------
// Authentication
// ---------------------------------------------------------------------------

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  email?: string;
  phone?: string;
  password: string;
  nickname?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_id: string;
  email?: string;
  nickname?: string;
}

/** Login with email/phone + password. Returns AuthResponse. */
export async function login(
  data: LoginRequest
): Promise<AuthResponse> {
  return post<AuthResponse>("/api/v1/auth/login", data);
}

/** Register a new user. Returns AuthResponse. */
export async function register(
  data: RegisterRequest
): Promise<AuthResponse> {
  return post<AuthResponse>("/api/v1/auth/register", data);
}

/** Get current user info (requires auth). */
export async function getMe(): Promise<AuthResponse & { role: string; status: string }> {
  return get<AuthResponse & { role: string; status: string }>("/api/v1/auth/me");
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

// ---------------------------------------------------------------------------
// Podcast Projects
// ---------------------------------------------------------------------------

export interface PodcastRole {
  id: string;
  role_key: string;
  name: string;
  persona?: string;
  voice_id?: string;
  speed: number;
  pitch: number;
  volume: number;
  color?: string;
}

export interface PodcastSegment {
  id: string;
  script_id: string;
  role_id: string;
  sort_order: number;
  text: string;
  emotion?: string;
  pause_after_ms: number;
  status: string;
  error_message?: string;
  role?: { id: string; name: string; color: string };
  audio_asset?: { id: string; file_path: string; duration_seconds: number };
}

export interface PodcastScript {
  id: string;
  project_id: string;
  outline?: string;
  script_content?: string;
  status: string;
  segments?: PodcastSegment[];
}

export interface PodcastProject {
  id: string;
  user_id: string;
  title: string;
  mode: string;
  style: string;
  target_duration?: number;
  status: string;
  created_at: string;
  updated_at: string;
  script?: PodcastScript;
  roles?: PodcastRole[];
  final_audio_asset?: { id: string; file_path: string; duration_seconds: number };
}

export interface CreatePodcastRequest {
  title: string;
  mode?: string;
  style?: string;
  target_duration?: number;
}

export interface UpdatePodcastRequest {
  title?: string;
  mode?: string;
  style?: string;
  target_duration?: number;
  status?: string;
}

export interface UpdateScriptRequest {
  outline?: string;
  script_content?: string;
}

/** List podcast projects. */
export async function listPodcasts(params?: {
  status?: string;
  skip?: number;
  limit?: number;
}): Promise<{ items: PodcastProject[]; total: number; skip: number; limit: number }> {
  const qs = new URLSearchParams();
  if (params?.status) qs.set("status", params.status);
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return get<{ items: PodcastProject[]; total: number; skip: number; limit: number }>(
    `/api/podcasts/list${q ? "?" + q : ""}`
  );
}

/** Create a new podcast project. */
export async function createPodcast(
  data: CreatePodcastRequest
): Promise<PodcastProject> {
  return post<PodcastProject>("/api/podcasts/", data);
}

/** Get a single podcast project by ID. */
export async function getPodcast(projectId: string): Promise<PodcastProject> {
  return get<PodcastProject>(`/api/podcasts/${projectId}`);
}

/** Update a podcast project. */
export async function updatePodcast(
  projectId: string,
  data: UpdatePodcastRequest
): Promise<PodcastProject> {
  return put<PodcastProject>(`/api/podcasts/${projectId}`, data);
}

/** Delete a podcast project. */
export async function deletePodcast(projectId: string): Promise<void> {
  return del<void>(`/api/podcasts/${projectId}`);
}

/** Update a podcast's script. */
export async function updateScript(
  projectId: string,
  data: UpdateScriptRequest
): Promise<PodcastScript> {
  return put<PodcastScript>(`/api/podcasts/${projectId}/script`, data);
}

// ---------------------------------------------------------------------------
// Segments
// ---------------------------------------------------------------------------

export interface CreateSegmentRequest {
  role_key?: string;
  text: string;
  emotion?: string;
  pause_after_ms?: number;
}

export interface UpdateSegmentRequest {
  text?: string;
  emotion?: string;
  pause_after_ms?: number;
  sort_order?: number;
}

export interface ReorderSegmentsRequest {
  segment_ids: string[];
}

/** List segments for a podcast project. */
export async function listSegments(
  projectId: string
): Promise<PodcastSegment[]> {
  return get<PodcastSegment[]>(`/api/podcasts/${projectId}/segments`);
}

/** Create a new segment. */
export async function createSegment(
  projectId: string,
  data: CreateSegmentRequest
): Promise<PodcastSegment> {
  return post<PodcastSegment>(`/api/podcasts/${projectId}/segments`, data);
}

/** Update a segment. */
export async function updateSegment(
  segmentId: string,
  data: UpdateSegmentRequest
): Promise<PodcastSegment> {
  return put<PodcastSegment>(`/api/segments/${segmentId}`, data);
}

/** Delete a segment. */
export async function deleteSegment(segmentId: string): Promise<void> {
  return del<void>(`/api/segments/${segmentId}`);
}

/** Reorder segments. */
export async function reorderSegments(
  projectId: string,
  segmentIds: string[]
): Promise<PodcastSegment[]> {
  return post<PodcastSegment[]>(
    `/api/podcasts/${projectId}/segments/reorder`,
    { segment_ids: segmentIds }
  );
}

/** Trigger TTS synthesis for a single segment (preview). */
export async function synthesizeSegment(
  segmentId: string
): Promise<{ status: string }> {
  return post<{ status: string }>(`/api/segments/${segmentId}/synthesize`);
}

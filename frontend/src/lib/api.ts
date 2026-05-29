/**
 * API utility functions for communicating with the PodCraft backend.
 *
 * Includes auto-refresh of access token on 401 responses.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

// ---------------------------------------------------------------------------
// Auth callbacks (injected by AuthContext)
// ---------------------------------------------------------------------------
type RefreshFn = () => Promise<string | null>;
type LogoutFn = () => void;

let _refreshFn: RefreshFn | null = null;
let _logoutFn: LogoutFn | null = null;

/** Called by AuthContext on mount to wire refresh/logout callbacks. */
export function setAuthCallbacks(opts: {
  onRefresh: RefreshFn;
  onLogout: LogoutFn;
}) {
  _refreshFn = opts.onRefresh;
  _logoutFn = opts.onLogout;
}

// ---------------------------------------------------------------------------
// Unified API response shape
// ---------------------------------------------------------------------------

export interface ApiResponse<T = unknown> {
  code: number;
  data: T;
  message: string;
}

export interface PaginatedData<T = unknown> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

// ---------------------------------------------------------------------------
// Low-level fetch wrapper with auto-refresh
// ---------------------------------------------------------------------------

let _isRefreshing = false;
let _refreshPromise: Promise<string | null> | null = null;

async function apiRequest<T>(endpoint: string, options: ApiRequestOptions = {}): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const makeHeaders = (): Record<string, string> => {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
    }
    return headers;
  };

  const doFetch = async (): Promise<Response> => {
    const headers = makeHeaders();
    return fetch(url, {
      ...options,
      headers: { ...headers, ...(options.headers as Record<string, string>) },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  };

  let response: Response;
  try {
    response = await doFetch();
  } catch {
    throw new ApiError(0, "Network error — please check your connection");
  }

  if (response.status === 401 && typeof window !== "undefined") {
    // Try to refresh the access token
    if (!_refreshFn) {
      throw new ApiError(401, "Unauthenticated");
    }

    try {
      let newToken: string | null = null;
      if (!_isRefreshing) {
        _isRefreshing = true;
        _refreshPromise = _refreshFn();
        newToken = await _refreshPromise;
        _isRefreshing = false;
      } else {
        newToken = await _refreshPromise;
      }

      if (!newToken) {
        _logoutFn?.();
        throw new ApiError(401, "Session expired — please log in again");
      }

      localStorage.setItem("token", newToken);
      // Retry the original request with the new token
      const headers = makeHeaders();
      response = await fetch(url, {
        ...options,
        headers: { ...headers, ...(options.headers as Record<string, string>) },
        body: options.body ? JSON.stringify(options.body) : undefined,
      });
    } catch (refreshErr) {
      _logoutFn?.();
      throw refreshErr instanceof ApiError
        ? refreshErr
        : new ApiError(401, "Session expired — please log in again");
    }
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

// ---------------------------------------------------------------------------
// Error class
// ---------------------------------------------------------------------------

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
  refresh_token: string;
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

/** Refresh access token using a refresh token. */
export async function refreshTokenRequest(
  refreshToken: string
): Promise<{ access_token: string; token_type: string }> {
  const url = `${API_BASE_URL}/api/v1/auth/refresh`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  if (!response.ok) {
    throw new Error("Refresh failed");
  }
  const body = await response.json();
  if (body.code !== 0) {
    throw new Error(body.message || "Refresh failed");
  }
  return { access_token: body.data.access_token, token_type: body.data.token_type };
}

/** Get current user info (requires auth). */
export async function getMe(): Promise<
  AuthResponse & { role: string; status: string }
> {
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
export async function getCreditBalance(): Promise<{
  balance: number;
  frozen: number;
  available: number;
  total_recharged: number;
  total_consumed: number;
}> {
  return get<{
    balance: number;
    frozen: number;
    available: number;
    total_recharged: number;
    total_consumed: number;
  }>("/api/v1/credits/balance");
}

/** Get current user's credit ledger (transactions). */
export async function getMyCreditLedger(params?: {
  tx_type?: string;
  skip?: number;
  limit?: number;
}): Promise<{ items: CreditTransaction[]; total: number }> {
  const qs = new URLSearchParams();
  if (params?.tx_type) qs.set("tx_type", params.tx_type);
  if (params?.skip !== undefined) qs.set("skip", String(params.skip));
  if (params?.limit !== undefined) qs.set("limit", String(params.limit));
  const q = qs.toString();
  return get<{ items: CreditTransaction[]; total: number }>(
    `/api/v1/credits/ledger${q ? "?" + q : ""}`
  );
}

/** Check if daily login grant is available. */
export async function getDailyGrantStatus(): Promise<{ granted: boolean; message: string }> {
  return get<{ granted: boolean; message: string }>("/api/v1/credits/daily-grant-status");
}

/** Claim daily login grant (50 credits). */
export async function claimDailyGrant(): Promise<{
  granted: number;
  balance: number;
  message: string;
}> {
  return post<{
    granted: number;
    balance: number;
    message: string;
  }>("/api/v1/credits/daily-grant", {});
}

/** Recharge with card key. */
export async function rechargeWithCard(cardKey: string): Promise<{
  credits_granted: number;
  balance: number;
  message: string;
}> {
  return post<{
    credits_granted: number;
    balance: number;
    message: string;
  }>("/api/v1/orders/verify-card", { card_key: cardKey });
}

/** Get credit plans (packages). */
export async function getCreditPlans(): Promise<{ id: string; name: string; price: number; credits: number }[]> {
  const data = await get<{ items: { id: string; name: string; price: number; credits: number }[] }>("/api/v1/orders/plans");
  return data.items || [];
}

// ---------------------------------------------------------------------------
// Types for credits
// ---------------------------------------------------------------------------

export interface CreditTransaction {
  id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  created_at: string;
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
  final_audio_asset?: {
    id: string;
    url?: string;
    duration_seconds?: number;
    duration_ms?: number;
    file_size?: number;
  };
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
    `/api/v1/podcasts/list${q ? "?" + q : ""}`
  );
}

/** Create a new podcast project. */
export async function createPodcast(
  data: CreatePodcastRequest
): Promise<PodcastProject> {
  return post<PodcastProject>("/api/v1/podcasts/", data);
}

/** Get a single podcast project by ID. */
export async function getPodcast(projectId: string): Promise<PodcastProject> {
  return get<PodcastProject>(`/api/v1/podcasts/${projectId}`);
}

/** Update a podcast project. */
export async function updatePodcast(
  projectId: string,
  data: UpdatePodcastRequest
): Promise<PodcastProject> {
  return put<PodcastProject>(`/api/v1/podcasts/${projectId}`, data);
}

/** Delete a podcast project. */
export async function deletePodcast(projectId: string): Promise<void> {
  return del<void>(`/api/v1/podcasts/${projectId}`);
}

/** Update a podcast's script. */
export async function updateScript(
  projectId: string,
  data: UpdateScriptRequest
): Promise<PodcastScript> {
  return put<PodcastScript>(`/api/v1/podcasts/${projectId}/script`, data);
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
  return get<PodcastSegment[]>(`/api/v1/segments/podcasts/${projectId}/segments`);
}

/** Create a new segment. */
export async function createSegment(
  projectId: string,
  data: CreateSegmentRequest
): Promise<PodcastSegment> {
  return post<PodcastSegment>(`/api/v1/segments/podcasts/${projectId}/segments`, data);
}

/** Update a segment. */
export async function updateSegment(
  segmentId: string,
  data: UpdateSegmentRequest
): Promise<PodcastSegment> {
  return put<PodcastSegment>(`/api/v1/segments/segments/${segmentId}`, data);
}

/** Delete a segment. */
export async function deleteSegment(segmentId: string): Promise<void> {
  return del<void>(`/api/v1/segments/segments/${segmentId}`);
}

/** Reorder segments. */
export async function reorderSegments(
  projectId: string,
  segmentIds: string[]
): Promise<PodcastSegment[]> {
  return post<PodcastSegment[]>(
    `/api/v1/segments/podcasts/${projectId}/segments/reorder`,
    { segment_ids: segmentIds }
  );
}

/** Trigger TTS synthesis for a single segment (preview). */
export async function synthesizeSegment(
  segmentId: string
): Promise<{ status: string }> {
  return post<{ status: string }>(`/api/v1/segments/segments/${segmentId}/synthesize`);
}

/** Upload an audio file (reference, background music, etc.). */
export async function uploadAudio(file: File): Promise<{ id: string; filename: string; file_path: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const url = `${API_BASE_URL}/api/v1/upload/audio`;
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {};
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: formData,
  });
  if (!response.ok) {
    throw new ApiError(response.status, `Upload failed: ${response.statusText}`);
  }
  const body = (await response.json()) as ApiResponse<{ id: string; filename: string; file_path: string }>;
  if (body.code !== 0) {
    throw new ApiError(body.code, body.message || "Upload failed");
  }
  return body.data;
}

// ---------------------------------------------------------------------------
// Extended Podcast & Segment APIs (T-3.5 ~ T-3.8)
// ---------------------------------------------------------------------------

/** Rebuild full podcast audio by concatenating completed segment audio. */
export async function rebuildAudio(
  projectId: string
): Promise<{ id: string; url: string; duration_ms: number }> {
  return post<{ id: string; url: string; duration_ms: number }>(
    `/api/v1/podcasts/${projectId}/rebuild-audio`
  );
}

/** Change a role's voice and mark all its segments as draft. */
export interface ChangeVoiceRequest {
  voice_id: string;
  speed?: number;
  pitch?: number;
  volume?: number;
}

export async function changeVoice(
  roleId: string,
  data: ChangeVoiceRequest
): Promise<PodcastRole> {
  return post<PodcastRole>(`/api/v1/podcasts/roles/${roleId}/change-voice`, data);
}

/** Get a single segment by ID (for polling synthesis status). */
export async function getSegment(segmentId: string): Promise<PodcastSegment> {
  return get<PodcastSegment>(`/api/v1/segments/segments/${segmentId}`);
}

/** Helper: convert a backend audio asset URL to a full, usable src. */
export function getAudioSrc(assetUrl?: string): string {
  if (!assetUrl) return "";
  if (assetUrl.startsWith("http")) return assetUrl;
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
  return `${base}${assetUrl}`;
}

// ---------------------------------------------------------------------------
// Admin APIs (T-4.9 / T-3.10)
// ---------------------------------------------------------------------------

export interface AdminUser { id: string; email: string; nickname: string; role: string; status: string; created_at: string; credit_balance: number; }
export interface CreditTx { id: string; user_id: string; type: string; amount: number; balance_after: number; reference_type: string; description: string; created_at: string; }
export interface AdminPodcast { id: string; title: string; mode: string; status: string; target_duration: number; created_at: string; }
export interface AdminTask { id: string; project_id: string; user_id: string; type: string; status: string; total_segments: number; completed_segments: number; error_message: string; created_at: string; }
export interface AdminVoice { id: string; provider: string; provider_voice_id: string; name: string; language: string; is_cloned: boolean; }
export interface ProviderConfig { primary: string; fallback: string; minimax_api_key: string; mimo_api_key: string; edge_tts_enabled: boolean; }
export interface Plan { id: string; name: string; price: number; credits: number; }

export async function listAdminUsers(q = "", status = "", skip = 0, limit = 20): Promise<{ total: number; items: AdminUser[] }> {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (status) params.set("status", status);
  params.set("skip", skip.toString());
  params.set("limit", limit.toString());
  return get<{ total: number; items: AdminUser[] }>(`/api/v1/admin/users?${params.toString()}`);
}

export async function adjustCredit(userId: string, amount: number, reason = "admin_adjust"): Promise<{ balance: number }> {
  return post<{ balance: number }>("/api/v1/admin/credits/adjust", { user_id: userId, amount, reason });
}

export async function disableUser(userId: string): Promise<void> {
  return patch<void>(`/api/v1/admin/users/${userId}/disable`);
}

export async function enableUser(userId: string): Promise<void> {
  return patch<void>(`/api/v1/admin/users/${userId}/enable`);
}

export async function getCreditLedger(userId = "", txType = "", skip = 0, limit = 50): Promise<{ total: number; items: CreditTx[] }> {
  const params = new URLSearchParams();
  if (userId) params.set("user_id", userId);
  if (txType) params.set("tx_type", txType);
  params.set("skip", skip.toString());
  params.set("limit", limit.toString());
  return get<{ total: number; items: CreditTx[] }>(`/api/v1/admin/credits/ledger?${params.toString()}`);
}

export async function listAdminPodcasts(status = "", skip = 0, limit = 20): Promise<{ total: number; items: AdminPodcast[] }> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  params.set("skip", skip.toString());
  params.set("limit", limit.toString());
  return get<{ total: number; items: AdminPodcast[] }>(`/api/v1/admin/podcasts?${params.toString()}`);
}

export async function deletePodcastAdmin(projectId: string): Promise<void> {
  return del<void>(`/api/v1/admin/podcasts/${projectId}`);
}

export async function listSynthesisTasksAdmin(status = "", userId = "", skip = 0, limit = 20): Promise<{ total: number; items: AdminTask[] }> {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (userId) params.set("user_id", userId);
  params.set("skip", skip.toString());
  params.set("limit", limit.toString());
  return get<{ total: number; items: AdminTask[] }>(`/api/v1/admin/synthesis-tasks?${params.toString()}`);
}

export async function listErrorLogs(skip = 0, limit = 50): Promise<{ total: number; items: []; note: string }> {
  const params = new URLSearchParams();
  params.set("skip", skip.toString());
  params.set("limit", limit.toString());
  return get<{ total: number; items: []; note: string }>(`/api/v1/admin/error-logs?${params.toString()}`);
}

export async function listAllVoices(): Promise<{ items: AdminVoice[] }> {
  return get<{ items: AdminVoice[] }>("/api/v1/admin/voices");
}

export async function createVoice(data: Partial<AdminVoice>): Promise<AdminVoice> {
  return post<AdminVoice>("/api/v1/admin/voices", data);
}

export async function updateVoice(voiceId: string, data: Partial<AdminVoice>): Promise<AdminVoice> {
  return patch<AdminVoice>(`/api/v1/admin/voices/${voiceId}`, data);
}

export async function deleteVoice(voiceId: string): Promise<void> {
  return del<void>(`/api/v1/admin/voices/${voiceId}`);
}

export async function getProviderConfig(): Promise<ProviderConfig> {
  return get<ProviderConfig>("/api/v1/admin/providers");
}

export async function updateProviderConfig(data: Partial<ProviderConfig>): Promise<ProviderConfig> {
  return patch<ProviderConfig>("/api/v1/admin/providers", data);
}

export async function listPlans(): Promise<{ items: Plan[] }> {
  return get<{ items: Plan[] }>("/api/v1/admin/plans");
}

export async function createPlan(data: Partial<Plan>): Promise<Plan> {
  return post<Plan>("/api/v1/admin/plans", data);
}

export async function updatePlan(planId: string, data: Partial<Plan>): Promise<Plan> {
  return patch<Plan>(`/api/v1/admin/plans/${planId}`, data);
}

export async function deletePlan(planId: string): Promise<void> {
  return del<void>(`/api/v1/admin/plans/${planId}`);
}

// ---------------------------------------------------------------------------
// Voice API (Public)
// ---------------------------------------------------------------------------

export interface Voice {
  id: string;
  name: string;
  provider: string;
  provider_voice_id: string;
  gender: string;
  language: string;
  preview_text?: string;
}

export async function getVoices(language?: string, gender?: string, provider?: string): Promise<Voice[]> {
  const params = new URLSearchParams();
  if (language) params.set("language", language);
  if (gender) params.set("gender", gender);
  if (provider) params.set("provider", provider);
  const query = params.toString();
  return get<Voice[]>(`/api/v1/voices${query ? `?${query}` : ""}`);
}

"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";

// ---------------------------------------------------------------------------
// Constants — markers per PRD §7.5
// ---------------------------------------------------------------------------
const EMOTION_OPTIONS = [
  { value: "", label: "默认" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "calm", label: "平静" },
  { value: "excited", label: "兴奋" },
];

const PAUSE_MARKERS = [
  { tag: "<#0.5#>", label: "短停顿" },
  { tag: "<#1.0#>", label: "中停顿" },
  { tag: "<#2.0#>", label: "长停顿" },
];

const MULTI_PRONUNCIATION = [
  { char: "行", readings: ["xíng（行走）", "háng（行业）"] },
  { char: "乐", readings: ["lè（快乐）", "yuè（音乐）"] },
  { char: "长", readings: ["cháng（长度）", "zhǎng（生长）"] },
  { char: "重", readings: ["zhòng（重量）", "chóng（重复）"] },
  { char: "都", readings: ["dōu（都是）", "dū（首都）"] },
  { char: "着", readings: ["zhe（看着）", "zháo（着急）", "zhuó（穿着）"] },
];

const TONE_WORDS = [
  { tag: "(laughs)", label: "笑声" },
  { tag: "(sighs)", label: "叹气" },
  { tag: "(pauses)", label: "停顿" },
  { tag: "(whispers)", label: "耳语" },
];

const AI_OPTIMIZE_PROMPTS = [
  { value: "polish", label: "润色通顺" },
  { value: "shorten", label: "精简压缩" },
  { value: "expand", label: "扩充内容" },
  { value: "casual", label: "口语化" },
  { value: "formal", label: "正式化" },
];

// ---------------------------------------------------------------------------
// SVG Icon Components
// ---------------------------------------------------------------------------
const Icons = {
  Logo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
      <path d="M6 18l6-12 6 12M8.5 13h7"/>
    </svg>
  ),
  Mic: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/>
      <line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  Chat: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
    </svg>
  ),
  Settings: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  ),
  Pause: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>
    </svg>
  ),
  Polyphone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/>
    </svg>
  ),
  Tone: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z"/>
      <path d="M19 10v2a7 7 0 01-14 0v-2"/>
      <line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
    </svg>
  ),
  Info: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
    </svg>
  ),
  Clear: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  ),
  Upload: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3 h-3">
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  ),
  Trash: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
    </svg>
  ),
  Play: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <polygon points="5 3 19 12 5 21 5 3"/>
    </svg>
  ),
  Undo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
    </svg>
  ),
  Redo: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
    </svg>
  ),
  Edit: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
    </svg>
  ),
  AI: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
    </svg>
  ),
  Save: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>
    </svg>
  ),
  Cancel: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  History: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-4 h-4">
      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/>
    </svg>
  ),
  Bold: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M6 4h8a4 4 0 014 4 4 4 0 01-4 4H6z"/><path d="M6 12h9a4 4 0 014 4 4 4 0 01-4 4H6z"/>
    </svg>
  ),
  Italic: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>
    </svg>
  ),
  Flag: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="w-3.5 h-3.5">
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/>
    </svg>
  ),
};

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface PodcastRole {
  id: string;
  role_key: string;
  name: string;
  voice_id?: string;
  color?: string;
}

interface PodcastProject {
  id: string;
  title: string;
  status: string;
  mode: string;
  roles?: PodcastRole[];
}

interface PodcastSegment {
  id: string;
  text: string;
  role_id?: string;
  role?: { name: string; role_key?: string; color?: string };
  emotion?: string;
  pause_after_ms?: number;
  status: string;
  audio_asset?: { id: string; url: string; duration_ms: number; format: string } | null;
  error_message?: string;
}

interface EditingState {
  [segId: string]: {
    text: string;
    emotion: string;
    pause_after_ms: number;
  };
}

// ---------------------------------------------------------------------------
// API helpers (simplified — keep your existing imports)
// ---------------------------------------------------------------------------
const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8033";

async function apiFetch<T>(path: string, opts?: RequestInit): Promise<T> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) {
    throw new Error("未登录，请先登录后再试");
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...(opts?.headers as Record<string, string> || {}),
  };
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  } catch (fetchErr) {
    throw new Error(`网络请求失败，请检查后端服务是否运行 (${API_BASE})`);
  }
  const body = await res.json().catch(() => ({}));

  // Handle API response format: { code: 0, data: T, message: string }
  if (body.code !== undefined && body.code !== 0) {
    throw new Error(body.message || `API error ${body.code}`);
  }

  if (!res.ok) {
    throw new Error(body.detail || body.message || `API error ${res.status}`);
  }

  return body.data !== undefined ? body.data : body;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function EditorPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  // Core state
  const [project, setProject] = React.useState<PodcastProject | null>(null);
  const [segments, setSegments] = React.useState<PodcastSegment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [successMsg, setSuccessMsg] = React.useState("");
  const [balance, setBalance] = React.useState<number | null>(null);
  const [voices, setVoices] = React.useState<Array<{id: string; name: string; provider: string; provider_voice_id: string; gender: string; language: string}>>([]);
  const [voiceModel, setVoiceModel] = React.useState("mimo");
  const [duoVoiceModel, setDuoVoiceModel] = React.useState("mimo");
  const [duoRoleAVoice, setDuoRoleAVoice] = React.useState("");
  const [duoRoleBVoice, setDuoRoleBVoice] = React.useState("");

  // Editing state
  const [editingSegId, setEditingSegId] = React.useState<string | null>(null);
  const [editing, setEditing] = React.useState<EditingState>({});

  // New segment
  const [newSegText, setNewSegText] = React.useState("");
  const [newSegRole, setNewSegRole] = React.useState("host");
  const [newSegEmotion, setNewSegEmotion] = React.useState("");
  const [newSegPause, setNewSegPause] = React.useState(700);

  // Bulk selection
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [bulkEmotion, setBulkEmotion] = React.useState("");
  const [bulkPause, setBulkPause] = React.useState("");

  // AI optimize
  const [aiDialogOpen, setAiDialogOpen] = React.useState(false);
  const [aiSegId, setAiSegId] = React.useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = React.useState("");
  const [aiCustomPrompt, setAiCustomPrompt] = React.useState("");
  const [aiLoading, setAiLoading] = React.useState(false);

  // Mark insertion
  const [markMenuOpen, setMarkMenuOpen] = React.useState(false);
  const [markTargetSegId, setMarkTargetSegId] = React.useState<string | null>(null);

  // Multi-pronunciation
  const [multiProDialogOpen, setMultiProDialogOpen] = React.useState(false);
  const [multiProChar, setMultiProChar] = React.useState("");
  const [multiProReading, setMultiProReading] = React.useState("");

  // Audio
  const [fullAudioUrl, setFullAudioUrl] = React.useState<string | null>(null);
  const [fullAudioFilename, setFullAudioFilename] = React.useState("");
  const [buildLoading, setBuildLoading] = React.useState(false);
  const [synthesizingId, setSynthesizingId] = React.useState<string | null>(null);
  const [synthesisAudio, setSynthesisAudio] = React.useState<{url: string; filename: string} | null>(null);

  // SSE
  const [sseActive, setSseActive] = React.useState(false);
  const [sseProgress, setSseProgress] = React.useState<{current: number; total: number; message: string}>({ current: 0, total: 0, message: "" });
  const sseAbortRef = React.useRef<AbortController | null>(null);

  // Progressive audio playback (dual-buffer)
  const [progressiveQueue, setProgressiveQueue] = React.useState<Array<{url: string; segmentId: string; durationMs: number}>>([]);
  const [progressivePlayingIndex, setProgressivePlayingIndex] = React.useState(-1);
  const progressiveAudioRef0 = React.useRef<HTMLAudioElement>(null);
  const progressiveAudioRef1 = React.useRef<HTMLAudioElement>(null);
  const [progressiveActivePlayer, setProgressiveActivePlayer] = React.useState(0);

  // Right panel (settings) for solo mode
  const [rightPanelTab, setRightPanelTab] = React.useState<"settings" | "history">("settings");

  // Undo/redo
  const undoStack = React.useRef<Array<{ segs: PodcastSegment[] }>>([]);
  const redoStack = React.useRef<Array<{ segs: PodcastSegment[] }>>([]);

  // Batch input for duo mode
  const [batchInput, setBatchInput] = React.useState("");

  // Voice settings
  const [voiceSettings, setVoiceSettings] = React.useState({
    speed: 1.0,
    pitch: 0,
    volume: 1.0,
    tonePitch: 0,
    intensity: 0,
    timbre: 0,
    effect: "none",
    langEnhance: "auto",
    voiceType: "official" as "official" | "clone",
    voiceId: "",
  });

  // Computed
  const isDuoMode = project?.mode === "duo";
  const totalChars = React.useMemo(() => {
    // Solo mode: count input text only
    if (!isDuoMode) {
      return newSegText?.length || 0;
    }
    // Duo mode: count segments
    if (editingSegId && editing[editingSegId]) {
      return editing[editingSegId].text.length;
    }
    const segmentChars = segments.reduce((sum, s) => sum + (s.text?.length || 0), 0);
    const inputChars = newSegText?.length || 0;
    return segmentChars + inputChars;
  }, [segments, editing, editingSegId, newSegText, isDuoMode]);
  const estimatedCredits = totalChars + 20;
  const insufficientBalance = balance !== null && estimatedCredits > balance;

  // -----------------------------------------------------------------------
  // Data loading
  // -----------------------------------------------------------------------
  const pushUndo = React.useCallback((segs: PodcastSegment[]) => {
    undoStack.current.push({ segs: JSON.parse(JSON.stringify(segs)) });
    if (undoStack.current.length > 30) undoStack.current.shift();
    redoStack.current = [];
  }, []);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [proj, segs] = await Promise.all([
        apiFetch<PodcastProject>(`/api/v1/podcasts/${projectId}`),
        apiFetch<PodcastSegment[]>(`/api/v1/segments/podcasts/${projectId}/segments`),
      ]);
      setProject(proj);
      setSegments(segs);
      undoStack.current = [];
      redoStack.current = [];
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const loadBalance = React.useCallback(async () => {
    try {
      const data = await apiFetch<{ balance: number }>("/api/v1/credits/balance");
      setBalance(data.balance);
    } catch {
      setBalance(500);
    }
  }, []);

  const loadVoices = React.useCallback(async (provider?: string) => {
    try {
      const url = provider ? `/api/v1/voices?provider=${provider}` : "/api/v1/voices";
      const data = await apiFetch<Array<{id: string; name: string; provider: string; provider_voice_id: string; gender: string; language: string}>>(url);
      setVoices(data);
    } catch {
      setVoices([]);
    }
  }, []);

  React.useEffect(() => {
    if (!projectId) return;
    loadData();
    loadBalance();
    loadVoices(voiceModel);
  }, [projectId, loadData, loadBalance, loadVoices, voiceModel]);

  // Auto-display audio for solo (individual) or duo (merged) mode
  const audioLoadAttempted = React.useRef(false);

  React.useEffect(() => {
    if (segments.length === 0) return;
    if (audioLoadAttempted.current) return;
    
    if (!isDuoMode) {
      // Solo: find a completed segment
      const completed = segments.find(s => s.status === "completed" && s.audio_asset?.url);
      if (completed?.audio_asset?.url) {
        setSynthesisAudio({
          url: `${API_BASE}${completed.audio_asset.url}`,
          filename: `segment_${completed.id}.wav`,
        });
        audioLoadAttempted.current = true;
      }
    } else {
      // Duo: check if all completed, then try to load merged audio
      const allDone = segments.length > 0 && segments.every(s => s.status === "completed");
      if (allDone) {
        audioLoadAttempted.current = true;
        // Try to load merged audio
        apiFetch<{ url: string }>(`/api/v1/podcasts/${projectId}/rebuild-audio`, { method: "POST" })
          .then((result) => {
            setSynthesisAudio({
              url: `${API_BASE}${result.url}`,
              filename: `full_${projectId}.wav`,
            });
          })
          .catch(() => {
            // Fallback: show last completed segment
            const last = [...segments].reverse().find(s => s.status === "completed" && s.audio_asset?.url);
            if (last?.audio_asset?.url) {
              setSynthesisAudio({
                url: `${API_BASE}${last.audio_asset.url}`,
                filename: `segment_${last.id}.wav`,
              });
            }
          });
      }
    }
  }, [segments, isDuoMode, projectId]);

  // -----------------------------------------------------------------------
  // Segment operations
  // -----------------------------------------------------------------------
  const startEditing = (seg: PodcastSegment) => {
    setEditingSegId(seg.id);
    setEditing((prev) => ({
      ...prev,
      [seg.id]: {
        text: seg.text,
        emotion: seg.emotion || "",
        pause_after_ms: seg.pause_after_ms || 700,
      },
    }));
  };

  const cancelEditing = () => {
    if (editingSegId) {
      setEditing((prev) => {
        const next = { ...prev };
        delete next[editingSegId];
        return next;
      });
    }
    setEditingSegId(null);
  };

  const saveEditing = async (segId: string) => {
    const draft = editing[segId];
    if (!draft) return;
    setSaving(true);
    setError("");
    pushUndo(segments);
    try {
      const updated = await apiFetch<PodcastSegment>(`/api/v1/segments/segments/${segId}`, {
        method: "PATCH",
        body: JSON.stringify({
          text: draft.text,
          emotion: draft.emotion || undefined,
          pause_after_ms: draft.pause_after_ms,
        }),
      });
      setSegments((prev) =>
        prev.map((s) => (s.id === segId ? { ...s, ...updated, status: "draft" as const } : s))
      );
      setEditingSegId(null);
      setSuccessMsg("片段已保存");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleEditingChange = (segId: string, field: string, value: unknown) => {
    setEditing((prev) => ({
      ...prev,
      [segId]: { ...prev[segId], [field]: value },
    }));
  };

  const insertMark = (tag: string) => {
    setMarkMenuOpen(false);
    if (markTargetSegId && editing[markTargetSegId]) {
      handleEditingChange(markTargetSegId, "text", editing[markTargetSegId].text + tag);
    } else {
      setNewSegText((prev) => prev + tag);
    }
    setMarkTargetSegId(null);
  };

  const handleMultiProConfirm = () => {
    if (!multiProChar || !multiProReading) return;
    const tag = `【${multiProChar}(${multiProReading})】`;
    insertMark(tag);
    setMultiProDialogOpen(false);
    setMultiProChar("");
    setMultiProReading("");
  };

  const handleAddSegment = async () => {
    if (!newSegText.trim()) return;
    setError("");
    pushUndo(segments);
    try {
      const seg = await apiFetch<PodcastSegment>(`/api/v1/segments/podcasts/${projectId}/segments`, {
        method: "POST",
        body: JSON.stringify({
          role_key: newSegRole,
          text: newSegText,
          emotion: newSegEmotion || undefined,
          pause_after_ms: newSegPause,
        }),
      });
      setSegments((prev) => [...prev, { ...seg, status: "draft" }]);
      setNewSegText("");
      setNewSegEmotion("");
      setNewSegPause(700);
      setSuccessMsg("片段已添加");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "添加失败");
    }
  };

  const handleDeleteSegment = async (segId: string) => {
    if (!confirm("确定删除该片段？")) return;
    setError("");
    pushUndo(segments);
    try {
      await apiFetch(`/api/v1/segments/segments/${segId}`, { method: "DELETE" });
      setSegments((prev) => prev.filter((s) => s.id !== segId));
      setSuccessMsg("片段已删除");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "删除失败");
    }
  };

  // Bulk
  const handleBulkSave = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError("");
    pushUndo(segments);
    try {
      const updates = Array.from(selectedIds).map(async (segId) => {
        const patch: Record<string, unknown> = {};
        if (bulkEmotion) patch.emotion = bulkEmotion;
        if (bulkPause) patch.pause_after_ms = parseInt(bulkPause, 10);
        if (Object.keys(patch).length === 0) return null;
        return apiFetch<PodcastSegment>(`/api/v1/segments/segments/${segId}`, {
          method: "PATCH",
          body: JSON.stringify(patch),
        });
      });
      const results = await Promise.all(updates);
      setSegments((prev) =>
        prev.map((s) => {
          const updated = results.find((r) => r && r.id === s.id);
          return updated ? { ...s, ...updated, status: "draft" } : s;
        })
      );
      setSelectedIds(new Set());
      setBulkEmotion("");
      setBulkPause("");
      setSuccessMsg("批量更新完成");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "批量保存失败");
    } finally {
      setSaving(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`确定删除选中的 ${selectedIds.size} 个片段？`)) return;
    setError("");
    pushUndo(segments);
    try {
      await Promise.all(Array.from(selectedIds).map((id) =>
        apiFetch(`/api/v1/segments/segments/${id}`, { method: "DELETE" })
      ));
      setSegments((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setSuccessMsg("批量删除完成");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "批量删除失败");
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === segments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(segments.map((s) => s.id)));
    }
  };

  // Undo / Redo
  const handleUndo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ segs: JSON.parse(JSON.stringify(segments)) });
    setSegments(prev.segs);
  };

  const handleRedo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ segs: JSON.parse(JSON.stringify(segments)) });
    setSegments(next.segs);
  };

  // AI optimize
  const handleAiOptimize = async () => {
    if (!aiSegId || !aiPrompt) return;
    setAiLoading(true);
    setError("");
    const promptToUse = aiCustomPrompt.trim() || aiPrompt;
    try {
      const seg = segments.find((s) => s.id === aiSegId);
      if (!seg) return;
      const newText = `[AI优化：${promptToUse}]\n${seg.text}`;
      const updated = await apiFetch<PodcastSegment>(`/api/segments/${aiSegId}`, {
        method: "PATCH",
        body: JSON.stringify({ text: newText }),
      });
      setSegments((prev) =>
        prev.map((s) => (s.id === aiSegId ? { ...s, ...updated, status: "draft" } : s))
      );
      setAiDialogOpen(false);
      setAiSegId(null);
      setAiPrompt("");
      setAiCustomPrompt("");
      setSuccessMsg("AI 优化完成");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "AI 优化失败");
    } finally {
      setAiLoading(false);
    }
  };

  // ── SSE helper: read stream and dispatch events ──
  const consumeSSEStream = async (response: Response) => {
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const event = JSON.parse(line.slice(6));
              dispatchSSEEvent(event);
            } catch { /* skip malformed JSON */ }
          }
        }
      }
    } finally {
      try { reader.releaseLock(); } catch { /* noop */ }
    }
  };

  // ── SSE event dispatcher ──
  const dispatchSSEEvent = (event: Record<string, unknown>) => {
    switch (event.type) {
      case "progress":
        setSseProgress({
          current: (event.current as number) || 0,
          total: (event.total as number) || 0,
          message: (event.message as string) || "",
        });
        break;

      case "segment_complete": {
        const sid = event.segment_id as string;
        const audioUrl = event.audio_url as string;
        setSegments((prev) =>
          prev.map((s) =>
            s.id === sid
              ? {
                  ...s,
                  status: "completed" as const,
                  audio_asset: {
                    id: sid,
                    url: audioUrl,
                    duration_ms: (event.duration_ms as number) || 0,
                    format: "wav",
                  },
                }
              : s
          )
        );
        setProgressiveQueue((prev) => [
          ...prev,
          {
            url: `${API_BASE}${audioUrl}`,
            segmentId: sid,
            durationMs: (event.duration_ms as number) || 0,
          },
        ]);
        break;
      }

      case "batch_complete": {
        // Batch synthesis: multiple segments share one audio file
        const batchIds = event.segment_ids as string[];
        const batchAudioUrl = event.audio_url as string;
        const batchDuration = (event.duration_ms as number) || 0;

        // Update all segments in the batch
        setSegments((prev) =>
          prev.map((s) =>
            batchIds.includes(s.id)
              ? {
                  ...s,
                  status: "completed" as const,
                  audio_asset: {
                    id: s.id,
                    url: batchAudioUrl,
                    duration_ms: batchDuration,
                    format: "wav",
                  },
                }
              : s
          )
        );
        // Add batch audio to progressive queue once (not per-segment)
        setProgressiveQueue((prev) => [
          ...prev,
          {
            url: `${API_BASE}${batchAudioUrl}`,
            segmentId: batchIds[0],
            durationMs: batchDuration,
          },
        ]);
        break;
      }

      case "segment_failed": {
        const fid = event.segment_id as string;
        setSegments((prev) =>
          prev.map((s) =>
            s.id === fid
              ? { ...s, status: "failed" as const, error_message: (event.error as string) || "合成失败" }
              : s
          )
        );
        break;
      }

      case "complete": {
        const completed = (event.total_completed as number) || 0;
        const failed = (event.total_failed as number) || 0;
        const mergeUrl = event.full_audio_url as string | null;

        setSseActive(false);
        setSynthesizingId(null);

        if (failed === 0) {
          setSuccessMsg(`全部 ${completed} 个片段合成完成`);
        } else {
          setSuccessMsg(`${completed} 成功, ${failed} 失败`);
        }

        if (mergeUrl) {
          setSynthesisAudio({ url: `${API_BASE}${mergeUrl}`, filename: `full_${projectId}.wav` });
        }
        break;
      }

      case "error":
        setError(event.message as string);
        setSseActive(false);
        setSynthesizingId(null);
        break;
    }
  };

  // ── SSE: start batch synthesis stream ──
  const startSSESynthesis = async (segmentIds: string[]) => {
    setSseActive(true);
    setSseProgress({ current: 0, total: segmentIds.length, message: "连接中..." });

    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    const controller = new AbortController();
    sseAbortRef.current = controller;

    try {
      const response = await fetch(
        `${API_BASE}/api/v1/segments/podcasts/${projectId}/synthesize-stream`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ segment_ids: segmentIds }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        setError(err.detail || `HTTP ${response.status}`);
        setSseActive(false);
        setSynthesizingId(null);
        return;
      }

      await consumeSSEStream(response);
    } catch (err: unknown) {
      if ((err as Error).name === "AbortError") return;
      setError(err instanceof Error ? err.message : "SSE 连接失败");
      setSseActive(false);
      setSynthesizingId(null);
    }
  };

  // Synthesize (solo mode)
  const handleSynthesize = async (segId: string) => {
    if (insufficientBalance) {
      setError("余额不足，请充值后再试");
      return;
    }
    setError("");
    setSynthesizingId(segId);
    setSynthesisAudio(null);
    setProgressiveQueue([]);
    setProgressivePlayingIndex(-1);

    setSegments((prev) =>
      prev.map((s) => (s.id === segId ? { ...s, status: "queued" as const } : s))
    );

    startSSESynthesis([segId]);
  };

  // Batch synthesize all non-completed segments (duo mode)
  const handleBatchSynthesize = async () => {
    const toSynth = segments.filter((s) => s.status !== "completed");
    if (toSynth.length === 0) {
      setError("没有需要合成的片段");
      return;
    }
    setError("");
    setSynthesisAudio(null);
    setProgressiveQueue([]);
    setProgressivePlayingIndex(-1);

    // Check if voices are selected (duo mode)
    if (isDuoMode) {
      if (!duoRoleAVoice || !duoRoleBVoice) {
        const missing = !duoRoleAVoice && !duoRoleBVoice ? "角色 A 和角色 B" : !duoRoleAVoice ? "角色 A" : "角色 B";
        setError(`请先在「基本设置」中选择 ${missing} 的音色`);
        return;
      }
    }

    // Sync role voice settings before synthesizing (duo mode)
    if (isDuoMode) {
      const roleMap: Record<string, string> = {};
      for (const seg of segments) {
        if (seg.role_id && seg.role?.role_key) {
          const selectedVoice = seg.role.role_key === "host" ? duoRoleAVoice : duoRoleBVoice;
          if (selectedVoice) {
            roleMap[seg.role_id] = selectedVoice;
          }
        }
      }
      await Promise.all(
        Object.entries(roleMap).map(([roleId, voiceId]) =>
          apiFetch(`/api/v1/podcasts/roles/${roleId}/change-voice`, {
            method: "POST",
            body: JSON.stringify({ voice_id: voiceId, speed: 1.0, pitch: 0, volume: 1.0 }),
          }).catch(() => {/* ignore */})
        )
      );
    }

    const segmentIds = toSynth.map((s) => s.id);
    setSegments((prev) =>
      prev.map((s) => (segmentIds.includes(s.id) ? { ...s, status: "queued" as const } : s))
    );
    setSynthesizingId(toSynth[0].id);

    startSSESynthesis(segmentIds);
  };

  // Build audio
  const handleBuildAudio = async () => {
    setBuildLoading(true);
    setError("");
    try {
      const result = await apiFetch<{ url: string }>(`/api/v1/podcasts/${projectId}/rebuild-audio`, {
        method: "POST",
      });
      setFullAudioUrl(result.url);
      setFullAudioFilename(`full_${projectId}.wav`);
      setSuccessMsg("音频拼接完成");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "拼接失败");
    } finally {
      setBuildLoading(false);
    }
  };

  // Parse batch dialogue (duo mode)
  const parseBatchDialogue = async () => {
    if (!batchInput.trim()) return;
    const lines = batchInput.split("\n");
    let currentRole: string | null = null;
    let currentText = "";
    const dialogues: Array<{ role: string; text: string }> = [];

    lines.forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed) return;
      const roleMatch = trimmed.match(/^([ABab])[：:]\s*(.*)/);
      if (roleMatch) {
        if (currentRole && currentText) {
          dialogues.push({ role: currentRole, text: currentText });
        }
        currentRole = roleMatch[1];
        currentText = roleMatch[2];
      } else if (currentRole) {
        currentText += " " + trimmed;
      }
    });

    if (currentRole && currentText) {
      dialogues.push({ role: currentRole, text: currentText });
    }

    if (dialogues.length === 0) {
      setError("未解析到有效的对话内容，请使用 A: 或 B: 开头标识角色");
      return;
    }

    // Create segments via API (sequentially to preserve sort order)
    setError("");
    pushUndo(segments);
    try {
      const newSegments: PodcastSegment[] = [];
      for (const d of dialogues) {
        const roleKey = d.role.toUpperCase() === "A" ? "host" : "guest";
        const seg = await apiFetch<PodcastSegment>(`/api/v1/segments/podcasts/${projectId}/segments`, {
          method: "POST",
          body: JSON.stringify({
            role_key: roleKey,
            text: d.text,
          }),
        });
        newSegments.push(seg);
      }
      setSegments((prev) => [...prev, ...newSegments.map((s) => ({ ...s, status: "draft" as const }))]);
      setBatchInput("");
      setSuccessMsg(`已解析并创建 ${dialogues.length} 条对话`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "创建对话失败");
    }
  };

  // -----------------------------------------------------------------------
  // Progressive audio playback (dual-buffer, seamless switching)
  // -----------------------------------------------------------------------

  // Ref for stable onEnded callback — always reads current queue length
  const progressiveQueueLenRef = React.useRef(0);
  progressiveQueueLenRef.current = progressiveQueue.length;

  // Kick off playback when first segment lands in queue
  React.useEffect(() => {
    if (progressiveQueue.length > 0 && progressivePlayingIndex === -1) {
      setProgressivePlayingIndex(0);
    }
  }, [progressiveQueue, progressivePlayingIndex]);

  // Play / preload when index advances
  React.useEffect(() => {
    const idx = progressivePlayingIndex;
    if (idx < 0 || idx >= progressiveQueue.length) return;

    const url = progressiveQueue[idx].url;
    // Even index → audio 0, odd → audio 1
    const playerIdx = idx % 2;
    const ref = playerIdx === 0 ? progressiveAudioRef0 : progressiveAudioRef1;
    const otherRef = playerIdx === 0 ? progressiveAudioRef1 : progressiveAudioRef0;

    // Stop the other player
    if (otherRef.current) {
      otherRef.current.pause();
      otherRef.current.removeAttribute("src");
    }

    if (!ref.current) return;

    ref.current.src = url;
    ref.current.load();

    const doPlay = () => {
      ref.current?.play().catch(() => {});
      setProgressiveActivePlayer(playerIdx);
    };

    // Wait for sufficient data before playing
    if (ref.current.readyState >= 3 /* HAVE_FUTURE_DATA */) {
      doPlay();
    } else {
      ref.current.addEventListener("canplay", doPlay, { once: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressivePlayingIndex]);

  // Advance to next on ended — uses ref to avoid stale closure
  const handleProgressiveAudioEnded = React.useCallback(() => {
    setProgressivePlayingIndex((prev) => {
      const next = prev + 1;
      return next < progressiveQueueLenRef.current ? next : prev;
    });
  }, []);

  // Stop progressive playback when final merged audio arrives
  React.useEffect(() => {
    if (synthesisAudio) {
      [progressiveAudioRef0, progressiveAudioRef1].forEach((ref) => {
        if (ref.current) {
          ref.current.pause();
          ref.current.removeAttribute("src");
        }
      });
      setProgressivePlayingIndex(-1);
    }
  }, [synthesisAudio]);

  // Abort SSE + stop audio on unmount
  React.useEffect(() => {
    return () => {
      if (sseAbortRef.current) {
        sseAbortRef.current.abort();
      }
      progressiveAudioRef0.current?.pause();
      progressiveAudioRef1.current?.pause();
    };
  }, []);

  // -----------------------------------------------------------------------
  // Render helpers

  // -----------------------------------------------------------------------
  // Render helpers
  // -----------------------------------------------------------------------
  const getRoleColor = (seg: PodcastSegment) => {
    if (!seg.role?.color) return "#10b981";
    return seg.role.color;
  };

  const getEmotionLabel = (emotion: string | null | undefined) => {
    if (!emotion) return "默认";
    return EMOTION_OPTIONS.find((o) => o.value === emotion)?.label || emotion;
  };

  const updateVoiceSetting = (key: string, value: unknown) => {
    setVoiceSettings((prev) => ({ ...prev, [key]: value }));
  };

  // Helper for slider value access
  const getVoiceNum = (key: string): number => {
    return (voiceSettings as Record<string, unknown>)[key] as number;
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-text-muted">加载中...</span>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white border border-line rounded-xl p-6 text-center">
          <p className="text-text-muted mb-4">项目未找到</p>
          <button onClick={() => router.push("/podcasts")} className="px-4 py-2 bg-brand text-white rounded-lg text-sm font-medium hover:bg-brand-2 transition-colors">
            返回列表
          </button>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // SOLO MODE — Two-column layout (synthesis.html style)
  // -----------------------------------------------------------------------
  if (!isDuoMode) {
    return (
      <div className="max-w-[1280px] mx-auto px-6 py-6">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-text">{project.title}</h1>
            <p className="text-sm text-text-muted mt-1">
              状态：{project.status} · 模式：单人Solo
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/podcasts" className="px-3 py-1.5 text-sm font-medium border border-line rounded-lg text-text hover:bg-bg-soft transition-colors">
              返回列表
            </Link>
          </div>
        </div>

        {/* Error / Success */}
        {error && (
          <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">×</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg("")} className="text-green-400 hover:text-green-600">×</button>
          </div>
        )}

        {/* Two-column layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
          {/* Left: Main content */}
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {/* Top form */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line-light">
              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text">语音模型</label>
                  <select
                    value={voiceModel}
                    onChange={(e) => setVoiceModel(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] pr-9"
                  >
                    <option value="mimo">MiMo v2.5 (小米)</option>
                    <option value="minimax">MiniMax</option>
                    <option value="edge-tts">Edge-TTS</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-[13px] font-medium text-text">情绪风格 <span className="text-[12px] text-text-light font-normal">（一般无需指定）</span></label>
                  <select className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] pr-9">
                    <option>自动（推荐）</option>
                    <option>开心</option>
                    <option>悲伤</option>
                    <option>愤怒</option>
                    <option>惊讶</option>
                    <option>平静</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Tip bar */}
            <div className="flex items-center justify-between px-5 py-2.5 bg-bg-soft border-b border-line-light text-[13px] text-text-muted">
              <div className="flex items-center gap-1.5">
                <span className="text-warn"><Icons.Info /></span>
                <span>提示：<b className="font-semibold">&lt;#x#&gt;</b> 添加停顿(0.01-99.99秒)；2.8模型支持 (laughs)、(sighs) 等</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setNewSegText("")} className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-text-muted bg-transparent border border-line rounded-md cursor-pointer hover:border-brand-3 hover:text-text transition-colors">
                  <Icons.Clear /> 清空文本
                </button>
                <button className="flex items-center gap-1 px-2.5 py-1 text-[12px] text-text-muted bg-transparent border border-line rounded-md cursor-pointer hover:border-brand-3 hover:text-text transition-colors">
                  <Icons.Upload /> 上传文件
                </button>
              </div>
            </div>

            {/* Text input area */}
            <div className="p-5">
              <textarea
                value={newSegText}
                onChange={(e) => setNewSegText(e.target.value)}
                className="w-full min-h-[300px] border-none outline-none text-[15px] leading-[1.8] resize-y text-text font-[inherit] placeholder:text-text-light"
                placeholder={"在此输入要合成的文本内容\n\n示例：你好，欢迎来到我的播客！今天我们要聊一个有趣的话题..."}
              />
            </div>

            {/* Toolbar */}
            <div className="flex items-center gap-2 px-5 py-3 border-t border-line-light flex-wrap">
              <button onClick={() => insertMark("<#0.5#>")} className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-text-muted bg-bg-soft border border-line rounded-md cursor-pointer hover:bg-line-light hover:text-text transition-colors">
                <Icons.Pause /> 短停顿
              </button>
              <button onClick={() => insertMark("<#1.0#>")} className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-text-muted bg-bg-soft border border-line rounded-md cursor-pointer hover:bg-line-light hover:text-text transition-colors">
                <Icons.Pause /> 中停顿
              </button>
              <button onClick={() => insertMark("<#2.0#>")} className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-text-muted bg-bg-soft border border-line rounded-md cursor-pointer hover:bg-line-light hover:text-text transition-colors">
                <Icons.Pause /> 长停顿
              </button>
              <button onClick={() => setMultiProDialogOpen(true)} className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-text-muted bg-bg-soft border border-line rounded-md cursor-pointer hover:bg-line-light hover:text-text transition-colors">
                <Icons.Polyphone /> 多音字
              </button>
              <button onClick={() => insertMark("(laughs)")} className="flex items-center gap-1 px-3 py-1.5 text-[13px] text-text-muted bg-bg-soft border border-line rounded-md cursor-pointer hover:bg-line-light hover:text-text transition-colors">
                <Icons.Tone /> 语气词
              </button>
              <div className="flex-1" />
              <div className="flex items-center gap-1.5 px-3 py-1.5 text-[13px] text-text-muted">
                <div
                  className={`w-9 h-5 rounded-full relative cursor-pointer transition-colors ${voiceSettings.langEnhance !== "auto" ? "bg-success" : "bg-line"}`}
                  onClick={() => updateVoiceSetting("langEnhance", voiceSettings.langEnhance === "auto" ? "zh" : "auto")}
                >
                  <div className={`absolute w-4 h-4 bg-white rounded-full top-0.5 transition-transform shadow-sm ${voiceSettings.langEnhance !== "auto" ? "translate-x-4" : "translate-x-0.5"}`} />
                </div>
                <span>启用词典</span>
              </div>
            </div>

            {/* Bottom info */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-line-light text-[13px] text-text-muted">
              <div className="flex items-center gap-4">
                <span>字符数：<span className="font-bold text-text">{totalChars}</span><span className="text-text-light"> / 10000</span></span>
              </div>
              <div>
                预计消耗：<span className="font-bold text-success">{estimatedCredits} 字符</span>
              </div>
            </div>

            {/* Synthesize button */}
            <button
              onClick={async () => {
                // First: if there's text in the input, create a segment
                if (newSegText.trim() && segments.length === 0) {
                  try {
                    const seg = await apiFetch<PodcastSegment>(`/api/v1/segments/podcasts/${projectId}/segments`, {
                      method: "POST",
                      body: JSON.stringify({
                        role_key: "host",
                        text: newSegText,
                        emotion: "",
                        pause_after_ms: 700,
                      }),
                    });
                    setSegments((prev) => [...prev, { ...seg, status: "draft" }]);
                    setNewSegText("");
                    // Now synthesize the newly created segment
                    await handleSynthesize(seg.id);
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : "合成失败");
                  }
                } else if (segments.length > 0) {
                  handleSynthesize(segments[segments.length - 1].id);
                } else if (newSegText.trim()) {
                  // Solo mode: just synthesize the input text directly
                  setError("");
                  setSynthesisAudio(null);
                  try {
                    const seg = await apiFetch<PodcastSegment>(`/api/v1/segments/podcasts/${projectId}/segments`, {
                      method: "POST",
                      body: JSON.stringify({
                        role_key: "host",
                        text: newSegText,
                      }),
                    });
                    setSegments((prev) => [...prev, { ...seg, status: "draft" }]);
                    await handleSynthesize(seg.id);
                  } catch (err: unknown) {
                    setError(err instanceof Error ? err.message : "合成失败");
                  }
                }
              }}
              disabled={insufficientBalance || (newSegText.trim().length === 0 && segments.length === 0)}
              className="w-[calc(100%-40px)] mx-5 mb-5 py-4 bg-brand text-white border-none rounded-lg text-[15px] font-semibold font-[inherit] cursor-pointer flex items-center justify-center gap-2 transition-all hover:bg-brand-2 hover:-translate-y-0.5 hover:shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Icons.Play /> {synthesizingId ? "合成中..." : "开始合成"}
            </button>

            {/* Synthesis progress (only when not using SSE) */}
            {synthesizingId && !sseActive && (
              <div className="mx-5 mb-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
                  <span className="text-sm text-text-muted">正在合成语音，请稍候...</span>
                </div>
                <div className="w-full h-2 bg-bg-soft rounded-full overflow-hidden">
                  <div className="h-full bg-success rounded-full animate-pulse" style={{ width: "60%" }} />
                </div>
              </div>
            )}

            {/* SSE Progress */}
            {sseActive && (
              <div className="mx-5 mb-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-blue-600 text-sm animate-pulse">●</span>
                  <span className="text-sm font-semibold text-text">{sseProgress.message}</span>
                  {sseProgress.total > 0 && (
                    <span className="text-xs text-secondary ml-auto">
                      {sseProgress.current}/{sseProgress.total}
                    </span>
                  )}
                </div>
                {sseProgress.total > 0 && (
                  <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(3, Math.round((sseProgress.current / sseProgress.total) * 100))}%` }}
                    />
                  </div>
                )}
              </div>
            )}
            {/* Progressive Audio (live playback during synthesis) */}
            {progressiveQueue.length > 0 && !synthesisAudio && (
              <div className="mx-5 mb-4 p-3 bg-green-50 border border-green-200 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="text-green-600 text-sm animate-pulse">▶</span>
                  <span className="text-xs font-semibold text-text">实时播放中</span>
                  <span className="text-xs text-secondary ml-auto">
                    {progressivePlayingIndex + 1}/{progressiveQueue.length}
                  </span>
                </div>
                <audio ref={progressiveAudioRef0} className="hidden" onEnded={handleProgressiveAudioEnded} />
                <audio ref={progressiveAudioRef1} className="hidden" onEnded={handleProgressiveAudioEnded} />
              </div>
            )}

            {/* Synthesis result audio player */}
            {synthesisAudio && (
              <div className="mx-5 mb-5 p-4 bg-bg-soft border border-line rounded-xl">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600">●</span>
                  <span className="text-sm font-semibold text-text">合成完成</span>
                </div>
                <audio controls className="w-full h-10 rounded-lg">
                  <source src={synthesisAudio.url} type="audio/wav" />
                </audio>
              </div>
            )}

          </div>

          {/* Right: Settings panel */}
          <div className="flex flex-col gap-4">
            {/* Settings / History tabs */}
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="flex border-b border-line-light">
                <button
                  onClick={() => setRightPanelTab("settings")}
                  className={`flex-1 py-3 text-sm font-medium text-center border-none cursor-pointer transition-all border-b-2 ${rightPanelTab === "settings" ? "text-text font-semibold border-brand bg-bg-soft" : "text-text-muted bg-transparent border-b-transparent hover:text-text"}`}
                >
                  设置
                </button>
                <button
                  onClick={() => setRightPanelTab("history")}
                  className={`flex-1 py-3 text-sm font-medium text-center border-none cursor-pointer transition-all border-b-2 ${rightPanelTab === "history" ? "text-text font-semibold border-brand bg-bg-soft" : "text-text-muted bg-transparent border-b-transparent hover:text-text"}`}
                >
                  历史
                </button>
              </div>

              {rightPanelTab === "settings" ? (
                <div className="p-4">
                  <div className="text-sm font-semibold text-text mb-3">音色</div>

                  {/* Voice type tabs */}
                  <div className="flex mb-4 rounded-md overflow-hidden border border-line">
                    <button
                      onClick={() => updateVoiceSetting("voiceType", "official")}
                      className={`flex-1 py-2 text-[13px] font-medium text-center border-none cursor-pointer transition-colors ${voiceSettings.voiceType === "official" ? "bg-brand text-white" : "bg-bg-soft text-text-muted"}`}
                    >
                      官方音色
                    </button>
                    <button
                      onClick={() => updateVoiceSetting("voiceType", "clone")}
                      className={`flex-1 py-2 text-[13px] font-medium text-center border-none cursor-pointer transition-colors ${voiceSettings.voiceType === "clone" ? "bg-brand text-white" : "bg-bg-soft text-text-muted"}`}
                    >
                      克隆音色
                    </button>
                  </div>

                  {/* Voice select */}
                  <div className="mb-4">
                    <select
                      value={voiceSettings.voiceId}
                      onChange={(e) => updateVoiceSetting("voiceId", e.target.value)}
                      className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] pr-9"
                    >
                      <option value="">请选择音色</option>
                      {voices.map((v) => (
                        <option key={v.id} value={v.provider_voice_id}>
                          {v.name} ({v.gender === "male" ? "男声" : v.gender === "female" ? "女声" : "中性"})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Language enhance */}
                  <div className="mb-4">
                    <div className="text-xs text-text-muted mb-1.5">语言/方言增强</div>
                    <select className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] pr-9">
                      <option>自动检测</option>
                      <option>普通话</option>
                      <option>粤语</option>
                      <option>四川话</option>
                      <option>东北话</option>
                      <option>English</option>
                    </select>
                    <div className="text-[11px] text-text-light mt-1">优化指定语言和方言的识别效果（支持25种语言）</div>
                  </div>

                  <div className="h-px bg-line-light my-4" />

                  {/* Voice adjustments */}
                  <div className="text-sm font-semibold text-text mb-3">音色调节</div>

                  {[
                    { key: "speed", label: "语速", min: 0.5, max: 2.0, step: 0.1, decimals: 2 },
                    { key: "pitch", label: "音调", min: -12, max: 12, step: 1, decimals: 0 },
                    { key: "volume", label: "音量", min: 0, max: 2, step: 0.1, decimals: 2 },
                  ].map((s) => (
                    <div key={s.key} className="mb-4">
                      <div className="flex items-center justify-between text-[13px] text-text-muted mb-2">
                        <span className="font-medium text-text">{s.label}</span>
                        <span className="font-semibold text-text">{getVoiceNum(s.key).toFixed(s.decimals)}</span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={s.step}
                        value={getVoiceNum(s.key)}
                        onChange={(e) => updateVoiceSetting(s.key, parseFloat(e.target.value))}
                        className="w-full h-1.5 rounded-full bg-line-light outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                      />
                    </div>
                  ))}

                  <div className="h-px bg-line-light my-4" />

                  {/* Advanced effects */}
                  <div className="text-sm font-semibold text-text mb-3">声音效果器（高级）</div>

                  {[
                    { key: "tonePitch", label: "音高（低沉/明亮）", min: -10, max: 10 },
                    { key: "intensity", label: "强度（力量感/柔和）", min: -10, max: 10 },
                    { key: "timbre", label: "音色（磁性/清脆）", min: -10, max: 10 },
                  ].map((s) => (
                    <div key={s.key} className="mb-4">
                      <div className="flex items-center justify-between text-[13px] text-text-muted mb-2">
                        <span className="font-medium text-text">{s.label}</span>
                        <span className="font-semibold text-text">{getVoiceNum(s.key)}</span>
                      </div>
                      <input
                        type="range"
                        min={s.min}
                        max={s.max}
                        step={1}
                        value={getVoiceNum(s.key)}
                        onChange={(e) => updateVoiceSetting(s.key, parseInt(e.target.value))}
                        className="w-full h-1.5 rounded-full bg-line-light outline-none appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-text [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:hover:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                      />
                    </div>
                  ))}

                  <div className="h-px bg-line-light my-4" />

                  {/* Sound effects */}
                  <div className="text-sm font-semibold text-text mb-3">音效（单选）</div>
                  <div className="flex flex-col gap-2">
                    {[
                      { value: "none", label: "无" },
                      { value: "hall", label: "大厅" },
                      { value: "room", label: "房间" },
                    ].map((e) => (
                      <label
                        key={e.value}
                        className={`flex items-center gap-2 px-3 py-2.5 border-[1.5px] rounded-lg cursor-pointer transition-all text-[13px] ${voiceSettings.effect === e.value ? "border-brand bg-bg-soft text-text font-medium" : "border-line text-text-muted hover:border-brand-3"}`}
                        onClick={() => updateVoiceSetting("effect", e.value)}
                      >
                        <input type="radio" name="effect" value={e.value} checked={voiceSettings.effect === e.value} className="w-4 h-4 accent-brand" />
                        <span>{e.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4">
                  {segments.length === 0 ? (
                    <div className="text-center text-text-muted py-8">
                      <Icons.History />
                      <p className="mt-3 text-sm">暂无历史记录</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {segments.map((seg, idx) => (
                        <div
                          key={seg.id}
                          className="p-3 bg-bg-soft rounded-lg border border-line hover:border-brand-3 transition-colors cursor-pointer"
                          onClick={() => startEditing(seg)}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-text-muted">#{idx + 1}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: getRoleColor(seg) + "22", color: getRoleColor(seg) }}>
                              {seg.role?.name || seg.role_id}
                            </span>
                            <span className="text-[10px] text-text-light">{seg.status}</span>
                          </div>
                          <p className="text-xs text-text-muted line-clamp-2">{seg.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Save config */}
            <div className="bg-white border border-line rounded-xl overflow-hidden">
              <div className="flex items-center justify-end px-4 py-3 border-t border-line-light">
                <button className="text-[13px] text-text-muted cursor-pointer hover:text-text transition-colors">
                  + 保存当前参数
                </button>
              </div>
              <div className="px-4 py-3 text-[13px] text-text-light text-center border-t border-line-light">
                暂无保存的配置
              </div>
            </div>
          </div>
        </div>

        {/* Audio Player */}
        {fullAudioUrl && (
          <div className="mt-6 mb-4 bg-white border border-line rounded-xl p-4">
            <audio controls className="w-full h-9 rounded-lg">
              <source src={`${API_BASE}${fullAudioUrl}`} />
            </audio>
          </div>
        )}

        {/* Mark insertion popup */}
        {markMenuOpen && (
          <div className="fixed inset-0 z-50" onClick={() => { setMarkMenuOpen(false); setMarkTargetSegId(null); }}>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white border border-line rounded-xl shadow-lg p-2 min-w-[200px]" onClick={(e) => e.stopPropagation()}>
              <div className="px-3 py-1.5 text-xs font-semibold text-text-muted">暂停标记</div>
              {PAUSE_MARKERS.map((m) => (
                <button key={m.tag} onClick={() => insertMark(m.tag)} className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-soft rounded-lg transition-colors">
                  {m.label} {m.tag}
                </button>
              ))}
              <div className="px-3 py-1.5 text-xs font-semibold text-text-muted mt-1">多音字</div>
              <button onClick={() => { setMultiProDialogOpen(true); setMarkMenuOpen(false); }} className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-soft rounded-lg transition-colors">
                打开多音字选择器…
              </button>
              <div className="px-3 py-1.5 text-xs font-semibold text-text-muted mt-1">语气词</div>
              {TONE_WORDS.map((t) => (
                <button key={t.tag} onClick={() => insertMark(t.tag)} className="w-full text-left px-3 py-2 text-sm text-text hover:bg-bg-soft rounded-lg transition-colors">
                  {t.label} {t.tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* AI Optimize Dialog */}
        {aiDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setAiDialogOpen(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-text mb-4">AI 优化片段</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text">优化方式</label>
                  <select
                    value={aiPrompt}
                    onChange={(e) => { setAiPrompt(e.target.value); setAiCustomPrompt(""); }}
                    className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all"
                  >
                    <option value="">请选择</option>
                    {AI_OPTIMIZE_PROMPTS.map((p) => (
                      <option key={p.value} value={p.value}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text">自定义指令（可选）</label>
                  <textarea
                    value={aiCustomPrompt}
                    onChange={(e) => { setAiCustomPrompt(e.target.value); setAiPrompt(""); }}
                    className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all resize-y min-h-[80px] placeholder:text-text-light"
                    placeholder="输入自定义 AI 指令，例如：多用比喻、增加互动感…"
                  />
                </div>
                <div className="px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
                  当前为演示模式。接入 LLM API 后将实现真实 AI 优化。
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setAiDialogOpen(false)} className="px-4 py-2 text-sm font-medium border border-line rounded-lg hover:bg-bg-soft transition-colors">
                  取消
                </button>
                <button
                  onClick={handleAiOptimize}
                  disabled={aiLoading || (!aiPrompt && !aiCustomPrompt.trim())}
                  className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-2 transition-colors disabled:opacity-50"
                >
                  {aiLoading ? "处理中..." : "优化"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Multi-pronunciation Dialog */}
        {multiProDialogOpen && (
          <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center" onClick={() => setMultiProDialogOpen(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs p-6" onClick={(e) => e.stopPropagation()}>
              <h3 className="text-lg font-semibold text-text mb-4">多音字选择器</h3>
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-text">选择多音字</label>
                  <select
                    value={multiProChar}
                    onChange={(e) => { setMultiProChar(e.target.value); setMultiProReading(""); }}
                    className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all"
                  >
                    <option value="">请选择</option>
                    {MULTI_PRONUNCIATION.map((m) => (
                      <option key={m.char} value={m.char}>{m.char}</option>
                    ))}
                  </select>
                </div>
                {multiProChar && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-sm font-medium text-text">选择读音</label>
                    <select
                      value={multiProReading}
                      onChange={(e) => setMultiProReading(e.target.value)}
                      className="w-full px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-lg bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all"
                    >
                      <option value="">请选择</option>
                      {MULTI_PRONUNCIATION.find((m) => m.char === multiProChar)?.readings.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button onClick={() => setMultiProDialogOpen(false)} className="px-4 py-2 text-sm font-medium border border-line rounded-lg hover:bg-bg-soft transition-colors">
                  取消
                </button>
                <button
                  onClick={handleMultiProConfirm}
                  disabled={!multiProChar || !multiProReading}
                  className="px-4 py-2 bg-brand text-white text-sm font-medium rounded-lg hover:bg-brand-2 transition-colors disabled:opacity-50"
                >
                  插入标记
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // DUO MODE — Single-column layout (interview.html style)
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-[1000px] mx-auto px-6 py-8">
      {/* Page Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">{project.title}</h1>
        <p className="text-sm text-text-muted mt-2">输入对话文案，一键合成播客风格的对话音频</p>
      </div>

      {/* Error / Success */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">×</button>
        </div>
      )}
      {successMsg && (
        <div className="mb-4 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="text-green-400 hover:text-green-600">×</button>
        </div>
      )}

      {/* Basic settings card */}
      <div className="bg-white border border-line rounded-xl p-6 mb-5 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold text-text mb-4">
          <span className="text-brand"><Icons.Settings /></span>
          基本设置
        </div>
        {/* Voice model selector */}
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-[13px] font-semibold text-text">语音模型</label>
          <select
            value={duoVoiceModel}
            onChange={(e) => {
              setDuoVoiceModel(e.target.value);
              loadVoices(e.target.value);
            }}
            className="w-full px-4 py-3 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_14px_center] pr-10"
          >
            <option value="mimo">MiMo v2.5 (小米)</option>
            <option value="minimax">MiniMax</option>
            <option value="edge-tts">Edge-TTS</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-text">角色 A 音色</label>
            <select
              value={duoRoleAVoice}
              onChange={(e) => setDuoRoleAVoice(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_14px_center] pr-10"
            >
              <option value="">请选择音色</option>
              {voices.filter((v) => v.provider === duoVoiceModel || !duoVoiceModel).map((v) => (
                <option key={v.id} value={v.provider_voice_id}>
                  {v.name} ({v.gender === "male" ? "男声" : v.gender === "female" ? "女声" : "中性"})
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[13px] font-semibold text-text">角色 B 音色</label>
            <select
              value={duoRoleBVoice}
              onChange={(e) => setDuoRoleBVoice(e.target.value)}
              className="w-full px-4 py-3 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 width=%2716%27 height=%2716%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%236b7280%27 stroke-width=%272%27%3E%3Cpolyline points=%276 9 12 15 18 9%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_14px_center] pr-10"
            >
              <option value="">请选择音色</option>
              {voices.filter((v) => v.provider === duoVoiceModel || !duoVoiceModel).map((v) => (
                <option key={v.id} value={v.provider_voice_id}>
                  {v.name} ({v.gender === "male" ? "男声" : v.gender === "female" ? "女声" : "中性"})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dialogue input card */}
      <div className="bg-white border border-line rounded-xl p-6 mb-5 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold text-text mb-4">
          <span className="text-brand"><Icons.Edit /></span>
          对话文案
        </div>

        {/* Batch input */}
        <div className="bg-bg-soft border-2 border-dashed border-line rounded-xl p-5 mb-5 hover:border-brand-3 transition-colors">
          <label className="text-[13px] font-semibold text-text block mb-2">批量输入（自动解析）</label>
          <textarea
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            className="w-full min-h-[120px] px-4 py-3 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all resize-y placeholder:text-text-light mb-3"
            placeholder={"输入对话文案，格式：\nA: 你好 B: 你好，欢迎来到我的播客...\n系统会自动解析 A/B 角色对话"}
          />
          <div className="flex items-center gap-2 text-[13px] text-text-muted mb-3">
            <span className="text-warn"><Icons.Info /></span>
            提示：使用 "A:" 或 "B:" 开头来标识角色，系统会自动解析成对话条目
          </div>
          <div className="flex gap-2">
            <button onClick={parseBatchDialogue} className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-2 transition-colors">
              解析文案
            </button>
            <button onClick={() => { setBatchInput(""); setSegments([]); }} className="px-5 py-2.5 text-sm font-semibold border-[1.5px] border-line rounded-lg text-text hover:bg-bg-soft transition-colors">
              清空全部
            </button>
          </div>
        </div>

        {/* Dialogue list */}
        <div className="space-y-3">
          {segments.map((seg, idx) => {
            const isEditing = editingSegId === seg.id;
            const draft = editing[seg.id];
            const roleColor = getRoleColor(seg);
            const isRoleA = (seg.role?.role_key || seg.role_id) === "host";

            return (
              <div
                key={seg.id}
                className={`flex gap-3 items-start p-4 bg-bg-soft rounded-xl border transition-colors hover:border-brand-3 ${isRoleA ? "border-l-4 border-l-success" : "border-l-4 border-l-blue-500"}`}
              >
                {/* Role select */}
                <select
                  value={seg.role?.role_key || "host"}
                  onChange={(e) => {
                    // Update role
                    const newRoleId = e.target.value;
                    setSegments((prev) => prev.map((s) => s.id === seg.id ? { ...s, role_id: newRoleId } : s));
                  }}
                  className="w-[90px] px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand cursor-pointer flex-shrink-0"
                >
                  <option value="host">角色 A</option>
                  <option value="guest">角色 B</option>
                </select>

                {/* Text */}
                {isEditing && draft ? (
                  <textarea
                    value={draft.text}
                    onChange={(e) => handleEditingChange(seg.id, "text", e.target.value)}
                    className="flex-1 min-h-[60px] px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all resize-y"
                  />
                ) : (
                  <div
                    className="flex-1 min-h-[60px] px-3 py-2.5 text-sm leading-relaxed whitespace-pre-wrap cursor-pointer hover:bg-white rounded-xl transition-colors"
                    onClick={() => startEditing(seg)}
                  >
                    {seg.text}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-1 flex-shrink-0">
                  {isEditing && draft ? (
                    <>
                      <button onClick={() => saveEditing(seg.id)} disabled={saving} className="p-2 text-brand hover:bg-white rounded-lg transition-colors disabled:opacity-50" title="保存">
                        <Icons.Save />
                      </button>
                      <button onClick={cancelEditing} className="p-2 text-text-muted hover:bg-white rounded-lg transition-colors" title="取消">
                        <Icons.Cancel />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEditing(seg)} className="p-2 text-text-muted hover:text-text hover:bg-white rounded-lg transition-colors" title="编辑">
                        <Icons.Edit />
                      </button>
                      <button onClick={() => handleSynthesize(seg.id)} disabled={insufficientBalance} className="p-2 text-brand hover:bg-white rounded-lg transition-colors disabled:opacity-30" title="合成">
                        <Icons.Play />
                      </button>
                    </>
                  )}
                  <button onClick={() => handleDeleteSegment(seg.id)} className="p-2 text-danger hover:bg-red-50 rounded-lg transition-colors" title="删除">
                    <Icons.Trash />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Add individual dialogue entry */}
        <div className="flex items-start gap-3 mt-5 pt-5 border-t border-line-light">
          <select
            value={newSegRole}
            onChange={(e) => setNewSegRole(e.target.value)}
            className="w-[100px] px-3 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand flex-shrink-0"
          >
            <option value="host">角色 A</option>
            <option value="guest">角色 B</option>
          </select>
          <input
            value={newSegText}
            onChange={(e) => setNewSegText(e.target.value)}
            placeholder="输入对话文本..."
            className="flex-1 px-4 py-2.5 text-sm font-medium border-[1.5px] border-line rounded-xl bg-white text-text outline-none focus:border-brand focus:ring-3 focus:ring-brand/5 transition-all placeholder:text-text-light"
            onKeyDown={(e) => { if (e.key === "Enter") handleAddSegment(); }}
          />
          <button onClick={handleAddSegment} className="px-4 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-2 transition-colors flex-shrink-0">
            添加
          </button>
        </div>

        {/* Add dialogue button (legacy) */}
        <button
          onClick={handleAddSegment}
          className="w-full mt-3 py-3 text-sm font-semibold border-[1.5px] border-dashed border-line rounded-xl text-text-muted hover:border-brand-3 hover:text-text transition-colors flex items-center justify-center gap-2"
        >
          <Icons.Plus /> 添加对话条目
        </button>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between mt-5 pt-5 border-t border-line">
          <div className="text-sm text-text-muted">
            字符数: <span className="font-semibold text-text">{totalChars}</span> / 10000
          </div>
          <div className="flex gap-2">
            <button
              onClick={async () => {
                // If no segments yet but batch input exists, auto-parse first
                if (segments.length === 0 && batchInput.trim()) {
                  await parseBatchDialogue();
                }
                handleBatchSynthesize();
              }}
              disabled={insufficientBalance || (segments.length === 0 && !batchInput.trim())}
              className="px-5 py-2.5 bg-brand text-white text-sm font-semibold rounded-lg hover:bg-brand-2 transition-colors disabled:opacity-50"
            >
              提交合成任务
            </button>
          </div>
        </div>
      </div>

      {/* Synthesis history for duo */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-text mb-4">合成历史</h2>
        {segments.length === 0 ? (
          <div className="bg-white border border-line rounded-xl p-10 text-center text-text-muted text-sm">
            暂无合成记录
          </div>
        ) : (
          <div className="bg-white border border-line rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-text">本次合成</span>
              <span className="text-xs text-text-muted">
                {segments.filter(s => s.status === "completed").length}/{segments.length} 片段已完成
              </span>
            </div>
            {synthesisAudio ? (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600">●</span>
                  <span className="text-sm font-medium text-text">合成完成</span>
                </div>
                <audio controls className="w-full h-10 rounded-lg" src={synthesisAudio.url} />
              </div>
            ) : fullAudioUrl ? (
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-green-600">●</span>
                  <span className="text-sm font-medium text-text">音频已生成</span>
                </div>
                <audio controls className="w-full h-10 rounded-lg">
                  <source src={`${API_BASE}${fullAudioUrl}`} />
                </audio>
              </div>
            ) : (
              <div className="text-sm text-text-muted">
                提交合成任务后，合成的完整音频将显示在这里
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-line-light">
              <div className="text-xs text-text-muted mb-2">片段状态</div>
              <div className="flex flex-wrap gap-2">
                {segments.map((seg, idx) => (
                  <span
                    key={seg.id}
                    className={`inline-flex items-center gap-1 px-2 py-1 text-xs rounded-md ${
                      seg.status === "completed" ? "bg-green-50 text-green-700 border border-green-200" :
                      seg.status === "failed" ? "bg-red-50 text-red-700 border border-red-200" :
                      "bg-gray-50 text-gray-500 border border-gray-200"
                    }`}
                  >
                    <span>#{idx + 1}</span>
                    <span>{seg.role?.name || seg.role_id}</span>
                    <span>{seg.status === "completed" ? "✓" : seg.status === "failed" ? "✗" : "⋯"}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Synthesis progress bar (duo mode) */}
      {synthesizingId && !sseActive && (
        <div className="mt-6 bg-bg-soft border border-line rounded-xl p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-4 h-4 border-2 border-brand border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-text-muted">正在合成语音，请稍候...</span>
          </div>
          <div className="w-full h-2 bg-line-light rounded-full overflow-hidden">
            <div className="h-full bg-success rounded-full animate-pulse" style={{ width: "60%" }} />
          </div>
        </div>
      )}

      {/* SSE Progress (duo) */}
      {sseActive && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-blue-600 text-sm animate-pulse">●</span>
            <span className="text-sm font-semibold text-text">{sseProgress.message}</span>
            {sseProgress.total > 0 && (
              <span className="text-xs text-secondary ml-auto">
                {sseProgress.current}/{sseProgress.total}
              </span>
            )}
          </div>
          {sseProgress.total > 0 && (
            <div className="w-full h-1.5 bg-blue-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-500"
                style={{ width: `${Math.max(3, Math.round((sseProgress.current / sseProgress.total) * 100))}%` }}
              />
            </div>
          )}
        </div>
      )}
      {/* Progressive Audio (duo) */}
      {progressiveQueue.length > 0 && !synthesisAudio && (
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl">
          <div className="flex items-center gap-2">
            <span className="text-green-600 text-sm animate-pulse">▶</span>
            <span className="text-xs font-semibold text-text">实时播放中</span>
            <span className="text-xs text-secondary ml-auto">
              {progressivePlayingIndex + 1}/{progressiveQueue.length}
            </span>
          </div>
          <audio ref={progressiveAudioRef0} className="hidden" onEnded={handleProgressiveAudioEnded} />
          <audio ref={progressiveAudioRef1} className="hidden" onEnded={handleProgressiveAudioEnded} />
        </div>
      )}
      {/* Synthesis result audio player (duo mode) */}
      {synthesisAudio && (
        <div className="mt-6 p-5 bg-bg-soft border border-line rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-green-600">●</span>
            <span className="text-sm font-semibold text-text">合成完成</span>
          </div>
          <audio controls className="w-full h-10 rounded-lg">
            <source src={synthesisAudio.url} type="audio/wav" />
          </audio>
        </div>
      )}

    </div>
  );
}

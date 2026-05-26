"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Divider from "@mui/material/Divider";
import Paper from "@mui/material/Paper";
import Stack from "@mui/material/Stack";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Checkbox from "@mui/material/Checkbox";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import Snackbar from "@mui/material/Snackbar";
import AudioPlayer from "@/components/AudioPlayer";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FlagIcon from "@mui/icons-material/Flag";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import DeleteIcon from "@mui/icons-material/Delete";
import AddIcon from "@mui/icons-material/Add";
import SettingsIcon from "@mui/icons-material/Settings";
import EditIcon from "@mui/icons-material/Edit";
import Drawer from "@mui/material/Drawer";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getPodcast,
  updateScript,
  listSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  reorderSegments,
  synthesizeSegment,
  rebuildAudio,
  changeVoice,
  getSegment,
  getAudioSrc,
  getCreditBalance,
  ApiError,
  PodcastProject,
  PodcastSegment,
} from "@/lib/api";

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

// Pause markers: <#N#> where N = seconds
const PAUSE_MARKERS = [
  { tag: "<#0.5#>", label: "短停顿 0.5s" },
  { tag: "<#1.0#>", label: "中停顿 1.0s" },
  { tag: "<#2.0#>", label: "长停顿 2.0s" },
];

// Common multi-pronunciation characters for the selector
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
// Types
// ---------------------------------------------------------------------------
interface EditingState {
  [segId: string]: {
    text: string;
    emotion: string;
    pause_after_ms: number;
  };
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------
export default function EditorPage() {
  useRequireAuth();
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

  // Balance & credit estimation
  const [balance, setBalance] = React.useState<number | null>(null);

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

  // Mark insert menu
  const [markMenuAnchor, setMarkMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [markTargetSegId, setMarkTargetSegId] = React.useState<string | null>(null);
  const [markInsertCallback, setMarkInsertCallback] = React.useState<null | ((tag: string) => void)>(null);

  // Multi-pronunciation selector
  const [multiProDialogOpen, setMultiProDialogOpen] = React.useState(false);
  const [multiProChar, setMultiProChar] = React.useState("");
  const [multiProReading, setMultiProReading] = React.useState("");

  // Audio / Rebuild
  const [fullAudioUrl, setFullAudioUrl] = React.useState<string | null>(null);
  const [fullAudioFilename, setFullAudioFilename] = React.useState<string>("");
  const [buildLoading, setBuildLoading] = React.useState(false);

  // Right panel (voice settings)
  const [rightPanelOpen, setRightPanelOpen] = React.useState(false);

  // Polling: track segments that are queued/synthesizing
  const pollingRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Undo/redo (simple client-side)
  const undoStack = React.useRef<Array<{ segs: PodcastSegment[] }>>([]);
  const redoStack = React.useRef<Array<{ segs: PodcastSegment[] }>>([]);

  // -----------------------------------------------------------------------
  // Computed values
  // -----------------------------------------------------------------------
  const totalChars = React.useMemo(() => {
    if (editingSegId && editing[editingSegId]) {
      return editing[editingSegId].text.length;
    }
    // Return total chars across all segments when not editing
    return segments.reduce((sum, s) => sum + (s.text?.length || 0), 0);
  }, [segments, editing, editingSegId]);

  const estimatedCredits = totalChars + 20; // chars×1 + script generation 20
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
        getPodcast(projectId),
        listSegments(projectId),
      ]);
      setProject(proj);
      setSegments(segs);
      undoStack.current = [];
      redoStack.current = [];
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  // Load balance
  const loadBalance = React.useCallback(async () => {
    try {
      const data = await getCreditBalance();
      setBalance(data.balance);
    } catch {
      setBalance(500); // mock for dev
    }
  }, []);

  React.useEffect(() => {
    if (!projectId) return;
    loadData();
    loadBalance();
  }, [projectId, loadData, loadBalance]);

  // -----------------------------------------------------------------------
  // Single segment editing
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
    setEditingSegId(null);
    setEditing((prev) => {
      const next = { ...prev };
      delete next[editingSegId!];
      return next;
    });
  };

  const saveEditing = async (segId: string) => {
    const draft = editing[segId];
    if (!draft) return;
    setSaving(true);
    setError("");
    pushUndo(segments);
    try {
      const updated = await updateSegment(segId, {
        text: draft.text,
        emotion: draft.emotion || undefined,
        pause_after_ms: draft.pause_after_ms,
      });
      setSegments((prev) =>
        prev.map((s) => (s.id === segId ? { ...s, ...updated, status: "draft" as const } : s))
      );
      setEditingSegId(null);
      setSuccessMsg("片段已保存（状态：draft）");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "保存失败";
      setError(msg);
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

  // -----------------------------------------------------------------------
  // Mark insertion helpers
  // -----------------------------------------------------------------------
  const insertMarkToEditing = (segId: string, tag: string) => {
    const draft = editing[segId];
    if (!draft) return;
    handleEditingChange(segId, "text", draft.text + tag);
  };

  const insertMarkToNewSeg = (tag: string) => {
    setNewSegText((prev) => prev + tag);
  };

  const handleMarkSelect = (tag: string) => {
    setMarkMenuAnchor(null);
    if (markInsertCallback) {
      markInsertCallback(tag);
      setMarkInsertCallback(null);
      return;
    }
    if (markTargetSegId) {
      insertMarkToEditing(markTargetSegId, tag);
      setMarkTargetSegId(null);
    } else {
      insertMarkToNewSeg(tag);
    }
  };

  // -----------------------------------------------------------------------
  // Multi-pronunciation handler
  // -----------------------------------------------------------------------
  const handleMultiProConfirm = () => {
    if (!multiProChar || !multiProReading) return;
    const tag = `【${multiProChar}(${multiProReading})】`;
    handleMarkSelect(tag);
    setMultiProDialogOpen(false);
    setMultiProChar("");
    setMultiProReading("");
  };

  // -----------------------------------------------------------------------
  // Add segment
  // -----------------------------------------------------------------------
  const handleAddSegment = async () => {
    if (!newSegText.trim()) return;
    setError("");
    pushUndo(segments);
    try {
      const seg = await createSegment(projectId, {
        role_key: newSegRole,
        text: newSegText,
        emotion: newSegEmotion || undefined,
        pause_after_ms: newSegPause,
      });
      setSegments((prev) => [...prev, { ...seg, status: "draft" }]);
      setNewSegText("");
      setNewSegEmotion("");
      setNewSegPause(700);
      setSuccessMsg("片段已添加");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "添加失败";
      setError(msg);
    }
  };

  // -----------------------------------------------------------------------
  // Delete segment
  // -----------------------------------------------------------------------
  const handleDeleteSegment = async (segId: string) => {
    if (!confirm("确定删除该片段？")) return;
    setError("");
    pushUndo(segments);
    try {
      await deleteSegment(segId);
      setSegments((prev) => prev.filter((s) => s.id !== segId));
      setSuccessMsg("片段已删除");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "删除失败";
      setError(msg);
    }
  };

  // -----------------------------------------------------------------------
  // Bulk actions
  // -----------------------------------------------------------------------
  const handleBulkSave = async () => {
    if (selectedIds.size === 0) return;
    setSaving(true);
    setError("");
    pushUndo(segments);
    try {
      const updates = Array.from(selectedIds).map(async (segId) => {
        const seg = segments.find((s) => s.id === segId);
        if (!seg) return null;
        const patch: Record<string, unknown> = {};
        if (bulkEmotion) patch.emotion = bulkEmotion;
        if (bulkPause) patch.pause_after_ms = parseInt(bulkPause, 10);
        if (Object.keys(patch).length === 0) return null;
        return updateSegment(segId, patch);
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
      const msg = err instanceof ApiError ? err.message : "批量保存失败";
      setError(msg);
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
      await Promise.all(Array.from(selectedIds).map((id) => deleteSegment(id)));
      setSegments((prev) => prev.filter((s) => !selectedIds.has(s.id)));
      setSelectedIds(new Set());
      setSuccessMsg("批量删除完成");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "批量删除失败";
      setError(msg);
    }
  };

  const handleSelectAll = () => {
    if (selectedIds.size === segments.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(segments.map((s) => s.id)));
    }
  };

  // -----------------------------------------------------------------------
  // Undo / Redo
  // -----------------------------------------------------------------------
  const handleUndo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ segs: JSON.parse(JSON.stringify(segments)) });
    setSegments(prev.segs);
    setSuccessMsg("已撤销");
  };

  const handleRedo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ segs: JSON.parse(JSON.stringify(segments)) });
    setSegments(next.segs);
    setSuccessMsg("已重做");
  };

  // -----------------------------------------------------------------------
  // AI optimize
  // -----------------------------------------------------------------------
  const handleAiOptimize = async () => {
    if (!aiSegId || !aiPrompt) return;
    setAiLoading(true);
    setError("");
    const promptToUse = aiCustomPrompt.trim() || aiPrompt;
    try {
      const seg = segments.find((s) => s.id === aiSegId);
      if (!seg) return;
      // Mock: prepend AI-optimized note
      const newText = `[AI优化：${promptToUse}]\n${seg.text}`;
      const updated = await updateSegment(aiSegId, { text: newText });
      setSegments((prev) =>
        prev.map((s) => (s.id === aiSegId ? { ...s, ...updated, status: "draft" } : s))
      );
      setAiDialogOpen(false);
      setAiSegId(null);
      setAiPrompt("");
      setAiCustomPrompt("");
      setSuccessMsg("AI 优化完成（演示模式）");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "AI 优化失败";
      setError(msg);
    } finally {
      setAiLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Synthesize
  // -----------------------------------------------------------------------
  const handleSynthesize = async (segId: string) => {
    if (insufficientBalance) {
      setError("余额不足，请充值后再试");
      return;
    }
    setError("");
    try {
      await synthesizeSegment(segId);
      setSuccessMsg("已加入合成队列");
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "合成失败";
      setError(msg);
    }
  };

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

  // -----------------------------------------------------------------------
  // Loading / Error states
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <Container sx={{ py: 8, textAlign: "center" }}>
        <CircularProgress />
      </Container>
    );
  }

  if (!project) {
    return (
      <Container sx={{ py: 8 }}>
        <Alert severity="error">项目未找到</Alert>
        <Button onClick={() => router.push("/podcasts")} sx={{ mt: 2 }}>
          返回列表
        </Button>
      </Container>
    );
  }

  // -----------------------------------------------------------------------
  // Build full audio (T-3.6 & T-3.8)
  // -----------------------------------------------------------------------
  const handleBuildAudio = async () => {
    setBuildLoading(true);
    setError("");
    try {
      const result = await rebuildAudio(projectId);
      const url = result.url || "";
      setFullAudioUrl(url);
      setFullAudioFilename(`full_${projectId}.wav`);
      setSuccessMsg("音频拼接完成，可使用底部播放器播放");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "拼接失败";
      setError(msg);
    } finally {
      setBuildLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Polling: update segment status (T-3.5)
  // -----------------------------------------------------------------------
  React.useEffect(() => {
    const hasActive = segments.some(
      (s) => s.status === "queued" || s.status === "synthesizing"
    );
    if (!hasActive) {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      return;
    }
    if (pollingRef.current) return;
    pollingRef.current = setInterval(async () => {
      try {
        const updated = await Promise.all(
          segments
            .filter((s) => s.status === "queued" || s.status === "synthesizing")
            .map((s) => getSegment(s.id))
        );
        setSegments((prev) =>
          prev.map((s) => {
            const u = updated.find((r) => r && r.id === s.id);
            return u ? { ...s, ...u } : s;
          })
        );
      } catch { /* ignore polling errors */ }
    }, 3000);
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
    };
  }, [segments]);

  // -----------------------------------------------------------------------
  // Right panel: voice settings (T-3.7)
  // -----------------------------------------------------------------------
  const handleChangeVoice = async (roleId: string, data: { voice_id: string; speed?: number; pitch?: number; volume?: number }) => {
    setError("");
    try {
      await changeVoice(roleId, data);
      setSuccessMsg("音色已切换，相关片段已标记 draft");
      loadData();
      setRightPanelOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "切换失败";
      setError(msg);
    }
  };

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------
  return (
    <Container maxWidth="lg" sx={{ py: 3, pb: 10 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {project.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            状态：{project.status} · 模式：{project.mode} · 共 {segments.length} 段
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="撤销">
            <IconButton size="small" onClick={handleUndo} disabled={undoStack.current.length === 0}>
              <UndoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="重做">
            <IconButton size="small" onClick={handleRedo} disabled={redoStack.current.length === 0}>
              <RedoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="拼接全部音频">
            <IconButton size="small" onClick={handleBuildAudio} disabled={buildLoading}>
              {buildLoading ? <CircularProgress size={20} /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="音色设置">
            <IconButton size="small" onClick={() => setRightPanelOpen(true)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button variant="outlined" size="small" onClick={() => router.push("/podcasts")}>
            返回列表
          </Button>
        </Stack>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Balance & Credit Estimation Bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          字数：<strong>{totalChars}</strong>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          预计消耗：<strong>{estimatedCredits} 积分</strong>
        </Typography>
        <Typography variant="caption" color={insufficientBalance ? "error" : "text.secondary"}>
          余额：<strong>{balance !== null ? balance : "..."} 积分</strong>
          {insufficientBalance && " · 余额不足"}
        </Typography>
        {insufficientBalance && (
          <Button size="small" color="error" variant="outlined">
            去充值
          </Button>
        )}
      </Paper>

      <Divider sx={{ mb: 2 }} />

      {/* Toolbar */}
      <Paper variant="outlined" sx={{ p: 1, mb: 2, display: "flex", gap: 1, flexWrap: "wrap", alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
          工具栏：
        </Typography>
        <Tooltip title="加粗选中文本（编辑模式下生效）">
          <IconButton
            size="small"
            onClick={() => {
              if (editingSegId && editing[editingSegId]) {
                handleEditingChange(editingSegId, "text", editing[editingSegId].text + "**粗体**");
              }
            }}
          >
            <FormatBoldIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="斜体（编辑模式下生效）">
          <IconButton
            size="small"
            onClick={() => {
              if (editingSegId && editing[editingSegId]) {
                handleEditingChange(editingSegId, "text", editing[editingSegId].text + "*斜体*");
              }
            }}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="插入暂停标记">
          <IconButton
            size="small"
            onClick={(e) => {
              setMarkMenuAnchor(e.currentTarget);
              setMarkTargetSegId(editingSegId);
              setMarkInsertCallback(null);
            }}
          >
            <FlagIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="多音字选择器">
          <IconButton
            size="small"
            onClick={() => setMultiProDialogOpen(true)}
          >
            <FormatItalicIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {selectedIds.size > 0 && (
          <Button size="small" variant="contained" color="warning" onClick={handleBulkDelete}>
            删除选中 ({selectedIds.size})
          </Button>
        )}
      </Paper>

      {/* Mark insertion menu */}
      <Menu
        anchorEl={markMenuAnchor}
        open={Boolean(markMenuAnchor)}
        onClose={() => { setMarkMenuAnchor(null); setMarkTargetSegId(null); }}
      >
        <MenuItem disabled sx={{ fontWeight: 600 }}>暂停标记</MenuItem>
        {PAUSE_MARKERS.map((m) => (
          <MenuItem key={m.tag} onClick={() => handleMarkSelect(m.tag)}>
            {m.label}
          </MenuItem>
        ))}
        <MenuItem disabled sx={{ fontWeight: 600 }}>多音字</MenuItem>
        <MenuItem onClick={() => { setMultiProDialogOpen(true); setMarkMenuAnchor(null); }}>
          打开多音字选择器…
        </MenuItem>
        <MenuItem disabled sx={{ fontWeight: 600 }}>语气词</MenuItem>
        {TONE_WORDS.map((t) => (
          <MenuItem key={t.tag} onClick={() => handleMarkSelect(t.tag)}>
            {t.label} {t.tag}
          </MenuItem>
        ))}
      </Menu>

      {/* Bulk edit panel */}
      {selectedIds.size > 0 && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2, bgcolor: "action.hover" }}>
          <Typography variant="subtitle2" gutterBottom>
            批量编辑（已选 {selectedIds.size} 段）
          </Typography>
          <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
            <TextField
              select
              label="情绪"
              size="small"
              value={bulkEmotion}
              onChange={(e) => setBulkEmotion(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              {EMOTION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="停顿(ms)"
              size="small"
              type="number"
              value={bulkPause}
              onChange={(e) => setBulkPause(e.target.value)}
              sx={{ width: 130 }}
            />
            <Button variant="contained" size="small" onClick={handleBulkSave} disabled={saving}>
              批量保存
            </Button>
            <Button size="small" onClick={handleSelectAll}>
              {selectedIds.size === segments.length ? "取消全选" : "全选"}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Segment List */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        播客片段 ({segments.length})
        <Button size="small" onClick={handleSelectAll} sx={{ ml: 2 }}>
          {selectedIds.size === segments.length ? "取消全选" : "全选"}
        </Button>
      </Typography>

      {segments.length === 0 ? (
        <Paper variant="outlined" sx={{ p: 4, textAlign: "center" }}>
          <Typography variant="body2" color="text.secondary">
            暂无片段，请在下方添加第一段内容
          </Typography>
        </Paper>
      ) : (
        segments.map((seg, idx) => {
          const isEditing = editingSegId === seg.id;
          const draft = editing[seg.id];
          const roleColor = getRoleColor(seg);

          return (
            <Paper
              key={seg.id}
              variant="outlined"
              sx={{
                p: 2,
                mb: 1.5,
                bgcolor: selectedIds.has(seg.id) ? "action.selected" : "background.paper",
                borderLeft: `4px solid ${roleColor}`,
                transition: "background-color 0.2s",
              }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                {/* Selection checkbox */}
                <Checkbox
                  size="small"
                  checked={selectedIds.has(seg.id)}
                  onChange={(e) => {
                    const next = new Set(selectedIds);
                    if (e.target.checked) next.add(seg.id);
                    else next.delete(seg.id);
                    setSelectedIds(next);
                  }}
                  sx={{ mt: 0.5 }}
                />

                {/* Segment number */}
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24, mt: 0.5 }}>
                  {idx + 1}
                </Typography>

                {/* Content area */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  {/* Role badge */}
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Box
                      sx={{
                        px: 1,
                        py: 0.25,
                        borderRadius: 1,
                        bgcolor: roleColor + "22",
                        color: roleColor,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {seg.role?.name || seg.role_id || "?"}
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      情绪：{getEmotionLabel(seg.emotion)} · 停顿：{seg.pause_after_ms || 700}ms
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      状态：{seg.status}
                    </Typography>
                  </Stack>

                  {/* Editing mode vs Display mode */}
                  {isEditing && draft ? (
                    <Box sx={{ mt: 1 }}>
                      <TextField
                        multiline
                        fullWidth
                        minRows={2}
                        maxRows={8}
                        value={draft.text}
                        onChange={(e) => handleEditingChange(seg.id, "text", e.target.value)}
                        sx={{ mb: 1 }}
                      />
                      <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                        <TextField
                          select
                          label="情绪"
                          size="small"
                          value={draft.emotion}
                          onChange={(e) => handleEditingChange(seg.id, "emotion", e.target.value)}
                          sx={{ minWidth: 120 }}
                        >
                          {EMOTION_OPTIONS.map((o) => (
                            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                          ))}
                        </TextField>
                        <TextField
                          label="停顿(ms)"
                          size="small"
                          type="number"
                          value={draft.pause_after_ms}
                          onChange={(e) =>
                            handleEditingChange(seg.id, "pause_after_ms", parseInt(e.target.value, 10) || 700)
                          }
                          sx={{ width: 130 }}
                        />
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<SaveIcon />}
                          onClick={() => saveEditing(seg.id)}
                          disabled={saving}
                        >
                          保存
                        </Button>
                        <Button
                          size="small"
                          startIcon={<CancelIcon />}
                          onClick={cancelEditing}
                        >
                          取消
                        </Button>
                        <Button
                          size="small"
                          startIcon={<FlagIcon />}
                          onClick={(e) => {
                            setMarkMenuAnchor(e.currentTarget);
                            setMarkTargetSegId(seg.id);
                          }}
                        >
                          插入标记
                        </Button>
                      </Stack>
                    </Box>
                  ) : (
                    <Box>
                      <Typography
                        variant="body2"
                        sx={{
                          whiteSpace: "pre-wrap",
                          lineHeight: 1.7,
                          ...(seg.text.includes("**") ? { fontWeight: 600 } : {}),
                        }}
                      >
                        {seg.text.split(/(\*\*.*?\*\*)/g).map((part, i) =>
                          part.startsWith("**") && part.endsWith("**") ? (
                            <strong key={i}>{part.slice(2, -2)}</strong>
                          ) : (
                            <span key={i}>{part}</span>
                          )
                        )}
                      </Typography>
                      {seg.audio_asset && (
                        <Button
                          size="small"
                          startIcon={<PlayArrowIcon />}
                          sx={{ mt: 0.5 }}
                          onClick={() => alert("播放功能开发中")}
                        >
                          播放片段
                        </Button>
                      )}
                    </Box>
                  )}
                </Box>

                {/* Action buttons */}
                <Stack direction="row" spacing={0.5}>
                  {!isEditing && (
                    <>
                      <Tooltip title="编辑">
                        <IconButton size="small" onClick={() => startEditing(seg)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="AI 优化">
                        <IconButton
                          size="small"
                          onClick={() => {
                            setAiSegId(seg.id);
                            setAiDialogOpen(true);
                          }}
                        >
                          <FormatItalicIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="合成语音">
                        <IconButton
                          size="small"
                          onClick={() => handleSynthesize(seg.id)}
                          color={insufficientBalance ? "error" : "primary"}
                          disabled={insufficientBalance}
                        >
                          <PlayArrowIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                  <Tooltip title="删除">
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteSegment(seg.id)}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          );
        })
      )}

      <Divider sx={{ my: 3 }} />

      {/* Add New Segment */}
      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          添加新片段
        </Typography>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2} flexWrap="wrap">
            <TextField
              select
              label="角色"
              size="small"
              value={newSegRole}
              onChange={(e) => setNewSegRole(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              {(project.roles || []).map((r) => (
                <MenuItem key={r.role_key} value={r.role_key}>
                  {r.name}
                </MenuItem>
              ))}
              {(!project.roles || project.roles.length === 0) && [
                <MenuItem key="host" value="host">主持人</MenuItem>,
                <MenuItem key="guest" value="guest">嘉宾</MenuItem>,
              ]}
            </TextField>
            <TextField
              select
              label="情绪"
              size="small"
              value={newSegEmotion}
              onChange={(e) => setNewSegEmotion(e.target.value)}
              sx={{ minWidth: 120 }}
            >
              {EMOTION_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="停顿(ms)"
              size="small"
              type="number"
              value={newSegPause}
              onChange={(e) => setNewSegPause(parseInt(e.target.value, 10) || 700)}
              sx={{ width: 130 }}
            />
            <Button
              size="small"
              startIcon={<FlagIcon />}
              onClick={(e) => {
                setMarkMenuAnchor(e.currentTarget);
                setMarkTargetSegId(null);
              }}
            >
              插入标记
            </Button>
          </Stack>
          <TextField
            label="片段内容"
            fullWidth
            multiline
            minRows={2}
            maxRows={6}
            value={newSegText}
            onChange={(e) => setNewSegText(e.target.value)}
            placeholder="输入该片段的播客文本..."
          />
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleAddSegment}
            disabled={!newSegText.trim()}
            sx={{ alignSelf: "flex-start" }}
          >
            添加片段
          </Button>
        </Stack>
      </Paper>

      {/* AI Optimize Dialog */}
      <Dialog open={aiDialogOpen} onClose={() => setAiDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>AI 优化片段</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="优化方式（快捷选择）"
              fullWidth
              value={aiPrompt}
              onChange={(e) => { setAiPrompt(e.target.value); setAiCustomPrompt(""); }}
            >
              {AI_OPTIMIZE_PROMPTS.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </TextField>
            <TextField
              label="自定义指令（可选，填写后优先使用）"
              fullWidth
              multiline
              rows={3}
              value={aiCustomPrompt}
              onChange={(e) => { setAiCustomPrompt(e.target.value); setAiPrompt(""); }}
              placeholder="输入自定义 AI 指令，例如：多用比喻、增加互动感…"
            />
            <Alert severity="info">
              当前为演示模式。接入 LLM API 后将实现真实 AI 优化。
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAiDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleAiOptimize}
            disabled={aiLoading || (!aiPrompt && !aiCustomPrompt.trim())}
          >
            {aiLoading ? "处理中..." : "优化"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Multi-pronunciation Selector Dialog */}
      <Dialog open={multiProDialogOpen} onClose={() => setMultiProDialogOpen(false)} maxWidth="xs">
        <DialogTitle>多音字选择器</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              select
              label="选择多音字"
              fullWidth
              value={multiProChar}
              onChange={(e) => { setMultiProChar(e.target.value); setMultiProReading(""); }}
            >
              {MULTI_PRONUNCIATION.map((m) => (
                <MenuItem key={m.char} value={m.char}>{m.char}</MenuItem>
              ))}
            </TextField>
            {multiProChar && (
              <TextField
                select
                label="选择读音"
                fullWidth
                value={multiProReading}
                onChange={(e) => setMultiProReading(e.target.value)}
              >
                {MULTI_PRONUNCIATION.find((m) => m.char === multiProChar)?.readings.map((r) => (
                  <MenuItem key={r} value={r}>{r}</MenuItem>
                ))}
              </TextField>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMultiProDialogOpen(false)}>取消</Button>
          <Button
            variant="contained"
            onClick={handleMultiProConfirm}
            disabled={!multiProChar || !multiProReading}
          >
            插入标记
          </Button>
        </DialogActions>
      </Dialog>

      {/* Success snackbar */}
      <Snackbar
        open={!!successMsg}
        autoHideDuration={3000}
        onClose={() => setSuccessMsg("")}
        message={successMsg}
      />

      {/* Audio Player (T-3.8) */}
      {fullAudioUrl && (
        <Box sx={{ mt: 3, mb: 2 }}>
          <AudioPlayer src={getAudioSrc(fullAudioUrl)} filename={fullAudioFilename} />
        </Box>
      )}
      {!fullAudioUrl && segments.some(s => s.audio_asset) && (
        <Button
          variant="contained"
          color="secondary"
          fullWidth
          onClick={handleBuildAudio}
          disabled={buildLoading}
          sx={{ mt: 2, mb: 2 }}
        >
          {buildLoading ? "拼接中..." : "拼接全部音频"}
        </Button>
      )}

      {/* Right Panel Drawer (T-3.7) */}
      <Drawer
        anchor="right"
        open={rightPanelOpen}
        onClose={() => setRightPanelOpen(false)}
      >
        <Box sx={{ width: 320, p: 2 }}>
          <Typography variant="h6" gutterBottom>音色设置</Typography>
          {project?.roles?.map(role => (
            <Box key={role.id} sx={{ mb: 2, p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 }}>
              <Typography variant="subtitle2">{role.name}</Typography>
              <TextField
                label="Voice ID"
                size="small"
                fullWidth
                defaultValue={role.voice_id || ""}
                sx={{ mt: 1 }}
                id={`voice-${role.id}`}
              />
              <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => {
                    const input = document.getElementById(`voice-${role.id}`) as HTMLInputElement;
                    if (input?.value) handleChangeVoice(role.id, { voice_id: input.value });
                  }}
                >
                  确认切换
                </Button>
              </Stack>
            </Box>
          ))}
        </Box>
      </Drawer>

    </Container>
  );
}

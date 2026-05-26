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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import SaveIcon from "@mui/icons-material/Save";
import CancelIcon from "@mui/icons-material/Cancel";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import UndoIcon from "@mui/icons-material/Undo";
import RedoIcon from "@mui/icons-material/Redo";
import FormatBoldIcon from "@mui/icons-material/FormatBold";
import FormatItalicIcon from "@mui/icons-material/FormatItalic";
import FlagIcon from "@mui/icons-material/Flag";
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
  getCreditBalance,
  ApiError,
  PodcastProject,
  PodcastSegment,
} from "@/lib/api";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const EMOTION_OPTIONS = [
  { value: "", label: "默认" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "calm", label: "平静" },
  { value: "excited", label: "兴奋" },
];

const MARK_TAGS = [
  { tag: "[音乐]", label: "音乐" },
  { tag: "[音效]", label: "音效" },
  { tag: "[停顿:", label: "停顿(ms)", suffix: "]" },
  { tag: "[加速:", label: "加速", suffix: "]" },
  { tag: "[角色:", label: "角色切换", suffix: "]" },
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
  const [aiLoading, setAiLoading] = React.useState(false);

  // Mark insert menu
  const [markMenuAnchor, setMarkMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [markTargetSegId, setMarkTargetSegId] = React.useState<string | null>(null);

  // Undo/redo (simple client-side)
  const undoStack = React.useRef<Array<{ segs: PodcastSegment[] }>>([]);
  const redoStack = React.useRef<Array<{ segs: PodcastSegment[] }>>([]);

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

  React.useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId, loadData]);

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
        prev.map((s) => (s.id === segId ? { ...s, ...updated } : s))
      );
      setEditingSegId(null);
      setSuccessMsg("片段已保存");
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
  // Mark insertion (toolbar)
  // -----------------------------------------------------------------------
  const insertMark = (segId: string, tag: string) => {
    const draft = editing[segId];
    if (!draft) return;
    const newText = draft.text + tag;
    handleEditingChange(segId, "text", newText);
    setMarkMenuAnchor(null);
  };

  const insertMarkToNewSeg = () => {
    setNewSegText((prev) => prev + "[音乐] ");
    setMarkMenuAnchor(null);
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
      setSegments((prev) => [...prev, seg]);
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
          return updated ? { ...s, ...updated } : s;
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
    // TODO: Replace with real LLM API call
    try {
      const seg = segments.find((s) => s.id === aiSegId);
      if (!seg) return;
      // Mock: just append a note
      const newText = seg.text + "\n\n[AI优化：" + aiPrompt + "]";
      const updated = await updateSegment(aiSegId, { text: newText });
      setSegments((prev) =>
        prev.map((s) => (s.id === aiSegId ? { ...s, ...updated } : s))
      );
      setAiDialogOpen(false);
      setAiSegId(null);
      setAiPrompt("");
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
        <Tooltip title="插入标记">
          <IconButton
            size="small"
            onClick={(e) => {
              setMarkMenuAnchor(e.currentTarget);
              setMarkTargetSegId(editingSegId);
            }}
          >
            <FlagIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Menu
          anchorEl={markMenuAnchor}
          open={Boolean(markMenuAnchor)}
          onClose={() => setMarkMenuAnchor(null)}
        >
          {MARK_TAGS.map((m) => (
            <MenuItem
              key={m.tag}
              onClick={() => {
                const targetId = markTargetSegId;
                if (targetId) {
                  insertMark(targetId, m.suffix ? m.tag + "0" + m.suffix : m.tag + " ");
                } else {
                  insertMarkToNewSeg();
                }
                setMarkMenuAnchor(null);
              }}
            >
              {m.label}
            </MenuItem>
          ))}
        </Menu>
        {selectedIds.size > 0 && (
          <Button size="small" variant="contained" color="warning" onClick={handleBulkDelete}>
            删除选中 ({selectedIds.size})
          </Button>
        )}
      </Paper>

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
                          color="primary"
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
              label="优化方式"
              fullWidth
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
            >
              {AI_OPTIMIZE_PROMPTS.map((p) => (
                <MenuItem key={p.value} value={p.value}>{p.label}</MenuItem>
              ))}
            </TextField>
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
            disabled={aiLoading || !aiPrompt}
          >
            {aiLoading ? "处理中..." : "优化"}
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
    </Container>
  );
}

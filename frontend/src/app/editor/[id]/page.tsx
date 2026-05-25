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
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import AddIcon from "@mui/icons-material/Add";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import {
  getPodcast,
  updateScript,
  listSegments,
  createSegment,
  updateSegment,
  deleteSegment,
  synthesizeSegment,
  ApiError,
  PodcastProject,
  PodcastSegment,
} from "@/lib/api";

export default function EditorPage() {
  useRequireAuth();
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = React.useState<PodcastProject | null>(null);
  const [scriptContent, setScriptContent] = React.useState("");
  const [outline, setOutline] = React.useState("");
  const [segments, setSegments] = React.useState<PodcastSegment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState("");
  const [segmentText, setSegmentText] = React.useState("");
  const [editingSegmentId, setEditingSegmentId] = React.useState<string | null>(null);

  // Load podcast data
  React.useEffect(() => {
    if (!projectId) return;
    loadData();
  }, [projectId]);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [proj, segs] = await Promise.all([
        getPodcast(projectId),
        listSegments(projectId),
      ]);
      setProject(proj);
      setScriptContent(proj.script?.script_content || "");
      setOutline(proj.script?.outline || "");
      setSegments(segs);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScript = async () => {
    setSaving(true);
    setError("");
    try {
      await updateScript(projectId, {
        script_content: scriptContent,
        outline: outline || undefined,
      });
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "保存失败";
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleAddSegment = async () => {
    if (!segmentText.trim()) return;
    setError("");
    try {
      const seg = await createSegment(projectId, { text: segmentText });
      setSegments((prev) => [...prev, seg]);
      setSegmentText("");
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "添加片段失败";
      setError(msg);
    }
  };

  const handleDeleteSegment = async (segId: string) => {
    setError("");
    try {
      await deleteSegment(segId);
      setSegments((prev) => prev.filter((s) => s.id !== segId));
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "删除失败";
      setError(msg);
    }
  };

  const handleSynthesize = async (segId: string) => {
    setError("");
    try {
      await synthesizeSegment(segId);
      loadData(); // reload to get updated status
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "合成失败";
      setError(msg);
    }
  };

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

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h5" fontWeight={700}>
            {project.title}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            状态：{project.status} · 模式：{project.mode}
          </Typography>
        </Box>
        <Button variant="outlined" onClick={() => router.push("/podcasts")}>
          返回列表
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      <Divider sx={{ mb: 3 }} />

      {/* Script Editor */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          脚本内容
        </Typography>
        <TextField
          label="大纲（可选）"
          fullWidth
          multiline
          rows={2}
          value={outline}
          onChange={(e) => setOutline(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="脚本正文"
          fullWidth
          multiline
          rows={10}
          value={scriptContent}
          onChange={(e) => setScriptContent(e.target.value)}
          placeholder="在此编辑播客脚本内容..."
        />
        <Button
          variant="contained"
          onClick={handleSaveScript}
          disabled={saving}
          sx={{ mt: 2 }}
          endIcon={saving ? <CircularProgress size={16} color="inherit" /> : null}
        >
          {saving ? "保存中..." : "保存脚本"}
        </Button>
      </Paper>

      {/* Segments List */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          播客片段 ({segments.length})
        </Typography>

        {/* Add Segment */}
        <Box sx={{ mb: 2 }}>
          <TextField
            label="新片段内容"
            fullWidth
            multiline
            rows={2}
            value={segmentText}
            onChange={(e) => setSegmentText(e.target.value)}
            placeholder="输入片段文本..."
          />
          <Button
            variant="contained"
            size="small"
            onClick={handleAddSegment}
            disabled={!segmentText.trim()}
            startIcon={<AddIcon />}
            sx={{ mt: 1 }}
          >
            添加片段
          </Button>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Segment List */}
        {segments.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            暂无片段，请添加
          </Typography>
        ) : (
          segments.map((seg, idx) => (
            <Paper
              key={seg.id}
              variant="outlined"
              sx={{ p: 2, mb: 1, bgcolor: "var(--panel)" }}
            >
              <Stack direction="row" alignItems="flex-start" spacing={1}>
                <Typography variant="caption" color="text.secondary" sx={{ minWidth: 24 }}>
                  {idx + 1}
                </Typography>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2">{seg.text}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                    <Typography variant="caption" color="text.secondary">
                      状态：{seg.status}
                    </Typography>
                    {seg.role && (
                      <Typography variant="caption" color="text.secondary">
                        角色：{seg.role.name}
                      </Typography>
                    )}
                  </Stack>
                </Box>
                <Stack direction="row" spacing={0.5}>
                  <IconButton
                    size="small"
                    onClick={() => handleSynthesize(seg.id)}
                    color="primary"
                    title="合成语音"
                  >
                    <PlayArrowIcon fontSize="small" />
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => handleDeleteSegment(seg.id)}
                    color="error"
                    title="删除"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Stack>
              </Stack>
            </Paper>
          ))
        )}
      </Paper>
    </Container>
  );
}

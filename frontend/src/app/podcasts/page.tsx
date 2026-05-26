"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";
import CircularProgress from "@mui/material/CircularProgress";
import Alert from "@mui/material/Alert";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { listPodcasts, deletePodcast, getAudioSrc, ApiError, PodcastProject } from "@/lib/api";

const statusMap: Record<string, { label: string; color: "default" | "success" | "error" | "warning" }> = {
  completed: { label: "已完成", color: "success" },
  draft: { label: "草稿", color: "default" },
  failed: { label: "失败", color: "error" },
  synthesizing: { label: "合成中", color: "warning" },
};

export default function PodcastsPage() {
  useRequireAuth();
  const router = useRouter();
  const [filter, setFilter] = React.useState("all");
  const [podcasts, setPodcasts] = React.useState<PodcastProject[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [playingId, setPlayingId] = React.useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const params: { status?: string } = {};
      if (filter !== "all") params.status = filter;
      const res = await listPodcasts(params);
      setPodcasts(res.items || []);
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "加载失败";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadData();
  }, [filter]);

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个播客吗？")) return;
    setError("");
    try {
      await deletePodcast(id);
      loadData();
    } catch (err: unknown) {
      const msg = err instanceof ApiError ? err.message : "删除失败";
      setError(msg);
    }
  };

  const handlePlay = (p: PodcastProject) => {
    const asset = p.final_audio_asset;
    if (!asset?.url) {
      alert("暂无音频文件");
      return;
    }
    const url = getAudioSrc(asset.url);
    const audio = audioRef.current;
    if (!audio) return;

    if (playingId === p.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      audio.src = url;
      audio.play().catch(() => {});
      setPlayingId(p.id);
    }
  };

  const handleDownload = (p: PodcastProject) => {
    const asset = p.final_audio_asset;
    if (!asset?.url) {
      alert("暂无音频文件");
      return;
    }
    const url = getAudioSrc(asset.url);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${p.title || "podcast"}.mp3`;
    a.click();
  };

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        我的播客
      </Typography>

      <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 3 }}>
        <Tab label={`全部 (${podcasts.length})`} value="all" />
        <Tab label="已完成" value="completed" />
        <Tab label="草稿" value="draft" />
      </Tabs>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : podcasts.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            还没有播客
          </Typography>
          <Button component={Link} href="/create" variant="contained" color="success">
            创建第一条播客
          </Button>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {podcasts.map((p, i) => {
            const status = statusMap[p.status] || statusMap.draft;
            return (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Box
                  className="proto-card"
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                    animation: `scaleIn 0.6s ease-out ${0.1 * (i + 1)}s forwards`,
                    opacity: 0,
                  }}
                >
                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                    <Chip label={p.mode === "duo" ? "双人" : "单人"} size="small" variant="outlined" sx={{ borderRadius: "8px" }} />
                    <Chip label={status.label} size="small" color={status.color} sx={{ borderRadius: "8px" }} />
                  </Box>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: "18px", mb: 1 }}>
                    {p.title}
                  </Typography>
                  <Typography variant="body2" sx={{ color: "var(--text-muted)", fontSize: "14px" }}>
                    状态: {p.status} · 模式: {p.mode}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "var(--text-light)", mb: 2 }}>
                    创建于 {p.created_at?.slice(0, 10) || "-"}
                  </Typography>
                  <Box sx={{ flex: 1 }} />
                  <Divider sx={{ my: 1.5 }} />
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    {p.status === "completed" && (
                      <>
                        <IconButton size="small" sx={{ color: "var(--success)" }} onClick={() => handlePlay(p)}><PlayArrowIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={() => handleDownload(p)}><DownloadIcon fontSize="small" /></IconButton>
                      </>
                    )}
                    <IconButton size="small" component={Link} href={`/editor/${p.id}`}><EditIcon fontSize="small" /></IconButton>
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" sx={{ color: "var(--danger)" }} onClick={() => handleDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </Box>
                </Box>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}

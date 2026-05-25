"use client";

import * as React from "react";
import Link from "next/link";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Chip from "@mui/material/Chip";
import Button from "@mui/material/Button";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import IconButton from "@mui/material/IconButton";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import EditIcon from "@mui/icons-material/Edit";
import DownloadIcon from "@mui/icons-material/Download";
import DeleteIcon from "@mui/icons-material/Delete";

const MOCK_PODCASTS = [
  { id: "p1", title: "AI 改变教育行业", mode: "duo", style: "professional", status: "completed", duration: "3:24", chars: 1200, credits: 1200, created: "2026-05-25" },
  { id: "p2", title: "量子计算入门", mode: "solo", style: "casual", status: "completed", duration: "5:10", chars: 1800, credits: 1800, created: "2026-05-24" },
  { id: "p3", title: "2026 年科技趋势", mode: "duo", style: "news", status: "draft", duration: "-", chars: 800, credits: 0, created: "2026-05-23" },
  { id: "p4", title: "深度学习原理", mode: "solo", style: "storytelling", status: "failed", duration: "-", chars: 2500, credits: 0, created: "2026-05-22" },
];

const statusMap: Record<string, { label: string; color: "default" | "success" | "error" | "warning" }> = {
  completed: { label: "已完成", color: "success" },
  draft: { label: "草稿", color: "default" },
  failed: { label: "失败", color: "error" },
  synthesizing: { label: "合成中", color: "warning" },
};

export default function PodcastsPage() {
  const [filter, setFilter] = React.useState("all");

  const filtered = filter === "all" ? MOCK_PODCASTS : MOCK_PODCASTS.filter((p) => {
    if (filter === "completed") return p.status === "completed";
    if (filter === "draft") return p.status === "draft";
    return true;
  });

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        我的播客
      </Typography>

      <Tabs value={filter} onChange={(_, v) => setFilter(v)} sx={{ mb: 3 }}>
        <Tab label={`全部 (${MOCK_PODCASTS.length})`} value="all" />
        <Tab label="已完成" value="completed" />
        <Tab label="草稿" value="draft" />
      </Tabs>

      {filtered.length === 0 ? (
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
          {filtered.map((p) => {
            const status = statusMap[p.status] || statusMap.draft;
            return (
              <Grid item xs={12} sm={6} md={4} key={p.id}>
                <Card variant="outlined" sx={{ height: "100%" }}>
                  <CardContent>
                    <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
                      <Chip label={p.mode === "duo" ? "双人" : "单人"} size="small" variant="outlined" />
                      <Chip label={status.label} size="small" color={status.color} />
                    </Box>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {p.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      时长: {p.duration} · 字数: {p.chars} · 积分: {p.credits}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      创建于 {p.created}
                    </Typography>
                  </CardContent>
                  <CardActions sx={{ px: 2, pb: 2 }}>
                    {p.status === "completed" && (
                      <>
                        <IconButton size="small" color="success"><PlayArrowIcon /></IconButton>
                        <IconButton size="small"><DownloadIcon /></IconButton>
                      </>
                    )}
                    <IconButton size="small" component={Link} href={`/editor/${p.id}`}><EditIcon /></IconButton>
                    <Box sx={{ flex: 1 }} />
                    <IconButton size="small" color="error"><DeleteIcon /></IconButton>
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}
    </Container>
  );
}

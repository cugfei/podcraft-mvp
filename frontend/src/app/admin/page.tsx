"use client";

import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import PeopleIcon from "@mui/icons-material/People";
import PodcastsIcon from "@mui/icons-material/Podcasts";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import TaskIcon from "@mui/icons-material/Task";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import SettingsVoiceIcon from "@mui/icons-material/SettingsVoice";
import RouterIcon from "@mui/icons-material/Router";
import LocalOfferIcon from "@mui/icons-material/LocalOffer";

const STATS = [
  { label: "用户数", value: "1,234", icon: <PeopleIcon /> },
  { label: "播客数", value: "5,678", icon: <PodcastsIcon /> },
  { label: "任务成功率", value: "96.2%", icon: <TaskIcon /> },
  { label: "充值金额", value: "¥12,340", icon: <AccountBalanceWalletIcon /> },
];

const MODULES = [
  { label: "用户管理", desc: "查看用户列表、积分调整、状态管理", icon: <PeopleIcon fontSize="large" /> },
  { label: "积分流水", desc: "查看所有积分变动记录", icon: <AccountBalanceWalletIcon fontSize="large" /> },
  { label: "播客项目", desc: "查看所有播客项目及状态", icon: <PodcastsIcon fontSize="large" /> },
  { label: "合成任务", desc: "查看任务队列、成功率、耗时", icon: <TaskIcon fontSize="large" /> },
  { label: "错误日志", desc: "查看 Provider 错误、系统异常", icon: <ErrorOutlineIcon fontSize="large" /> },
  { label: "音色配置", desc: "管理预设音色、克隆音色", icon: <SettingsVoiceIcon fontSize="large" /> },
  { label: "Provider 配置", desc: "配置 TTS Provider、降级策略", icon: <RouterIcon fontSize="large" /> },
  { label: "套餐配置", desc: "管理定价套餐、积分额度", icon: <LocalOfferIcon fontSize="large" /> },
];

export default function AdminPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        管理后台
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        PodCraft 运营数据概览与管理入口
      </Typography>

      {/* Stats */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {STATS.map((s) => (
          <Grid item xs={6} md={3} key={s.label}>
            <Card variant="outlined">
              <CardContent sx={{ textAlign: "center" }}>
                <Box sx={{ color: "primary.main", mb: 1 }}>{s.icon}</Box>
                <Typography variant="h5" fontWeight={700}>{s.value}</Typography>
                <Typography variant="body2" color="text.secondary">{s.label}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Module Grid */}
      <Typography variant="h6" fontWeight={600} gutterBottom>
        管理模块
      </Typography>
      <Grid container spacing={2}>
        {MODULES.map((m) => (
          <Grid item xs={12} sm={6} md={3} key={m.label}>
            <Card variant="outlined" sx={{ height: "100%", cursor: "pointer", "&:hover": { borderColor: "success.light" } }}>
              <CardContent sx={{ textAlign: "center" }}>
                <Box sx={{ color: "primary.main", mb: 1 }}>{m.icon}</Box>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>{m.label}</Typography>
                <Typography variant="caption" color="text.secondary">{m.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Container>
  );
}

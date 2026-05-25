"use client";

import * as React from "react";
import Link from "next/link";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";

export default function LoginPage() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("请填写邮箱和密码");
      return;
    }
    setError("");
    // TODO: 接入后端认证 API
  };

  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          登录 PodCraft
        </Typography>
        <Typography variant="body2" color="text.secondary">
          欢迎回来，开始你的播客创作之旅
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="邮箱 / 手机号"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          label="密码"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 3 }}
        />
        <Button type="submit" variant="contained" color="success" fullWidth size="large" sx={{ mb: 2 }}>
          登录
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" textAlign="center">
        还没有账号？{" "}
        <Link href="/register" style={{ color: "#10b981", fontWeight: 600 }}>
          注册
        </Link>
      </Typography>
    </Container>
  );
}

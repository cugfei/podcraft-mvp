"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register, loading, error: authError } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  // Show AuthContext error if present
  React.useEffect(() => {
    if (authError) setError(authError);
  }, [authError]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || !confirm) {
      setError("请填写所有字段");
      return;
    }
    if (password !== confirm) {
      setError("两次密码不一致");
      return;
    }
    if (password.length < 6) {
      setError("密码至少 6 位");
      return;
    }
    setError("");
    setSubmitting(true);
    try {
      await register({ email, password, nickname: email.split("@")[0] });
      router.push("/");
    } catch {
      // error is set by AuthContext or local validation
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Box sx={{ textAlign: "center", mb: 4 }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          注册 PodCraft
        </Typography>
        <Typography variant="body2" color="text.secondary">
          创建账号，即送 500 积分免费体验
        </Typography>
      </Box>

      <Box component="form" onSubmit={handleSubmit}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <TextField
          label="邮箱"
          type="email"
          fullWidth
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          sx={{ mb: 2, "& .MuiInputBase-root": { minHeight: "44px" } }}
        />
        <TextField
          label="密码"
          type="password"
          fullWidth
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          sx={{ mb: 2, "& .MuiInputBase-root": { minHeight: "44px" } }}
        />
        <TextField
          label="确认密码"
          type="password"
          fullWidth
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          sx={{ mb: 3, "& .MuiInputBase-root": { minHeight: "44px" } }}
        />
        <Button
          type="submit"
          variant="contained"
          color="success"
          fullWidth
          size="large"
          sx={{ mb: 2 }}
          disabled={submitting || loading}
        >
          {submitting ? <CircularProgress size={24} color="inherit" /> : "注册（送 500 积分）"}
        </Button>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Typography variant="body2" textAlign="center">
        已有账号？{" "}
        <Link href="/login" style={{ color: "#10b981", fontWeight: 600 }}>
          登录
        </Link>
      </Typography>
    </Container>
  );
}

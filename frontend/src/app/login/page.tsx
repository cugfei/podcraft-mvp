import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export default function LoginPage() {
  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        登录 PodCraft
      </Typography>
      <Alert severity="info">登录表单即将上线 — 支持邮箱/手机号 + 密码登录</Alert>
    </Container>
  );
}

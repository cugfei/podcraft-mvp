import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";

export default function RegisterPage() {
  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Typography variant="h4" fontWeight={700} textAlign="center" gutterBottom>
        注册 PodCraft
      </Typography>
      <Alert severity="info">注册表单即将上线 — 支持邮箱/手机号注册</Alert>
    </Container>
  );
}

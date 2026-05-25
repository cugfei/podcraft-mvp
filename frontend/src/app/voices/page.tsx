import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

export default function VoicesPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        声音工坊
      </Typography>
      <Alert severity="info">音色库功能即将上线 — 支持官方音色浏览、克隆音色管理与音色参数调整</Alert>
      <Box sx={{ mt: 4, color: "text.secondary" }}>
        此处将展示预设音色列表、情感风格选择、语言/方言选项与音色试听功能
      </Box>
    </Container>
  );
}

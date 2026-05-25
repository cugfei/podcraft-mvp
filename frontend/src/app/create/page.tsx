import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

export default function CreatePage() {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        创建新播客
      </Typography>
      <Alert severity="info">
        播客创建功能即将上线 — 支持主题输入、文档粘贴、URL 解析
      </Alert>
      <Box sx={{ mt: 4, color: "text.secondary" }}>
        此处将展示输入方式选择（主题/文本/URL）、播客模式（单人/双人/长文解读）、生成引导与音色预选
      </Box>
    </Container>
  );
}

import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

export default function PodcastsPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        我的播客
      </Typography>
      <Alert severity="info">播客列表功能即将上线</Alert>
      <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
        此处将展示播客列表（标题/类型/状态/时长/字数/积分消耗），支持筛选、操作按钮与空状态提示
      </Box>
    </Container>
  );
}

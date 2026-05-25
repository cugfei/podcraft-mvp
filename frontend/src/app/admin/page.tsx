import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";

export default function AdminPage() {
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        管理后台
      </Typography>
      <Alert severity="warning">管理后台功能即将上线 — 仅限管理员访问</Alert>
      <Box sx={{ mt: 4, color: "text.secondary" }}>
        此处将展示用户管理、积分余额调整、积分流水、播客项目列表、合成任务列表、错误日志、音色配置、Provider 配置、套餐配置等模块
      </Box>
    </Container>
  );
}

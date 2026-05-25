"use client";

import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function VoicesPage() {
  useRequireAuth();

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        声音工坊
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        浏览和选择 AI 音色，为你的播客找到完美声音
      </Typography>

      <Box sx={{ textAlign: "center", py: 8 }}>
        <Typography variant="h6" color="text.secondary" gutterBottom>
          即将上线
        </Typography>
        <Typography variant="body2" color="text.secondary">
          声音工坊功能正在开发中，敬请期待！
        </Typography>
      </Box>
    </Container>
  );
}

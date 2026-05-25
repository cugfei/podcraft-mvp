import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Alert from "@mui/material/Alert";

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        播客编辑器
      </Typography>
      <Alert severity="info">
        播客 ID: {id} — 编辑器功能即将上线
      </Alert>
      <Box sx={{ mt: 4, textAlign: "center", color: "text.secondary" }}>
        此处将展示分段文稿编辑器、音色设置面板与音频播放器
      </Box>
    </Container>
  );
}

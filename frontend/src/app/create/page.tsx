"use client";

import * as React from "react";
import Link from "next/link";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

const MODES = [
  { value: "solo", label: "单人解读", desc: "适合知识分享、新闻播报" },
  { value: "duo", label: "双人对话", desc: "适合访谈、讨论、辩论" },
  { value: "long", label: "长文解读", desc: "粘贴长文自动拆分生成" },
];

const STYLES = [
  { value: "professional", label: "专业" },
  { value: "casual", label: "轻松" },
  { value: "storytelling", label: "故事" },
  { value: "news", label: "新闻" },
];

const DUO_TEMPLATES = [
  { value: "host_expert", label: "主持人 + 专家" },
  { value: "debate", label: "辩论双方" },
  { value: "friends", label: "好友闲聊" },
];

const VOICE_OPTIONS = [
  { value: "xiaoxiao", label: "晓晓（女声·温柔）" },
  { value: "yunxi", label: "云希（男声·磁性）" },
  { value: "xiaoyi", label: "晓伊（女声·活力）" },
  { value: "yunjian", label: "云健（男声·沉稳）" },
];

export default function CreatePage() {
  const [mode, setMode] = React.useState("solo");
  const [style, setStyle] = React.useState("professional");
  const [topic, setTopic] = React.useState("");
  const [text, setText] = React.useState("");
  const [url, setUrl] = React.useState("");
  const [inputType, setInputType] = React.useState("topic");
  const [duration, setDuration] = React.useState(300);
  const [voiceA, setVoiceA] = React.useState("xiaoxiao");
  const [voiceB, setVoiceB] = React.useState("yunxi");
  const [duoTemplate, setDuoTemplate] = React.useState("host_expert");

  const charCount = inputType === "text" ? text.length : topic.length;
  const estimatedCredits = Math.max(20, charCount); // 20 for script gen + 1/char

  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        创建新播客
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
        输入主题或粘贴文本，AI 自动生成播客脚本并合成语音
      </Typography>

      {/* Input Type Toggle */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          输入方式
        </Typography>
        <ToggleButtonGroup
          value={inputType}
          exclusive
          onChange={(_, v) => v && setInputType(v)}
          size="small"
          fullWidth
        >
          <ToggleButton value="topic">主题输入</ToggleButton>
          <ToggleButton value="text">文档粘贴</ToggleButton>
          <ToggleButton value="url">URL 解析</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {/* Input Field */}
      {inputType === "topic" && (
        <TextField
          label="播客主题"
          placeholder="例如：AI 如何改变教育行业"
          fullWidth
          multiline
          rows={2}
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          sx={{ mb: 3 }}
        />
      )}
      {inputType === "text" && (
        <TextField
          label="文档内容"
          placeholder="粘贴你的文本资料..."
          fullWidth
          multiline
          rows={6}
          value={text}
          onChange={(e) => setText(e.target.value)}
          helperText={`${charCount}/5000 字`}
          error={charCount > 5000}
          sx={{ mb: 3 }}
        />
      )}
      {inputType === "url" && (
        <TextField
          label="URL 地址"
          placeholder="https://example.com/article"
          fullWidth
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          sx={{ mb: 3 }}
        />
      )}

      <Divider sx={{ my: 3 }} />

      {/* Mode Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          播客模式
        </Typography>
        <Grid container spacing={2}>
          {MODES.map((m) => (
            <Grid item xs={12} sm={4} key={m.value}>
              <Card
                variant={mode === m.value ? "elevation" : "outlined"}
                elevation={mode === m.value ? 3 : 0}
                sx={{
                  cursor: "pointer",
                  borderColor: mode === m.value ? "success.main" : undefined,
                  "&:hover": { borderColor: "success.light" },
                }}
                onClick={() => setMode(m.value)}
              >
                <CardContent sx={{ textAlign: "center", py: 2 }}>
                  <Typography variant="subtitle1" fontWeight={600}>
                    {m.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {m.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Duo Template */}
      {mode === "duo" && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth size="small">
            <InputLabel>角色模板</InputLabel>
            <Select
              value={duoTemplate}
              label="角色模板"
              onChange={(e) => setDuoTemplate(e.target.value)}
            >
              {DUO_TEMPLATES.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Voice Selection */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          音色选择
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={mode === "duo" ? 6 : 12}>
            <FormControl fullWidth size="small">
              <InputLabel>{mode === "duo" ? "角色 A 音色" : "音色"}</InputLabel>
              <Select value={voiceA} label={mode === "duo" ? "角色 A 音色" : "音色"} onChange={(e) => setVoiceA(e.target.value)}>
                {VOICE_OPTIONS.map((v) => (
                  <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          {mode === "duo" && (
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>角色 B 音色</InputLabel>
                <Select value={voiceB} label="角色 B 音色" onChange={(e) => setVoiceB(e.target.value)}>
                  {VOICE_OPTIONS.map((v) => (
                    <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Box>

      <Divider sx={{ my: 3 }} />

      {/* Generation Guide */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          生成引导
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth size="small">
              <InputLabel>风格</InputLabel>
              <Select value={style} label="风格" onChange={(e) => setStyle(e.target.value)}>
                {STYLES.map((s) => (
                  <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Box>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                目标时长：{Math.floor(duration / 60)} 分钟
              </Typography>
              <Slider
                value={duration}
                onChange={(_, v) => setDuration(v as number)}
                min={60}
                max={1800}
                step={60}
                marks={[
                  { value: 60, label: "1分" },
                  { value: 300, label: "5分" },
                  { value: 900, label: "15分" },
                  { value: 1800, label: "30分" },
                ]}
                size="small"
              />
            </Box>
          </Grid>
        </Grid>
      </Box>

      {/* Estimated Credits */}
      <Alert severity="info" sx={{ mb: 3 }}>
        预计消耗：<strong>{estimatedCredits} 积分</strong>（脚本生成 20 + 语音合成约 {Math.max(0, estimatedCredits - 20)}）
        &nbsp;·&nbsp;当前余额：<strong>500 积分</strong>
      </Alert>

      {/* Submit */}
      <Button
        component={Link}
        href="/editor/new"
        variant="contained"
        color="success"
        size="large"
        fullWidth
        endIcon={<ArrowForwardIcon />}
        disabled={charCount === 0 || charCount > 5000}
        sx={{ py: 1.5, fontSize: "1.1rem" }}
      >
        生成播客
      </Button>
    </Container>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import TextField from "@mui/material/TextField";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import InputLabel from "@mui/material/InputLabel";
import FormControl from "@mui/material/FormControl";
import Slider from "@mui/material/Slider";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Alert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import CircularProgress from "@mui/material/CircularProgress";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { createPodcast, getCreditBalance, ApiError } from "@/lib/api";

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
  useRequireAuth();
  const router = useRouter();

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
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const [balance, setBalance] = React.useState<number | null>(null);

  const charCount = inputType === "text" ? text.length : topic.length;
  const estimatedCredits = charCount + 20; // 字数×1 + 脚本生成20积分

  // 获取余额
  React.useEffect(() => {
    let cancelled = false;
    const loadBalance = async () => {
      try {
        const data = await getCreditBalance();
        if (!cancelled) setBalance(data.balance);
      } catch {
        if (!cancelled) setBalance(500); // mock
      }
    };
    loadBalance();
    return () => { cancelled = true; };
  }, []);

  const insufficientBalance = balance !== null && estimatedCredits > balance;

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    try {
      const project = await createPodcast({
        title: topic || "Untitled Podcast",
        mode,
        style,
        target_duration: duration,
      });
      router.push(`/editor/${project.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof ApiError ? err.message : "创建播客失败，请重试";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

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
              <Box
                onClick={() => setMode(m.value)}
                sx={{
                  cursor: "pointer",
                  bgcolor: "var(--panel)",
                  border: "2px solid",
                  borderColor: mode === m.value ? "var(--brand)" : "var(--line)",
                  borderRadius: "var(--radius)",
                  p: 3,
                  textAlign: "center",
                  transition: "all 0.3s cubic-bezier(0.4,0,0.2,1)",
                  boxShadow: mode === m.value ? "0 8px 24px rgba(11,11,13,0.15)" : "var(--shadow-sm)",
                  transform: mode === m.value ? "scale(1.03)" : "none",
                  "&:hover": {
                    transform: "translateY(-4px)",
                    boxShadow: "0 12px 24px rgba(0,0,0,0.12)",
                    borderColor: "var(--brand-3)",
                  },
                }}
              >
                <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: "18px", mb: 0.5 }}>
                  {m.label}
                </Typography>
                <Typography variant="caption" sx={{ color: "var(--text-muted)" }}>
                  {m.desc}
                </Typography>
              </Box>
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

      {/* Voice Preview */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" fontWeight={600} gutterBottom>
          音色试听
        </Typography>
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          {(mode === "duo" ? [
            { label: "角色A", voice: voiceA },
            { label: "角色B", voice: voiceB },
          ] : [
            { label: "当前音色", voice: voiceA },
          ]).map((item) => (
            <Button
              key={item.voice}
              size="small"
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              onClick={() => alert("音色试听功能开发中")}
            >
              {item.label}: {VOICE_OPTIONS.find(v => v.value === item.voice)?.label}
            </Button>
          ))}
        </Box>
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
      <Alert severity={insufficientBalance ? "warning" : "info"} sx={{ mb: 3 }}>
        预计消耗：<strong>{estimatedCredits} 积分</strong>
        &nbsp;·&nbsp;当前余额：<strong>{balance !== null ? balance : "..."} 积分</strong>
        {insufficientBalance && (
          <Typography variant="caption" sx={{ display: "block", mt: 0.5, color: "error.main" }}>
            余额不足，请充值
          </Typography>
        )}
      </Alert>

      {/* Error */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {/* Submit */}
      <Button
        variant="contained"
        color="success"
        size="large"
        fullWidth
        endIcon={loading ? <CircularProgress size={20} color="inherit" /> : <ArrowForwardIcon />}
        disabled={loading || charCount === 0 || charCount > 5000 || insufficientBalance}
        onClick={handleGenerate}
        sx={{ py: 1.5, fontSize: "1.1rem" }}
      >
        {loading ? "创建中..." : "生成播客"}
      </Button>
    </Container>
  );
}

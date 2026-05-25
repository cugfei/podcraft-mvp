"use client";

import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Divider from "@mui/material/Divider";
import Chip from "@mui/material/Chip";
import Slider from "@mui/material/Slider";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";

// Mock segments for editor preview
const MOCK_SEGMENTS = [
  { id: "1", role: "host", name: "主持人", text: "欢迎收听本期播客，今天我们来聊聊 AI 如何改变教育行业。", status: "completed", color: "#10b981" },
  { id: "2", role: "expert", name: "专家", text: "谢谢主持人。AI 在教育领域的应用确实越来越广泛了。从智能辅导到个性化学习路径，AI 正在重塑传统教育模式。", status: "completed", color: "#3b82f6" },
  { id: "3", role: "host", name: "主持人", text: "那具体有哪些应用场景呢？", status: "completed", color: "#10b981" },
  { id: "4", role: "expert", name: "专家", text: "主要包括三个方面：第一是智能批改，第二是自适应学习系统，第三是虚拟教学助手。", status: "draft", color: "#3b82f6" },
  { id: "5", role: "host", name: "主持人", text: "听起来非常有前景。感谢您的分享！", status: "failed", color: "#10b981" },
];

const VOICE_OPTIONS = [
  { value: "xiaoxiao", label: "晓晓（女声·温柔）" },
  { value: "yunxi", label: "云希（男声·磁性）" },
  { value: "xiaoyi", label: "晓伊（女声·活力）" },
  { value: "yunjian", label: "云健（男声·沉稳）" },
];

const DIALECT_OPTIONS = [
  { value: "auto", label: "自动检测" },
  { value: "zh-CN", label: "普通话" },
  { value: "yue-CN", label: "粤语" },
  { value: "szh-CN", label: "四川话" },
  { value: "db-CN", label: "东北话" },
  { value: "en-US", label: "English" },
];

const EMOTION_OPTIONS = [
  { value: "auto", label: "自动" },
  { value: "happy", label: "开心" },
  { value: "sad", label: "悲伤" },
  { value: "angry", label: "愤怒" },
  { value: "calm", label: "平静" },
  { value: "excited", label: "兴奋" },
];

interface SegmentProps {
  seg: typeof MOCK_SEGMENTS[0];
  onEdit: (id: string, text: string) => void;
}

function Segment({ seg, onEdit }: SegmentProps) {
  const [editing, setEditing] = React.useState(false);
  const [text, setText] = React.useState(seg.text);

  const statusMap: Record<string, { label: string; color: "default" | "success" | "error" | "warning" }> = {
    completed: { label: "已完成", color: "success" },
    draft: { label: "未合成", color: "warning" },
    failed: { label: "失败", color: "error" },
  };
  const status = statusMap[seg.status] || statusMap.draft;

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 1.5, borderLeft: `3px solid ${seg.color}` }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Chip label={seg.name} size="small" sx={{ bgcolor: seg.color, color: "white" }} />
          <Chip label={status.label} size="small" color={status.color} variant="outlined" />
        </Box>
        <Box>
          <Tooltip title="AI 优化">
            <IconButton size="small">🪄</IconButton>
          </Tooltip>
          <Tooltip title="删除">
            <IconButton size="small">🗑️</IconButton>
          </Tooltip>
          {seg.status === "failed" && (
            <Tooltip title="重试">
              <IconButton size="small">🔄</IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      <TextField
        fullWidth
        multiline
        minRows={1}
        maxRows={6}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onFocus={() => setEditing(true)}
        onBlur={() => { setEditing(false); onEdit(seg.id, text); }}
        variant="standard"
        InputProps={{ disableUnderline: true, sx: { fontSize: "0.95rem" } }}
      />
    </Paper>
  );
}

export default function EditorPage() {
  const [segments, setSegments] = React.useState(MOCK_SEGMENTS);
  const [tabValue, setTabValue] = React.useState(0);
  const [voice, setVoice] = React.useState("xiaoxiao");
  const [dialect, setDialect] = React.useState("auto");
  const [emotion, setEmotion] = React.useState("auto");
  const [speed, setSpeed] = React.useState(1.0);
  const [pitch, setPitch] = React.useState(0.0);
  const [volume, setVolume] = React.useState(1.0);

  const totalChars = segments.reduce((sum, s) => sum + s.text.length, 0);
  const estimatedCredits = Math.max(20, totalChars);

  const handleEdit = (id: string, text: string) => {
    setSegments((prev) => prev.map((s) => s.id === id ? { ...s, text } : s));
  };

  return (
    <Box sx={{ display: "flex", height: "calc(100vh - 64px)", overflow: "hidden" }}>
      {/* Left Panel — Segments */}
      <Box sx={{ flex: 1, overflow: "auto", p: 3, bgcolor: "grey.50" }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>
          播客编辑器
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          编辑文稿内容，点击 🪄 AI优化 或 🔄 重合成
        </Typography>

        {/* Quick Toolbar */}
        <Paper variant="outlined" sx={{ p: 1, mb: 2, display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Tooltip title="短停顿 0.5s">
            <Chip label="⏸ 0.5s" size="small" variant="outlined" onClick={() => {}} />
          </Tooltip>
          <Tooltip title="中停顿 1.0s">
            <Chip label="⏸ 1.0s" size="small" variant="outlined" onClick={() => {}} />
          </Tooltip>
          <Tooltip title="长停顿 2.0s">
            <Chip label="⏸ 2.0s" size="small" variant="outlined" onClick={() => {}} />
          </Tooltip>
          <Tooltip title="标记多音字">
            <Chip label="多音字" size="small" variant="outlined" onClick={() => {}} />
          </Tooltip>
          <Tooltip title="插入语气词">
            <Chip label="(laughs)" size="small" variant="outlined" onClick={() => {}} />
          </Tooltip>
        </Paper>

        {/* Segments */}
        {segments.map((seg) => (
          <Segment key={seg.id} seg={seg} onEdit={handleEdit} />
        ))}

        {/* Bottom Stats */}
        <Paper variant="outlined" sx={{ p: 1.5, mt: 2, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography variant="body2" color="text.secondary">
            字数: {totalChars} · 预计时长: {Math.round(totalChars * 0.3)}s
          </Typography>
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Typography variant="body2" color="text.secondary">
              预计消耗: <strong>{estimatedCredits} 积分</strong>
            </Typography>
            <Button variant="contained" color="success" size="small">
              全部合成
            </Button>
          </Box>
        </Paper>
      </Box>

      {/* Right Panel — Settings */}
      <Paper variant="outlined" sx={{ width: 320, overflow: "auto", borderLeft: 1, borderColor: "divider" }}>
        <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} variant="fullWidth">
          <Tab label="设置" />
          <Tab label="历史" />
        </Tabs>

        {tabValue === 0 && (
          <Box sx={{ p: 2 }}>
            {/* Voice Select */}
            <Typography variant="body2" fontWeight={600} gutterBottom>
              音色选择
            </Typography>
            <Tabs value={0} variant="fullWidth" sx={{ mb: 2 }}>
              <Tab label="官方音色" />
              <Tab label="克隆音色" />
            </Tabs>
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>音色</InputLabel>
              <Select value={voice} label="音色" onChange={(e) => setVoice(e.target.value)}>
                {VOICE_OPTIONS.map((v) => (
                  <MenuItem key={v.value} value={v.value}>{v.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Dialect */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>语言/方言增强</InputLabel>
              <Select value={dialect} label="语言/方言增强" onChange={(e) => setDialect(e.target.value)}>
                {DIALECT_OPTIONS.map((d) => (
                  <MenuItem key={d.value} value={d.value}>{d.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Divider sx={{ my: 2 }} />

            {/* Voice Params */}
            <Typography variant="body2" fontWeight={600} gutterBottom>
              音色调节
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">语速: {speed.toFixed(1)}x</Typography>
              <Slider value={speed} onChange={(_, v) => setSpeed(v as number)} min={0.5} max={2.0} step={0.1} size="small" />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">音调: {pitch > 0 ? "+" : ""}{pitch.toFixed(1)}</Typography>
              <Slider value={pitch} onChange={(_, v) => setPitch(v as number)} min={-12} max={12} step={1} size="small" />
            </Box>
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" color="text.secondary">音量: {volume.toFixed(1)}</Typography>
              <Slider value={volume} onChange={(_, v) => setVolume(v as number)} min={0} max={2.0} step={0.1} size="small" />
            </Box>

            <Divider sx={{ my: 2 }} />

            {/* Emotion */}
            <FormControl fullWidth size="small" sx={{ mb: 2 }}>
              <InputLabel>情绪风格</InputLabel>
              <Select value={emotion} label="情绪风格" onChange={(e) => setEmotion(e.target.value)}>
                {EMOTION_OPTIONS.map((e) => (
                  <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button variant="outlined" fullWidth size="small">
              保存当前配置
            </Button>
          </Box>
        )}

        {tabValue === 1 && (
          <Box sx={{ p: 2 }}>
            <Alert severity="info">合成历史将在此显示</Alert>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

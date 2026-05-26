"use client";

import * as React from "react";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Slider from "@mui/material/Slider";
import Typography from "@mui/material/Typography";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import DownloadIcon from "@mui/icons-material/Download";
import { getAudioSrc } from "@/lib/api";

interface AudioPlayerProps {
  src?: string;          // audio URL from backend
  filename?: string;    // display filename
  onDownload?: () => void;
}

export default function AudioPlayer({ src, filename, onDownload }: AudioPlayerProps) {
  const audioRef = React.useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = React.useState(false);
  const [currentTime, setCurrentTime] = React.useState(0);
  const [duration, setDuration] = React.useState(0);
  const [volume, setVolume] = React.useState(0.8);
  const [canPlay, setCanPlay] = React.useState(false);

  const fullSrc = src ? getAudioSrc(src) : undefined;

  // Sync state with audio element
  React.useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setDuration(audio.duration);
    const onEnded = () => setPlaying(false);
    const onCanPlay = () => setCanPlay(true);
    const onError = () => setCanPlay(false);

    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("canplay", onCanPlay);
    audio.addEventListener("error", onError);

    return () => {
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("canplay", onCanPlay);
      audio.removeEventListener("error", onError);
    };
  }, [fullSrc]);

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      audio.play().catch(() => {});
    }
    setPlaying(!playing);
  };

  const handleSeek = (_: unknown, val: number | number[]) => {
    const t = Array.isArray(val) ? val[0] : val;
    const audio = audioRef.current;
    if (audio) audio.currentTime = t;
    setCurrentTime(t);
  };

  const handleVolume = (_: unknown, val: number | number[]) => {
    const v = Array.isArray(val) ? val[0] : val;
    const audio = audioRef.current;
    if (audio) audio.volume = v;
    setVolume(v);
  };

  const handleDownload = () => {
    if (!fullSrc) return;
    const a = document.createElement("a");
    a.href = fullSrc;
    a.download = filename || "podcast.wav";
    a.click();
    onDownload?.();
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? "0" : ""}${sec}`;
  };

  if (!fullSrc) {
    return (
      <Paper variant="outlined" sx={{ p: 2, display: "flex", alignItems: "center", gap: 2 }}>
        <Typography variant="caption" color="text.secondary">
          暂无音频 — 请先合成片段并点击「拼接全部」
        </Typography>
      </Paper>
    );
  }

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        display: "flex",
        alignItems: "center",
        gap: 2,
        flexWrap: "wrap",
        bgcolor: "background.paper",
        borderTop: 1,
        borderColor: "divider",
      }}
    >
      {/* Hidden HTML5 audio element */}
      <audio ref={audioRef} src={fullSrc} preload="metadata" />

      {/* Play/Pause */}
      <Tooltip title={playing ? "暂停" : "播放"}>
        <IconButton
          onClick={togglePlay}
          color="primary"
          disabled={!canPlay}
          sx={{ bgcolor: "primary.light", color: "#fff", "&:hover": { bgcolor: "primary.main" } }}
        >
          {playing ? <PauseIcon /> : <PlayArrowIcon />}
        </IconButton>
      </Tooltip>

      {/* Time + Progress */}
      <Stack direction="column" sx={{ flex: 1, minWidth: 120 }} spacing={0.5}>
        <Slider
          size="small"
          min={0}
          max={duration || 1}
          value={currentTime}
          onChange={handleSeek}
          sx={{ width: "100%" }}
        />
        <Typography variant="caption" color="text.secondary" sx={{ fontFamily: "monospace" }}>
          {fmt(currentTime)} / {fmt(duration)}
        </Typography>
      </Stack>

      {/* Volume */}
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ width: 120 }}>
        <VolumeUpIcon fontSize="small" color="action" />
        <Slider
          size="small"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={handleVolume}
        />
      </Stack>

      {/* Download */}
      <Tooltip title="下载音频">
        <IconButton onClick={handleDownload} color="primary">
          <DownloadIcon />
        </IconButton>
      </Tooltip>

      {/* Filename */}
      {filename && (
        <Typography variant="caption" color="text.secondary" noWrap>
          {filename}
        </Typography>
      )}
    </Paper>
  );
}

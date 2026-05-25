"use client";

import * as React from "react";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Divider from "@mui/material/Divider";
import Box from "@mui/material/Box";
import ThemeWrapper from "@/components/ThemeWrapper";

import {
  PrimaryButton,
  OutlineButton,
  DangerButton,
  Card,
  Input,
  LabeledSelect,
  LabeledSlider,
  Toggle,
  StatusBadge,
  Modal,
  ConfirmModal,
  Toast,
} from "@/components/ui";

export default function ComponentsPage() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [toastOpen, setToastOpen] = React.useState(false);
  const [toggleVal, setToggleVal] = React.useState(false);
  const [sliderVal, setSliderVal] = React.useState(1.0);
  const [selectVal, setSelectVal] = React.useState("professional");

  return (
    <ThemeWrapper>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Typography variant="h3" fontWeight={700} gutterBottom>
          PodCraft Design System
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 6 }}>
          Component library preview — all reusable UI elements with design tokens
        </Typography>

        <Section title="Buttons">
          <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
            <PrimaryButton>开始创作</PrimaryButton>
            <OutlineButton>浏览播客</OutlineButton>
            <DangerButton>删除</DangerButton>
            <PrimaryButton disabled>加载中...</PrimaryButton>
            <PrimaryButton size="small">Small</PrimaryButton>
          </Box>
        </Section>

        <Section title="Cards">
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={4}>
              <Card title="高质量语音合成" subtitle="MiniMax Speech-2.8-turbo">
                <Typography variant="body2">基于 AI 引擎，支持情感风格与方言</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card title="AI智能文案" subtitle="自动生成播客脚本" actions={<PrimaryButton size="small">试用</PrimaryButton>}>
                <Typography variant="body2">输入主题即可生成专业播客脚本</Typography>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <Card title="简单易用" variant="elevation">
                <Typography variant="body2">5 分钟生成第一条播客</Typography>
              </Card>
            </Grid>
          </Grid>
        </Section>

        <Section title="Inputs">
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <Input label="播客标题" placeholder="输入播客标题..." />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LabeledSelect
                label="风格"
                value={selectVal}
                onChange={(e) => setSelectVal(e.target.value as string)}
                options={[
                  { value: "professional", label: "专业" },
                  { value: "casual", label: "轻松" },
                  { value: "storytelling", label: "故事" },
                  { value: "news", label: "新闻" },
                ]}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <LabeledSlider
                label="语速"
                value={sliderVal}
                min={0.5}
                max={2.0}
                step={0.1}
                unit="x"
                onChange={setSliderVal}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Toggle label="启用情感风格" checked={toggleVal} onChange={setToggleVal} />
            </Grid>
          </Grid>
        </Section>

        <Section title="Status Badges">
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <StatusBadge label="草稿" variant="default" />
            <StatusBadge label="已完成" variant="success" />
            <StatusBadge label="合成中" variant="info" />
            <StatusBadge label="等待中" variant="warning" />
            <StatusBadge label="失败" variant="danger" />
          </Box>
        </Section>

        <Section title="Modals & Toast">
          <Box sx={{ display: "flex", gap: 2 }}>
            <OutlineButton onClick={() => setModalOpen(true)}>打开 Modal</OutlineButton>
            <DangerButton onClick={() => setConfirmOpen(true)}>确认删除</DangerButton>
            <PrimaryButton onClick={() => setToastOpen(true)}>显示 Toast</PrimaryButton>
          </Box>
          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="设置音色参数">
            <Typography>语速、音调、音量等参数调整面板</Typography>
          </Modal>
          <ConfirmModal
            open={confirmOpen}
            onConfirm={() => setConfirmOpen(false)}
            onCancel={() => setConfirmOpen(false)}
            title="确认删除"
            message="删除后不可恢复，确定要删除这条播客吗？"
            danger
          />
          <Toast open={toastOpen} onClose={() => setToastOpen(false)} message="操作成功！" severity="success" />
        </Section>
      </Container>
    </ThemeWrapper>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 6 }}>
      <Typography variant="h5" fontWeight={600} gutterBottom>{title}</Typography>
      <Divider sx={{ mb: 3 }} />
      {children}
    </Box>
  );
}

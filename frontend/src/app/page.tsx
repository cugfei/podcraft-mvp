import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TranslateIcon from "@mui/icons-material/Translate";
import FavoriteIcon from "@mui/icons-material/Favorite";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

const FEATURES = [
  {
    icon: <AttachMoneyIcon fontSize="large" />,
    title: "价格优惠",
    desc: "比官方 API 便宜 50%，按量计费无月费，用多少付多少",
  },
  {
    icon: <AutoAwesomeIcon fontSize="large" />,
    title: "最新模型",
    desc: "MiniMax Speech-2.8-turbo 引擎，支持情感风格、方言与多音字",
  },
  {
    icon: <TranslateIcon fontSize="large" />,
    title: "多语言支持",
    desc: "中文、英语及粤语、四川话等方言，覆盖全球主流播客场景",
  },
  {
    icon: <FavoriteIcon fontSize="large" />,
    title: "简单易用",
    desc: "5 分钟生成第一条播客，片段级编辑与重合成，所见即所得",
  },
];

const PLANS = [
  {
    name: "免费试用",
    price: "¥0",
    unit: "/月",
    features: ["500 字符免费额度", "基础音色", "单人播客", "MP3 下载"],
    cta: "免费注册",
  },
  {
    name: "按量计费",
    price: "¥0.05",
    unit: "/千字符",
    features: ["比官方便宜 50%", "全部音色", "双人播客", "片段编辑与重合成", "情感风格", "WAV 导出"],
    cta: "立即充值",
    primary: true,
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <Box
        sx={{
          background: "linear-gradient(135deg, #0b0b0d 0%, #1a1a2e 50%, #16213e 100%)",
          color: "white",
          py: { xs: 8, md: 14 },
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center" }}>
          <Typography
            variant="h2"
            component="h1"
            fontWeight={800}
            sx={{ fontSize: { xs: "2.5rem", md: "3.75rem" } }}
            gutterBottom
          >
            AI驱动的播客创作平台
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{ mb: 4, opacity: 0.8, maxWidth: 600, mx: "auto" }}
          >
            输入主题，AI 自动生成专业播客脚本，选择音色一键合成——从灵感到成品，只需几分钟
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} justifyContent="center">
            <Button
              component={Link}
              href="/create"
              variant="contained"
              size="large"
              color="success"
              sx={{ px: 5, py: 1.5, fontSize: "1.1rem" }}
              endIcon={<ArrowForwardIcon />}
            >
              开始创作
            </Button>
            <Button
              component={Link}
              href="/podcasts"
              variant="outlined"
              size="large"
              sx={{ px: 5, py: 1.5, fontSize: "1.1rem", color: "white", borderColor: "white" }}
            >
              浏览示例
            </Button>
          </Stack>
        </Container>
      </Box>

      {/* Features */}
      <Container maxWidth="lg" sx={{ py: { xs: 6, md: 10 } }}>
        <Typography variant="h4" textAlign="center" fontWeight={700} gutterBottom>
          为什么选择 PodCraft
        </Typography>
        <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
          不只是 TTS —— 从文案到语音，一站式播客创作工作台
        </Typography>
        <Grid container spacing={3}>
          {FEATURES.map((f) => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <Card variant="outlined" sx={{ height: "100%", textAlign: "center", py: 3 }}>
                <CardContent>
                  <Box sx={{ color: "primary.main", mb: 2 }}>{f.icon}</Box>
                  <Typography variant="h6" fontWeight={600} gutterBottom>
                    {f.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {f.desc}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Pricing */}
      <Box sx={{ bgcolor: "grey.50", py: { xs: 6, md: 10 } }}>
        <Container maxWidth="md">
          <Typography variant="h4" textAlign="center" fontWeight={700} gutterBottom>
            灵活的定价方案
          </Typography>
          <Typography variant="body1" color="text.secondary" textAlign="center" sx={{ mb: 6 }}>
            从免费开始，按需升级
          </Typography>
          <Grid container spacing={3} justifyContent="center">
            {PLANS.map((plan) => (
              <Grid item xs={12} sm={6} key={plan.name}>
                <Card
                  variant={plan.primary ? "elevation" : "outlined"}
                  elevation={plan.primary ? 4 : 0}
                  sx={{ textAlign: "center", py: 4, borderColor: plan.primary ? "success.main" : undefined }}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} gutterBottom>
                      {plan.name}
                    </Typography>
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="h2" fontWeight={900} color="primary" component="span">
                        {plan.price}
                      </Typography>
                      <Typography variant="body1" color="text.secondary" component="span">
                        {plan.unit}
                      </Typography>
                    </Box>
                    <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mb: 3 }}>
                      {plan.features.map((f) => (
                        <Box component="li" key={f} sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1, justifyContent: "center" }}>
                          <CheckCircleOutlineIcon fontSize="small" color="success" />
                          <Typography variant="body2">{f}</Typography>
                        </Box>
                      ))}
                    </Box>
                    <Button
                      component={Link}
                      href="/register"
                      variant={plan.primary ? "contained" : "outlined"}
                      color={plan.primary ? "success" : "primary"}
                      size="large"
                      sx={{ px: 4 }}
                    >
                      {plan.cta}
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Chip from "@mui/material/Chip";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TranslateIcon from "@mui/icons-material/Translate";
import FavoriteIcon from "@mui/icons-material/Favorite";

const FEATURES = [
  {
    icon: <AttachMoneyIcon />,
    title: "价格优惠",
    desc: "比官方 API 便宜 50%，按量计费无月费，用多少付多少",
  },
  {
    icon: <AutoAwesomeIcon />,
    title: "最新模型",
    desc: "MiniMax Speech-2.8-turbo 引擎，支持情感风格、方言与多音字",
  },
  {
    icon: <TranslateIcon />,
    title: "多语言支持",
    desc: "中文、英语及粤语、四川话等方言，覆盖全球主流播客场景",
  },
  {
    icon: <FavoriteIcon />,
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
    featured: false,
  },
  {
    name: "按量计费",
    price: "¥0.05",
    unit: "/千字符",
    features: ["比官方便宜 50%", "全部音色", "双人播客", "片段编辑与重合成", "情感风格", "WAV 导出"],
    cta: "立即使用",
    featured: true,
  },
];

export default function HomePage() {
  return (
    <>
      {/* Hero — white background, gradient text, animations */}
      <Box
        sx={{
          position: "relative",
          overflow: "hidden",
          py: { xs: 10, md: 15 },
          "&::before": {
            content: '""',
            position: "absolute",
            top: "-50%",
            left: "-50%",
            width: "200%",
            height: "200%",
            background: "radial-gradient(circle 600px at 20% 20%, rgba(11,11,13,0.03), transparent), radial-gradient(circle 500px at 80% 30%, rgba(31,41,55,0.02), transparent)",
            pointerEvents: "none",
          },
        }}
      >
        <Container maxWidth="md" sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <Typography
            component="h1"
            sx={{
              fontSize: { xs: "36px", md: "56px" },
              fontWeight: 800,
              lineHeight: 1.1,
              mb: 3,
              letterSpacing: "-0.03em",
              background: "linear-gradient(135deg, var(--text) 0%, var(--brand-2) 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              animation: "textReveal 1s ease-out forwards",
            }}
          >
            AI驱动的播客创作平台
          </Typography>
          <Typography
            variant="h6"
            component="p"
            sx={{
              color: "var(--text-muted)",
              mb: 5,
              maxWidth: 600,
              mx: "auto",
              lineHeight: 1.6,
              fontSize: { xs: "16px", md: "20px" },
              animation: "slideUp 0.8s ease-out 0.2s forwards",
              opacity: 0,
            }}
          >
            输入主题，AI 自动生成专业播客脚本，选择音色一键合成<br />
            从灵感到成品，只需几分钟
          </Typography>
          <Box
            sx={{
              display: "flex",
              gap: 2,
              justifyContent: "center",
              animation: "slideUp 0.8s ease-out 0.4s forwards",
              opacity: 0,
              flexDirection: { xs: "column", sm: "row" },
              alignItems: "center",
            }}
          >
            <Box
              component={Link}
              href="/create"
              className="proto-btn proto-btn-primary"
              sx={{ fontSize: "15px", px: 5, py: 1.75, maxWidth: { xs: 300, sm: "none" }, width: { xs: "100%", sm: "auto" }, justifyContent: "center" }}
            >
              开始使用
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Box>
            <Box
              component={Link}
              href="#pricing"
              className="proto-btn proto-btn-outline"
              sx={{ fontSize: "15px", px: 5, py: 1.75, maxWidth: { xs: 300, sm: "none" }, width: { xs: "100%", sm: "auto" }, justifyContent: "center" }}
            >
              查看价格
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Features — icon boxes, staggered animation */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: { xs: 8, md: 10 } }}>
        <Grid container spacing={3}>
          {FEATURES.map((f, i) => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <Box
                className="proto-card"
                sx={{
                  animation: `scaleIn 0.6s ease-out ${0.1 * (i + 1)}s forwards`,
                  opacity: 0,
                  textAlign: "left",
                }}
              >
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: "12px",
                    bgcolor: "var(--bg-soft)",
                    display: "grid",
                    placeItems: "center",
                    mb: 2,
                    "& svg": { fontSize: 24, color: "var(--brand)" },
                  }}
                >
                  {f.icon}
                </Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: "18px" }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--text-muted)", lineHeight: 1.6, fontSize: "14px" }}>
                  {f.desc}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Pricing — featured card with scale */}
      <Box id="pricing" sx={{ bgcolor: "var(--bg-soft)", py: { xs: 8, md: 10 } }}>
        <Container maxWidth="md">
          <Box sx={{ textAlign: "center", mb: 5 }}>
            <Typography
              variant="h3"
              fontWeight={800}
              gutterBottom
              sx={{ fontSize: { xs: "28px", md: "36px" }, letterSpacing: "-0.02em" }}
            >
              简单透明的价格
            </Typography>
            <Typography variant="body1" sx={{ color: "var(--text-muted)" }}>
              按字符计费，无订阅费，无最低消费
            </Typography>
          </Box>
          <Grid container spacing={3} justifyContent="center">
            {PLANS.map((plan) => (
              <Grid item xs={12} sm={6} key={plan.name}>
                <Box
                  className={plan.featured ? "proto-pricing-featured" : ""}
                  sx={{
                    bgcolor: "var(--panel)",
                    border: "2px solid",
                    borderColor: plan.featured ? "var(--brand)" : "var(--line)",
                    borderRadius: "var(--radius)",
                    p: 4,
                    textAlign: "center",
                    transition: "all 0.3s",
                  }}
                >
                  <Typography variant="h5" fontWeight={800} gutterBottom>
                    {plan.name}
                  </Typography>
                  <Box sx={{ my: 2.5 }}>
                    <Typography
                      component="span"
                      sx={{ fontSize: "48px", fontWeight: 900, color: "var(--brand)", letterSpacing: "-0.02em" }}
                    >
                      {plan.price}
                    </Typography>
                    <Typography component="span" variant="body1" sx={{ color: "var(--text-muted)", fontWeight: 500, ml: 0.5 }}>
                      {plan.unit}
                    </Typography>
                  </Box>
                  <Box component="ul" sx={{ listStyle: "none", p: 0, m: 0, mb: 3, textAlign: "left" }}>
                    {plan.features.map((f) => (
                      <Box component="li" key={f} sx={{ display: "flex", alignItems: "center", gap: 1, py: 1, fontSize: "14px", color: "var(--text-muted)" }}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "var(--success)" }} />
                        {f}
                      </Box>
                    ))}
                  </Box>
                  <Box
                    component={Link}
                    href="/register"
                    className={plan.featured ? "proto-btn proto-btn-primary" : "proto-btn proto-btn-outline"}
                    sx={{ width: "100%", justifyContent: "center" }}
                  >
                    {plan.cta}
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}

import * as React from "react";
import Link from "next/link";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
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
      <Box className="hero-section">
        <Container maxWidth="md" sx={{ textAlign: "center", position: "relative", zIndex: 1 }}>
          <h1 className="hero-title-text">
            AI驱动的播客创作平台
          </h1>
          <p className="hero-subtitle-text">
            输入主题，AI 自动生成专业播客脚本，选择音色一键合成<br />
            从灵感到成品，只需几分钟
          </p>
          <div className="hero-actions-row">
            <Link href="/create" className="proto-btn proto-btn-primary hero-btn">
              开始使用
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </Link>
            <Link href="#pricing" className="proto-btn proto-btn-outline hero-btn">
              查看价格
            </Link>
          </div>
        </Container>
      </Box>

      {/* Features — icon boxes, staggered animation */}
      <Box sx={{ maxWidth: 1200, mx: "auto", px: 3, py: { xs: 8, md: 10 } }}>
        <Grid container spacing={3}>
          {FEATURES.map((f, i) => (
            <Grid item xs={12} sm={6} md={3} key={f.title}>
              <div className="proto-card feature-card-animated" style={{ animationDelay: `${0.1 * (i + 1)}s` }}>
                <div className="feature-icon-box">
                  {f.icon}
                </div>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom sx={{ fontSize: "18px" }}>
                  {f.title}
                </Typography>
                <Typography variant="body2" sx={{ color: "var(--text-muted)", lineHeight: 1.6, fontSize: "14px" }}>
                  {f.desc}
                </Typography>
              </div>
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
                <div className={plan.featured ? "pricing-card-featured" : "pricing-card-normal"}>
                  <Typography variant="h5" fontWeight={800} gutterBottom>
                    {plan.name}
                  </Typography>
                  <div className="pricing-price-block">
                    <span className="pricing-price-value">{plan.price}</span>
                    <span className="pricing-price-unit">{plan.unit}</span>
                  </div>
                  <ul className="pricing-features-list">
                    {plan.features.map((f) => (
                      <li key={f}>
                        <CheckCircleOutlineIcon sx={{ fontSize: 16, color: "var(--success)" }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href="/register"
                    className={plan.featured ? "proto-btn proto-btn-primary" : "proto-btn proto-btn-outline"}
                    style={{ width: "100%", justifyContent: "center" }}
                  >
                    {plan.cta}
                  </Link>
                </div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>
    </>
  );
}

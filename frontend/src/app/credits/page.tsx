"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import Chip from "@mui/material/Chip";
import { useAuth } from "@/context/AuthContext";
import {
  getCreditBalance,
  getCreditPlans,
  rechargeWithCard,
  getDailyGrantStatus,
  claimDailyGrant,
} from "@/lib/api";

interface CreditPlan {
  id: string;
  name: string;
  price: number;
  credits: number;
}

export default function CreditsPage() {
  const { credits, refreshCredits } = useAuth();
  const router = useRouter();

  const [balance, setBalance] = React.useState<number | null>(null);
  const [plans, setPlans] = React.useState<CreditPlan[]>([]);
  const [cardKey, setCardKey] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [successMsg, setSuccessMsg] = React.useState<string | null>(null);
  const [dailyStatus, setDailyStatus] = React.useState<{
    granted: boolean;
    message: string;
  } | null>(null);

  // Fetch data on mount
  React.useEffect(() => {
    fetchBalance();
    fetchPlans();
    fetchDailyStatus();
  }, []);

  const fetchBalance = async () => {
    try {
      const data = await getCreditBalance();
      setBalance(data.available);
      if (refreshCredits) {
        await refreshCredits();
      }
    } catch (err: any) {
      console.error("Failed to fetch balance:", err);
    }
  };

  const fetchPlans = async () => {
    try {
      const data = await getCreditPlans();
      setPlans(data);
    } catch (err: any) {
      console.error("Failed to fetch plans:", err);
    }
  };

  const fetchDailyStatus = async () => {
    try {
      const data = await getDailyGrantStatus();
      setDailyStatus(data);
    } catch (err: any) {
      console.error("Failed to fetch daily status:", err);
    }
  };

  const handleDailyGrant = async () => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await claimDailyGrant();
      setSuccessMsg(`每日登录赠送 ${data.granted} 积分成功！`);
      setBalance(data.balance);
      setDailyStatus({ granted: true, message: "今日已领取" });
      if (refreshCredits) {
        await refreshCredits();
      }
    } catch (err: any) {
      setError(err.message || "领取失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCardRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardKey.trim()) {
      setError("请输入卡密");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const data = await rechargeWithCard(cardKey.trim());
      setSuccessMsg(data.message);
      setBalance(data.balance);
      setCardKey("");
      if (refreshCredits) {
        await refreshCredits();
      }
    } catch (err: any) {
      setError(err.message || "充值失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", px: 3, py: 6 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ fontWeight: 700, mb: 1, letterSpacing: "-0.02em" }}
        >
          积分管理
        </Typography>
        <Typography variant="body1" sx={{ color: "var(--text-muted)" }}>
          查看余额、领取每日赠送、充值积分
        </Typography>
      </Box>

      {/* Success/Error alerts */}
      {successMsg && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMsg(null)}>
          {successMsg}
        </Alert>
      )}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Balance Card */}
      <Card sx={{ mb: 4, borderRadius: "12px", bgcolor: "var(--success-light)" }}>
        <CardContent sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h3" sx={{ fontWeight: 800, color: "var(--success)", mb: 1 }}>
            {balance !== null ? balance.toLocaleString() : "..."}
          </Typography>
          <Typography variant="subtitle1" sx={{ color: "var(--success)" }}>
            当前可用积分
          </Typography>
        </CardContent>
      </Card>

      {/* Daily Grant */}
      {dailyStatus && !dailyStatus.granted && (
        <Card sx={{ mb: 4, borderRadius: "12px" }}>
          <CardContent>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              每日登录赠送
            </Typography>
            <Typography variant="body2" sx={{ color: "var(--text-muted)", mb: 2 }}>
              每天登录可领取 50 积分
            </Typography>
          </CardContent>
          <CardActions sx={{ px: 2, pb: 2 }}>
            <Button
              variant="contained"
              color="success"
              onClick={handleDailyGrant}
              disabled={loading}
              startIcon={loading ? <CircularProgress size={16} /> : null}
              sx={{ borderRadius: "8px", textTransform: "none" }}
            >
              {loading ? "领取中..." : "领取 50 积分"}
            </Button>
          </CardActions>
        </Card>
      )}

      {/* Card Key Recharge */}
      <Card sx={{ mb: 4, borderRadius: "12px" }}>
        <CardContent>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
            卡密充值
          </Typography>
          <Typography variant="body2" sx={{ color: "var(--text-muted)", mb: 2 }}>
            输入充值卡密，立即到账
          </Typography>
          <Box component="form" onSubmit={handleCardRecharge}>
            <TextField
              label="卡密"
              placeholder="请输入卡密（如 PODCRFT-XXXX-XXXX-XXXX）"
              value={cardKey}
              onChange={(e) => setCardKey(e.target.value)}
              fullWidth
              size="small"
              sx={{ mb: 2 }}
            />
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={loading || !cardKey.trim()}
              startIcon={loading ? <CircularProgress size={16} /> : null}
              sx={{ borderRadius: "8px", textTransform: "none" }}
            >
              {loading ? "充值中..." : "确认充值"}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Plans */}
      {plans.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
            积分套餐
          </Typography>
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
            {plans.map((plan) => (
              <Card key={plan.id} sx={{ borderRadius: "12px", height: "100%" }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
                    {plan.name}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: "var(--brand)", mb: 1 }}>
                    ¥{plan.price}
                  </Typography>
                  <Chip label={`${plan.credits} 积分`} size="small" color="primary" />
                </CardContent>
                <CardActions>
                  <Button
                    variant="outlined"
                    fullWidth
                    sx={{ borderRadius: "8px", textTransform: "none" }}
                    onClick={() => {
                      // TODO: implement payment flow
                      alert("支付功能开发中...");
                    }}
                  >
                    购买
                  </Button>
                </CardActions>
              </Card>
            ))}
          </Box>
        </Box>
      )}

      {/* Back to home */}
      <Box sx={{ textAlign: "center", mt: 4 }}>
        <Button
          component={Link}
          href="/"
          variant="text"
          sx={{ color: "var(--text-muted)", textTransform: "none" }}
        >
          ← 返回首页
        </Button>
      </Box>
    </Box>
  );
}

"use client";

import * as React from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import { useAuth } from "@/context/AuthContext";

interface CreditEstimateProps {
  /** Total character count for synthesis */
  charCount: number;
  /** Optional: show as inline element (default: false) */
  inline?: boolean;
}

/**
 * Calculate estimated credits for TTS synthesis.
 * Rule: 1 credit per 5 characters.
 */
export function estimateCredits(charCount: number): number {
  if (charCount <= 0) return 0;
  return Math.ceil(charCount / 5);
}

/**
 * CreditEstimate component — shows estimated credit cost before synthesis.
 *
 * Usage:
 *   <CreditEstimate charCount={totalChars} />
 */
export default function CreditEstimate({
  charCount,
  inline = false,
}: CreditEstimateProps) {
  const { credits } = useAuth();
  const estimated = estimateCredits(charCount);
  const balance = credits?.available || 0;
  const sufficient = balance >= estimated;

  const content = (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1,
        px: 2,
        py: 1,
        borderRadius: "8px",
        bgcolor: sufficient ? "var(--success-light)" : "#fef2f2",
        border: "1px solid",
        borderColor: sufficient ? "var(--success)" : "#fca5a5",
      }}
    >
      <Typography variant="body2" sx={{ fontWeight: 500 }}>
        预计消耗：
      </Typography>
      <Chip
        label={`${estimated} 积分`}
        size="small"
        color={sufficient ? "success" : "error"}
        sx={{ fontWeight: 600 }}
      />
      {!sufficient && (
        <Typography variant="caption" sx={{ color: "#dc2626", ml: 1 }}>
          积分不足，请充值
        </Typography>
      )}
    </Box>
  );

  if (inline) {
    return content;
  }

  return (
    <Box sx={{ my: 2 }}>
      {content}
      {!sufficient && (
        <Box sx={{ mt: 1, textAlign: "right" }}>
          <Typography
            variant="caption"
            component="a"
            href="/credits"
            sx={{ color: "var(--brand)", cursor: "pointer" }}
          >
            去充值 →
          </Typography>
        </Box>
      )}
    </Box>
  );
}

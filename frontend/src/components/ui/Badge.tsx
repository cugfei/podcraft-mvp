"use client";

import * as React from "react";
import MuiBadge from "@mui/material/Badge";
import Chip from "@mui/material/Chip";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "info";

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
}

const BADGE_COLORS: Record<BadgeVariant, "default" | "success" | "warning" | "error" | "info"> = {
  default: "default",
  success: "success",
  warning: "warning",
  danger: "error",
  info: "info",
};

/** Status badge chip — used for task states, roles, etc. */
export function StatusBadge({ label, variant = "default" }: StatusBadgeProps) {
  return <Chip label={label} color={BADGE_COLORS[variant]} size="small" variant="outlined" />;
}

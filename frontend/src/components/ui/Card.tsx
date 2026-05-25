"use client";

import * as React from "react";
import MuiCard from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import Typography from "@mui/material/Typography";
import { SxProps, Theme } from "@mui/material/styles";

interface CardProps {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
  actions?: React.ReactNode;
  sx?: SxProps<Theme>;
  variant?: "outlined" | "elevation";
}

/** Content card with optional title, subtitle, and action area. */
export function Card({ title, subtitle, children, actions, sx, variant = "outlined" }: CardProps) {
  return (
    <MuiCard variant={variant} sx={{ height: "100%", ...sx }}>
      <CardContent>
        {title && (
          <Typography variant="h6" fontWeight={600} gutterBottom>
            {title}
          </Typography>
        )}
        {subtitle && (
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {subtitle}
          </Typography>
        )}
        {children}
      </CardContent>
      {actions && <CardActions sx={{ px: 2, pb: 2 }}>{actions}</CardActions>}
    </MuiCard>
  );
}

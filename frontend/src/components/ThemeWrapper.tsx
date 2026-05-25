"use client";

import * as React from "react";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { podcraftTheme } from "@/lib/theme";

export default function ThemeWrapper({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider theme={podcraftTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}

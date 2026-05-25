"use client";

import { createTheme } from "@mui/material/styles";

/**
 * PodCraft design token theme — mirrors the prototype CSS variables.
 * Use with `<ThemeProvider theme={podcraftTheme}>`.
 */
export const podcraftTheme = createTheme({
  palette: {
    primary: {
      main: "#0b0b0d",
      contrastText: "#ffffff",
    },
    success: {
      main: "#10b981",
      light: "#d1fae5",
    },
    warning: { main: "#f59e0b" },
    error: { main: "#ef4444" },
    background: {
      default: "#ffffff",
      paper: "#ffffff",
    },
    text: {
      primary: "#0b0b0d",
      secondary: "#6b7280",
      disabled: "#9ca3af",
    },
    divider: "#e5e7eb",
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    "none",
    "0 2px 8px rgba(0,0,0,.06)",
    "0 6px 16px rgba(0,0,0,.08)",
    "0 12px 32px rgba(0,0,0,.12)",
    ...Array(21).fill("0 12px 32px rgba(0,0,0,.12)"),
  ] as unknown as any,
  typography: {
    fontFamily: [
      "Inter",
      "-apple-system",
      "BlinkMacSystemFont",
      "SF Pro Display",
      "Segoe UI",
      "Roboto",
      "sans-serif",
    ].join(","),
    h1: { fontWeight: 800 },
    h2: { fontWeight: 700 },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    button: { textTransform: "none", fontWeight: 600 },
  },
  components: {
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "8px 20px",
        },
        containedPrimary: {
          "&:hover": { backgroundColor: "#1f2937" },
        },
        containedSuccess: {
          "&:hover": { backgroundColor: "#059669" },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: "1px solid #e5e7eb",
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: "small",
        variant: "outlined",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": { borderRadius: 8 },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { borderRadius: 8 },
      },
    },
  },
});

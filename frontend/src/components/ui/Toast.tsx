"use client";

import * as React from "react";
import Snackbar from "@mui/material/Snackbar";
import Alert from "@mui/material/Alert";

type ToastSeverity = "success" | "error" | "warning" | "info";

interface ToastProps {
  open: boolean;
  onClose: () => void;
  message: string;
  severity?: ToastSeverity;
  duration?: number;
}

/** Toast notification — auto-hides after *duration* ms. */
export function Toast({ open, onClose, message, severity = "info", duration = 4000 }: ToastProps) {
  return (
    <Snackbar
      open={open}
      autoHideDuration={duration}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
    >
      <Alert onClose={onClose} severity={severity} variant="filled" sx={{ width: "100%" }}>
        {message}
      </Alert>
    </Snackbar>
  );
}

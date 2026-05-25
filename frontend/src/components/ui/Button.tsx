"use client";

import * as React from "react";
import Button, { ButtonProps } from "@mui/material/Button";

/** Primary action button — contained with success colour. */
export function PrimaryButton(props: ButtonProps) {
  return <Button variant="contained" color="success" {...props} />;
}

/** Secondary / outline button. */
export function OutlineButton(props: ButtonProps) {
  return <Button variant="outlined" {...props} />;
}

/** Danger / destructive action button. */
export function DangerButton(props: ButtonProps) {
  return <Button variant="contained" color="error" {...props} />;
}

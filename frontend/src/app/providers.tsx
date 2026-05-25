"use client";

import * as React from "react";
import { AuthProvider } from "@/context/AuthContext";
import ThemeWrapper from "@/components/ThemeWrapper";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <ThemeWrapper>{children}</ThemeWrapper>
    </AuthProvider>
  );
}

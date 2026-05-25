import type { Metadata } from "next";
import "./../styles/globals.css";

export const metadata: Metadata = {
  title: "PodCraft - AI播客创作平台",
  description: "AI驱动的播客创作与管理平台",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}

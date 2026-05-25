import type { Metadata } from "next";
import TopBar from "@/components/TopBar";
import Footer from "@/components/Footer";
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
      <body className="flex min-h-screen flex-col bg-white text-gray-900 antialiased">
        <TopBar />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}

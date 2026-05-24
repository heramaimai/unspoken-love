import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "未竟之言",
  description: "为逝去的人、离开的人、失联的人，生成一份语言与关系的回声档案。赛博陪伴，不是复活。",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "未竟之言",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
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

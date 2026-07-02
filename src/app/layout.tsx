import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SlideCanvas MVP",
  description: "Novel + Slidev 技术验证",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}

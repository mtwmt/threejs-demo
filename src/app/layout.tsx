import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "機械手臂監控系統 | Digital Twin Demo",
  description: "使用 Next.js 與 Three.js 建構的工業機械手臂數位孿生監控範例",
  keywords: ["Three.js", "Next.js", "Digital Twin", "機械手臂", "Robot Arm", "3D視覺化"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-TW">
      <body className={inter.variable}>
        {children}
      </body>
    </html>
  );
}

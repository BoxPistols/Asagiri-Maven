import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAVEN | Smart System",
  description: "インテリジェント・コックピット型業務執行システム — 地図可視化・AI検知・意思決定ワークフローを統合",
  applicationName: "MAVEN Smart System",
  authors: [{ name: "Asagiri" }],
  keywords: ["dashboard", "operations", "AI", "map", "logistics", "supply chain"],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "32x32" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180" },
    ],
  },
  manifest: "/manifest.json",
  openGraph: {
    title: "MAVEN Smart System",
    description: "インテリジェント・コックピット型業務執行システム",
    siteName: "MAVEN",
    type: "website",
    locale: "ja_JP",
  },
  appleWebApp: {
    capable: true,
    title: "MAVEN",
    statusBarStyle: "black-translucent",
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#070b15" },
    { media: "(prefers-color-scheme: light)", color: "#f8fafc" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="h-full antialiased">
      <body className="h-full tactical-grid">{children}</body>
    </html>
  );
}

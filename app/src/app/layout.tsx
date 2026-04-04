import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MAVEN | Smart System",
  description: "Intelligent Cockpit for Business Operations",
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

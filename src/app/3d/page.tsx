"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { ArrowLeft, Box } from "lucide-react";

// Client-only dynamic import (Cesium requires browser)
const CesiumMap3D = dynamic(() => import("@/components/CesiumMap3D"), {
  ssr: false,
  loading: () => (
    <div className="h-full flex items-center justify-center bg-bg-deep">
      <div className="readout text-accent-cyan animate-pulse-dot">3Dエンジン読み込み中...</div>
    </div>
  ),
});

export default function Page3D() {
  return (
    <div className="h-screen flex flex-col bg-bg-deep">
      {/* Slim header */}
      <header className="h-11 border-b border-border-subtle bg-bg-primary/90 backdrop-blur-sm flex items-center justify-between px-4 shrink-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent-cyan transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            2Dゲームへ戻る
          </Link>
          <div className="h-4 w-px bg-border-subtle" />
          <div className="flex items-center gap-2">
            <Box className="w-4 h-4 text-accent-cyan" />
            <span className="readout text-sm text-accent-cyan font-bold tracking-wider">MAVEN 3D</span>
            <span className="readout text-xs text-text-dim">PLATEAU preview</span>
          </div>
        </div>
        <div className="readout text-xs text-text-dim">Cesium + 国交省PLATEAU</div>
      </header>

      {/* 3D map */}
      <div className="flex-1 min-h-0">
        <CesiumMap3D />
      </div>
    </div>
  );
}

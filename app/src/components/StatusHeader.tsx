"use client";

import { useEffect, useState } from "react";
import { Shield, Wifi, Database, Cpu, Clock } from "lucide-react";

export default function StatusHeader() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) +
        ":" +
        String(now.getMilliseconds()).padStart(3, "0").slice(0, 2)
      );
    };
    tick();
    const id = setInterval(tick, 100);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-10 border-b border-border-subtle bg-bg-deep/80 backdrop-blur-sm flex items-center justify-between px-4 shrink-0">
      <div className="flex items-center gap-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="relative w-5 h-5">
            <div className="absolute inset-0 border border-accent-cyan/60 rotate-45 scale-75" />
            <div className="absolute inset-0 border border-accent-cyan/30 rotate-[22deg] scale-90" />
            <div className="absolute inset-[5px] bg-accent-cyan/40 rounded-full animate-pulse-dot" />
          </div>
          <span className="readout text-sm text-accent-cyan font-bold tracking-[0.2em]">MAVEN</span>
          <span className="readout text-[10px] text-text-dim tracking-wider">SMART SYSTEM v2.4</span>
        </div>
        <div className="h-4 w-px bg-border-subtle" />
        <div className="flex items-center gap-1.5 text-[10px] readout text-alert-success">
          <div className="w-1.5 h-1.5 rounded-full bg-alert-success animate-pulse-dot" />
          OPERATIONAL
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* System status indicators */}
        <div className="flex items-center gap-3 text-[10px] readout text-text-dim">
          <span className="flex items-center gap-1"><Wifi className="w-3 h-3 text-alert-success" /> 接続</span>
          <span className="flex items-center gap-1"><Database className="w-3 h-3 text-alert-success" /> DB同期</span>
          <span className="flex items-center gap-1"><Cpu className="w-3 h-3 text-accent-cyan" /> AI稼働</span>
          <span className="flex items-center gap-1"><Shield className="w-3 h-3 text-alert-success" /> セキュア</span>
        </div>
        <div className="h-4 w-px bg-border-subtle" />
        {/* Clock */}
        <div className="flex items-center gap-1.5 readout text-sm text-accent-cyan tabular-nums">
          <Clock className="w-3.5 h-3.5 text-accent-cyan-dim" />
          {time}
        </div>
      </div>
    </header>
  );
}

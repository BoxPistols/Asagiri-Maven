"use client";

import { useEffect, useState } from "react";
import { Wifi, Cpu, Clock } from "lucide-react";

export default function StatusHeader() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const tick = () => {
      setTime(new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="h-12 border-b border-border-subtle bg-bg-primary/90 backdrop-blur-sm flex items-center justify-between px-5 shrink-0">
      <div className="flex items-center gap-4">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="relative w-7 h-7 flex items-center justify-center">
            <div className="absolute inset-0 border-2 border-accent-cyan/40 rotate-45 scale-[0.65] rounded-sm" />
            <div className="w-2.5 h-2.5 bg-accent-cyan rounded-full animate-pulse-dot" />
          </div>
          <div>
            <span className="readout text-base text-accent-cyan font-bold tracking-[0.25em]">MAVEN</span>
            <span className="text-xs text-text-dim ml-2 tracking-wide">Smart System</span>
          </div>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        <div className="flex items-center gap-2 text-xs readout text-alert-success">
          <div className="w-2 h-2 rounded-full bg-alert-success animate-pulse-dot" />
          全システム稼働中
        </div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-4 text-xs readout text-text-secondary">
          <span className="flex items-center gap-1.5"><Wifi className="w-3.5 h-3.5 text-alert-success" /></span>
          <span className="flex items-center gap-1.5"><Cpu className="w-3.5 h-3.5 text-accent-cyan" /> AI稼働</span>
        </div>
        <div className="h-5 w-px bg-border-subtle" />
        <div className="flex items-center gap-2 readout text-base text-text-primary tabular-nums">
          <Clock className="w-4 h-4 text-text-dim" />
          {time}
        </div>
      </div>
    </header>
  );
}

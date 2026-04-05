"use client";

import { useEffect, useCallback } from "react";
import { Crosshair, X } from "lucide-react";
import type { GameUnit } from "@/lib/game-types";

export interface TargetingOverlayProps {
  active: boolean;
  sourceUnit: GameUnit | null;
  onSelectTarget: (targetId: string) => void;
  onCancel: () => void;
}

export default function TargetingOverlay({
  active,
  sourceUnit,
  onSelectTarget,
  onCancel,
}: TargetingOverlayProps) {
  // ESC key handler
  const handleKey = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    },
    [onCancel],
  );

  useEffect(() => {
    if (!active) return;
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, handleKey]);

  if (!active || !sourceUnit) return null;

  return (
    <div className="absolute inset-0 z-[1050] pointer-events-none">
      {/* Top banner */}
      <div className="pointer-events-auto absolute top-3 left-1/2 -translate-x-1/2 z-[1060] flex items-center gap-2 px-4 py-2 rounded-md bg-bg-surface/95 backdrop-blur-sm animate-slide-up"
        style={{
          border: "1px solid var(--accent-indigo)",
          boxShadow: "0 0 16px rgba(129,140,248,0.2), 0 0 40px rgba(129,140,248,0.06)",
          animation: "slide-in-up 0.25s ease-out, targeting-border-pulse 2s ease-in-out infinite",
        }}
      >
        <Crosshair className="w-4 h-4 text-accent-indigo" />
        <span className="readout text-xs text-accent-indigo uppercase tracking-wider">
          目標を選択してください
        </span>
        <button
          className="ml-2 p-1 rounded hover:bg-bg-elevated transition-colors"
          onClick={onCancel}
          aria-label="キャンセル"
        >
          <X className="w-3.5 h-3.5 text-text-dim hover:text-text-primary" />
        </button>
      </div>

      {/* Bottom cancel button */}
      <div className="pointer-events-auto absolute bottom-16 left-1/2 -translate-x-1/2 z-[1060]">
        <button
          className="btn-tactical !border-alert-critical/40 !text-alert-critical hover:!bg-alert-critical/10"
          onClick={onCancel}
        >
          <X className="w-3.5 h-3.5" />
          キャンセル (ESC)
        </button>
      </div>

      {/* CSS for the pulsing border animation */}
      <style>{`
        @keyframes targeting-border-pulse {
          0%, 100% { border-color: var(--accent-indigo); box-shadow: 0 0 16px rgba(129,140,248,0.2), 0 0 40px rgba(129,140,248,0.06); }
          50% { border-color: rgba(129,140,248,0.5); box-shadow: 0 0 24px rgba(129,140,248,0.35), 0 0 60px rgba(129,140,248,0.1); }
        }
        @keyframes targeting-enemy-glow {
          0%, 100% { box-shadow: 0 0 8px rgba(248,113,113,0.3); }
          50% { box-shadow: 0 0 20px rgba(248,113,113,0.6), 0 0 40px rgba(248,113,113,0.2); }
        }
      `}</style>
    </div>
  );
}

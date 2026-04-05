"use client";

import { useState } from "react";
import { Settings, X, Check } from "lucide-react";
import type { TooltipMode } from "@/hooks/useTooltipSettings";

interface SettingsPanelProps {
  tooltipMode: TooltipMode;
  onTooltipModeChange: (m: TooltipMode) => void;
  audioMuted: boolean;
  onToggleAudio: () => void;
}

export default function SettingsPanel({
  tooltipMode,
  onTooltipModeChange,
  audioMuted,
  onToggleAudio,
}: SettingsPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="p-1.5 rounded border border-border-subtle hover:border-border-active transition-colors text-text-secondary hover:text-accent-cyan"
        aria-label="設定"
        title="設定"
      >
        <Settings className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[9500] bg-bg-deep/70 backdrop-blur-sm flex items-center justify-center p-4" onClick={() => setOpen(false)}>
          <div
            className="bg-bg-surface border border-border-active rounded-lg w-full max-w-sm shadow-2xl animate-slide-up"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent-cyan" />
                <span className="readout text-sm text-accent-cyan uppercase tracking-wider font-bold">
                  設定
                </span>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1 rounded hover:bg-bg-elevated text-text-dim hover:text-text-primary transition-colors"
                aria-label="閉じる"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Tooltip mode */}
              <div>
                <div className="text-xs text-text-primary font-medium mb-2">
                  マーカーの吹き出し
                </div>
                <div className="space-y-1.5">
                  <button
                    onClick={() => onTooltipModeChange("auto")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-colors text-left ${
                      tooltipMode === "auto"
                        ? "bg-accent-cyan/10 border-accent-cyan/40"
                        : "bg-bg-elevated/30 border-border-subtle hover:border-accent-cyan/30"
                    }`}
                  >
                    <div>
                      <div className="text-xs text-text-primary font-medium">自動で閉じる</div>
                      <div className="text-xs text-text-dim mt-0.5">2.5秒後に消える</div>
                    </div>
                    {tooltipMode === "auto" && <Check className="w-4 h-4 text-accent-cyan" />}
                  </button>
                  <button
                    onClick={() => onTooltipModeChange("manual")}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded border transition-colors text-left ${
                      tooltipMode === "manual"
                        ? "bg-accent-cyan/10 border-accent-cyan/40"
                        : "bg-bg-elevated/30 border-border-subtle hover:border-accent-cyan/30"
                    }`}
                  >
                    <div>
                      <div className="text-xs text-text-primary font-medium">手動で閉じる</div>
                      <div className="text-xs text-text-dim mt-0.5">xボタンまたは地図クリック</div>
                    </div>
                    {tooltipMode === "manual" && <Check className="w-4 h-4 text-accent-cyan" />}
                  </button>
                </div>
              </div>

              {/* Audio */}
              <div>
                <div className="text-xs text-text-primary font-medium mb-2">サウンド</div>
                <button
                  onClick={onToggleAudio}
                  className="w-full flex items-center justify-between px-3 py-2 rounded border border-border-subtle bg-bg-elevated/30 hover:border-accent-cyan/30 transition-colors"
                >
                  <div className="text-xs text-text-primary font-medium">
                    {audioMuted ? "ミュート中" : "再生中"}
                  </div>
                  <div className={`readout text-xs px-2 py-0.5 rounded ${audioMuted ? "bg-text-dim/20 text-text-dim" : "bg-alert-success/20 text-alert-success"}`}>
                    {audioMuted ? "OFF" : "ON"}
                  </div>
                </button>
              </div>

              {/* Tutorial reset */}
              <div>
                <div className="text-xs text-text-primary font-medium mb-2">チュートリアル</div>
                <button
                  onClick={() => {
                    localStorage.removeItem("maven-tutorial-done");
                    alert("次回ゲーム開始時にチュートリアルが表示されます。");
                  }}
                  className="w-full px-3 py-2 rounded border border-border-subtle bg-bg-elevated/30 hover:border-accent-cyan/30 transition-colors text-xs text-text-secondary hover:text-accent-cyan"
                >
                  チュートリアルをリセット
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

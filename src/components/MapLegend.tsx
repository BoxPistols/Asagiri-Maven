"use client";

import { useState } from "react";
import { Info, ChevronDown, ChevronUp } from "lucide-react";

interface LegendItem {
  color: string;
  pattern?: "dashed" | "dotted" | "solid" | "fill";
  label: string;
  desc: string;
}

const ITEMS: LegendItem[] = [
  { color: "#3b82f6", pattern: "solid", label: "味方ユニット", desc: "青シールド: 移動・攻撃可能" },
  { color: "#22d3ee", pattern: "solid", label: "拠点 (HQ)", desc: "補給生産+修理範囲の中心" },
  { color: "#ef4444", pattern: "solid", label: "敵ユニット", desc: "赤三角: 毎ターン移動・攻撃" },
  { color: "#34d399", pattern: "dashed", label: "修理可能範囲", desc: "拠点から0.5度以内で修理可" },
  { color: "#22d3ee", pattern: "dotted", label: "補給ライン", desc: "拠点間の補給連絡線" },
  { color: "#ef4444", pattern: "dotted", label: "危険ゾーン", desc: "敵が次ターン到達可能な範囲" },
];

export default function MapLegend() {
  const [open, setOpen] = useState(false);

  return (
    <div className="absolute bottom-20 left-3 z-[950] bg-bg-surface/95 backdrop-blur-md border border-border-subtle rounded-lg overflow-hidden shadow-xl pointer-events-auto">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 hover:bg-bg-elevated/40 transition-colors gap-2"
      >
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-accent-cyan" />
          <span className="readout text-xs text-accent-cyan uppercase tracking-wider font-bold">
            凡例
          </span>
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-text-dim" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim" />}
      </button>

      {open && (
        <div className="px-3 pb-3 pt-1 border-t border-border-subtle max-w-xs space-y-2 animate-slide-up">
          {ITEMS.map(item => (
            <div key={item.label} className="flex items-start gap-2.5">
              {/* Swatch */}
              <div className="shrink-0 mt-0.5 w-4 h-4 flex items-center justify-center">
                {item.pattern === "dashed" || item.pattern === "dotted" ? (
                  <svg width="16" height="16" viewBox="0 0 16 16">
                    <circle
                      cx="8" cy="8" r="6"
                      fill="none"
                      stroke={item.color}
                      strokeWidth="1.5"
                      strokeDasharray={item.pattern === "dashed" ? "3 2" : "1 2"}
                    />
                  </svg>
                ) : (
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: item.color }}
                  />
                )}
              </div>
              {/* Text */}
              <div className="flex-1 min-w-0">
                <div className="text-xs text-text-primary font-medium">{item.label}</div>
                <div className="text-xs text-text-dim leading-tight">{item.desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

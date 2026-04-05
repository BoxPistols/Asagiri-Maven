"use client";

import { useEffect, useState } from "react";
import { Swords, Skull, Shield, Zap } from "lucide-react";
import type { GameLogEntry } from "@/lib/game-types";

interface CombatToastProps {
  log: GameLogEntry[];
  currentTurn: number;
}

interface ToastItem {
  id: string;
  message: string;
  type: "hit" | "destroy" | "crit" | "advantage" | "disadvantage";
  timestamp: number;
}

function parseToastFromLog(entry: GameLogEntry): ToastItem | null {
  if (entry.role !== "combat") return null;

  const content = entry.content;
  let type: ToastItem["type"] = "hit";

  if (content.includes("撃破")) type = "destroy";
  else if (content.includes("クリティカル")) type = "crit";
  else if (content.includes("有利")) type = "advantage";
  else if (content.includes("不利")) type = "disadvantage";

  // Skip the detail "└" entries — we already show the main line
  if (content.trim().startsWith("└")) return null;

  return {
    id: entry.id,
    message: content.trim(),
    type,
    timestamp: Date.now(),
  };
}

function ToastIcon({ type }: { type: ToastItem["type"] }) {
  switch (type) {
    case "destroy": return <Skull className="w-5 h-5" />;
    case "crit": return <Zap className="w-5 h-5" />;
    case "advantage": return <Swords className="w-5 h-5" />;
    case "disadvantage": return <Shield className="w-5 h-5" />;
    default: return <Swords className="w-5 h-5" />;
  }
}

function toastColors(type: ToastItem["type"]) {
  switch (type) {
    case "destroy": return { bg: "bg-alert-critical/95", text: "text-white", border: "border-alert-critical" };
    case "crit": return { bg: "bg-alert-warning/95", text: "text-white", border: "border-alert-warning" };
    case "advantage": return { bg: "bg-alert-success/95", text: "text-white", border: "border-alert-success" };
    case "disadvantage": return { bg: "bg-accent-purple/95", text: "text-white", border: "border-accent-purple" };
    default: return { bg: "bg-bg-surface/95", text: "text-text-primary", border: "border-border-active" };
  }
}

export default function CombatToast({ log, currentTurn }: CombatToastProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [seenIds, setSeenIds] = useState<Set<string>>(new Set());

  // Watch log for new combat entries from current turn
  useEffect(() => {
    const newToasts: ToastItem[] = [];
    for (const entry of log) {
      if (entry.turn !== currentTurn) continue;
      if (seenIds.has(entry.id)) continue;
      const toast = parseToastFromLog(entry);
      if (toast) {
        newToasts.push(toast);
      }
    }
    if (newToasts.length > 0) {
      setToasts(prev => [...prev, ...newToasts]);
      setSeenIds(prev => {
        const next = new Set(prev);
        newToasts.forEach(t => next.add(t.id));
        return next;
      });
    }
  }, [log, currentTurn, seenIds]);

  // Auto-remove toasts after 4 seconds
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      const now = Date.now();
      setToasts(prev => prev.filter(t => now - t.timestamp < 4000));
    }, 500);
    return () => clearTimeout(timer);
  }, [toasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-[1500] flex flex-col gap-2 pointer-events-none max-w-sm">
      {toasts.slice(-4).map((toast, i) => {
        const c = toastColors(toast.type);
        return (
          <div
            key={toast.id}
            className={`${c.bg} ${c.border} ${c.text} border-2 rounded-lg px-4 py-3 shadow-2xl animate-slide-up backdrop-blur-sm flex items-start gap-3`}
            style={{
              animationDelay: `${i * 50}ms`,
              opacity: 1 - (Date.now() - toast.timestamp) / 4000,
            }}
          >
            <div className="shrink-0 mt-0.5"><ToastIcon type={toast.type} /></div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase opacity-80 mb-1">
                {toast.type === "destroy" && "撃破！"}
                {toast.type === "crit" && "クリティカル！"}
                {toast.type === "advantage" && "有利な戦闘"}
                {toast.type === "disadvantage" && "不利な戦闘"}
                {toast.type === "hit" && "戦闘結果"}
              </div>
              <div className="text-sm leading-snug">{toast.message}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

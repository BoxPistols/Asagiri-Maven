"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { AlertTriangle, AlertCircle, Info, Eye, CheckCircle, Clock, Zap, MapPin, Radio, Bot, Terminal, X } from "lucide-react";
import type { AlertItem, WorkflowCard, ChatMessage, SeverityLevel } from "@/lib/mock-data";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface IntelDrawerProps {
  alerts: AlertItem[];
  missions: WorkflowCard[];
  messages: ChatMessage[];
  onSelectAlert?: (id: string) => void;
}

// ---------------------------------------------------------------------------
// Tab types
// ---------------------------------------------------------------------------

type TabId = "threats" | "missions" | "comms";

const TABS: { id: TabId; label: string; icon: typeof AlertTriangle }[] = [
  { id: "threats", label: "脅威", icon: AlertTriangle },
  { id: "missions", label: "作戦", icon: Zap },
  { id: "comms", label: "通信", icon: Radio },
];

// ---------------------------------------------------------------------------
// Severity helpers
// ---------------------------------------------------------------------------

function sevConfig(s: SeverityLevel) {
  switch (s) {
    case "critical": return { icon: AlertTriangle, color: "text-alert-critical", dot: "bg-alert-critical" };
    case "warning": return { icon: AlertCircle, color: "text-alert-warning", dot: "bg-alert-warning" };
    default: return { icon: Info, color: "text-accent-cyan", dot: "bg-accent-cyan" };
  }
}

function scoreColor(score: number) {
  if (score >= 80) return "text-alert-critical";
  if (score >= 60) return "text-alert-warning";
  return "text-accent-cyan";
}

const STAGE_MAP = {
  detected: { label: "検知", icon: Zap, color: "text-accent-cyan" },
  reviewing: { label: "派遣中", icon: Eye, color: "text-alert-warning" },
  approved: { label: "交戦中", icon: Clock, color: "text-accent-blue" },
  executed: { label: "完了", icon: CheckCircle, color: "text-alert-success" },
} as const;

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function ThreatList({ alerts, onSelectAlert }: { alerts: AlertItem[]; onSelectAlert?: (id: string) => void }) {
  const sorted = [...alerts].sort((a, b) => b.score - a.score);

  if (sorted.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-text-dim readout text-xs">
        脅威は検知されていません
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {sorted.map(alert => {
        const cfg = sevConfig(alert.severity);
        const Icon = cfg.icon;
        return (
          <button
            key={alert.id}
            onClick={() => onSelectAlert?.(alert.id)}
            className="w-full text-left px-3 py-2 hover:bg-bg-elevated/40 transition-colors border-b border-border-subtle/50"
          >
            <div className="flex items-start gap-2">
              <Icon className={`w-3.5 h-3.5 ${cfg.color} shrink-0 mt-0.5 ${alert.severity === "critical" ? "animate-blink" : ""}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-text-primary truncate leading-tight">{alert.title}</span>
                  <span className={`readout text-xs font-bold shrink-0 ${scoreColor(alert.score)}`}>
                    {alert.score}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[10px] text-text-dim readout mt-0.5">
                  <span>{alert.category}</span>
                  <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{alert.location}</span>
                </div>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}

function MissionList({ missions }: { missions: WorkflowCard[] }) {
  const active = missions.filter(c => c.stage !== "executed");
  const done = missions.filter(c => c.stage === "executed");

  if (missions.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-text-dim readout text-xs">
        作戦はありません
      </div>
    );
  }

  return (
    <div>
      {active.map(card => {
        const stage = STAGE_MAP[card.stage];
        const StageIcon = stage.icon;
        return (
          <div key={card.id} className="flex items-center gap-2 px-3 py-2 border-b border-border-subtle/50 hover:bg-bg-elevated/40 transition-colors">
            <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${card.severity === "critical" ? "bg-alert-critical" : card.severity === "warning" ? "bg-alert-warning" : "bg-accent-cyan"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-text-primary truncate">{card.title}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`flex items-center gap-0.5 readout text-[10px] ${stage.color}`}>
                  <StageIcon className="w-2.5 h-2.5" />{stage.label}
                </span>
                <span className="readout text-[10px] text-text-dim">{card.assignee}</span>
              </div>
            </div>
          </div>
        );
      })}
      {done.map(card => (
        <div key={card.id} className="flex items-center gap-2 px-3 py-1.5 border-b border-border-subtle/50 opacity-40">
          <CheckCircle className="w-3 h-3 text-alert-success shrink-0" />
          <p className="text-[10px] text-text-dim truncate flex-1 line-through">{card.title}</p>
        </div>
      ))}
    </div>
  );
}

function CommsLog({ messages }: { messages: ChatMessage[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-24 text-text-dim readout text-xs">
        通信記録なし
      </div>
    );
  }

  return (
    <div ref={scrollRef} className="space-y-0.5 max-h-full overflow-y-auto">
      {messages.map(msg => {
        if (msg.role === "system") {
          return (
            <div key={msg.id} className="flex items-start gap-1.5 px-3 py-1">
              <Terminal className="w-2.5 h-2.5 text-accent-cyan-dim shrink-0 mt-0.5" />
              <span className="readout text-[10px] text-accent-cyan-dim leading-tight">{msg.content}</span>
            </div>
          );
        }
        const isAi = msg.role === "ai";
        return (
          <div key={msg.id} className="px-3 py-1">
            <div className="flex items-center gap-1 mb-0.5">
              {isAi ? <Bot className="w-2.5 h-2.5 text-accent-cyan" /> : null}
              <span className={`readout text-[10px] ${isAi ? "text-accent-cyan" : "text-accent-purple"}`}>
                {isAi ? "MAVEN" : "CMD"}
              </span>
              <span className="readout text-[10px] text-text-dim">{msg.timestamp}</span>
            </div>
            <p className="text-[11px] text-text-secondary leading-relaxed pl-3.5 whitespace-pre-wrap line-clamp-3">
              {msg.content}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Drawer Component
// ---------------------------------------------------------------------------

export default function IntelDrawer({ alerts, missions, messages, onSelectAlert }: IntelDrawerProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<TabId>("threats");
  const drawerRef = useRef<HTMLDivElement>(null);

  // Close drawer when clicking outside (on the map)
  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (open && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open, handleClickOutside]);

  // Badge counts
  const criticalCount = alerts.filter(a => a.severity === "critical").length;
  const activeMissions = missions.filter(m => m.stage !== "executed").length;

  return (
    <div
      ref={drawerRef}
      className={`intel-drawer ${open ? "intel-drawer-open" : ""}`}
      style={{ pointerEvents: open ? "auto" : "none" }}
    >
      {/* Toggle tab handle — always visible on right edge */}
      <button
        onClick={() => setOpen(prev => !prev)}
        className="intel-tab"
        style={{ pointerEvents: "auto" }}
        aria-label={open ? "情報パネルを閉じる" : "情報パネルを開く"}
      >
        {open ? (
          <X className="w-3.5 h-3.5" />
        ) : (
          <>
            <Radio className="w-3.5 h-3.5" />
            <span className="readout text-[10px] tracking-wider">情報</span>
            {criticalCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-alert-critical text-[9px] readout text-white flex items-center justify-center font-bold animate-pulse-dot">
                {criticalCount}
              </span>
            )}
          </>
        )}
      </button>

      {/* Drawer body */}
      <div className="intel-drawer-body">
        {/* Tab bar */}
        <div className="flex border-b border-border-subtle">
          {TABS.map(tab => {
            const TabIcon = tab.icon;
            const isActive = activeTab === tab.id;
            const badge = tab.id === "threats" ? alerts.length
              : tab.id === "missions" ? activeMissions
              : messages.length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 readout text-[11px] transition-colors border-b-2 ${
                  isActive
                    ? "border-accent-cyan text-accent-cyan"
                    : "border-transparent text-text-dim hover:text-text-secondary"
                }`}
              >
                <TabIcon className="w-3 h-3" />
                {tab.label}
                {badge > 0 && (
                  <span className={`readout text-[9px] px-1 rounded-full ${
                    isActive ? "bg-accent-cyan/15 text-accent-cyan" : "bg-bg-elevated text-text-dim"
                  }`}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === "threats" && <ThreatList alerts={alerts} onSelectAlert={onSelectAlert} />}
          {activeTab === "missions" && <MissionList missions={missions} />}
          {activeTab === "comms" && <CommsLog messages={messages} />}
        </div>
      </div>
    </div>
  );
}

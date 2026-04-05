"use client";

import { useState, useMemo } from "react";
import { Bot, AlertTriangle, Target, Package, Lightbulb, Activity, ChevronDown, ChevronUp, Sparkles, Send, MessageSquare } from "lucide-react";
import type { GameState, GameUnit } from "@/lib/game-types";
import { analyzeSituation, getSituationSummary, answerQuery, type AdvisorMessage } from "@/lib/ai-advisor";

interface ChatMsg {
  id: string;
  role: "user" | "ai";
  text: string;
}

interface MavenAiAssistantProps {
  state: GameState;
  onSelectUnit: (unit: GameUnit) => void;
}

function categoryIcon(category: AdvisorMessage["category"]) {
  switch (category) {
    case "threat":      return AlertTriangle;
    case "opportunity": return Target;
    case "resource":    return Package;
    case "strategy":    return Lightbulb;
    case "status":      return Activity;
    default:            return Bot;
  }
}

function priorityStyle(priority: AdvisorMessage["priority"]) {
  switch (priority) {
    case "critical": return { bg: "bg-alert-critical/10", border: "border-alert-critical/30", text: "text-alert-critical" };
    case "warning":  return { bg: "bg-alert-warning/10", border: "border-alert-warning/30", text: "text-alert-warning" };
    case "good":     return { bg: "bg-alert-success/10", border: "border-alert-success/30", text: "text-alert-success" };
    default:         return { bg: "bg-accent-cyan/10", border: "border-accent-cyan/25", text: "text-accent-cyan" };
  }
}

export default function MavenAiAssistant({ state, onSelectUnit }: MavenAiAssistantProps) {
  const [open, setOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(false);
  const [input, setInput] = useState("");
  const [chat, setChat] = useState<ChatMsg[]>([]);
  const messages = useMemo(() => analyzeSituation(state), [state]);
  const summary = useMemo(() => getSituationSummary(state), [state]);
  const topMsg = messages[0];

  const handleSend = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: "user", text: text.trim() };
    const aiMsg: ChatMsg = { id: `a-${Date.now()}`, role: "ai", text: answerQuery(state, text.trim()) };
    setChat(prev => [...prev, userMsg, aiMsg].slice(-10));
    setInput("");
  };

  const SUGGESTED = ["脅威は?", "残り何体?", "補給状況は?", "どうすれば?"];

  return (
    <div className="w-full bg-bg-surface/95 backdrop-blur-md border border-accent-purple/30 rounded-lg overflow-hidden shadow-xl pointer-events-auto">
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-3 py-2 border-b border-border-subtle bg-accent-purple/5 hover:bg-accent-purple/10 transition-colors"
        aria-label={open ? "MAVEN AI パネルを閉じる" : "MAVEN AI パネルを開く"}
        aria-expanded={open}
      >
        <div className="flex items-center gap-2">
          <div className="relative">
            <Sparkles className="w-4 h-4 text-accent-purple" />
            <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-accent-purple animate-pulse-dot" />
          </div>
          <span className="readout text-xs text-accent-purple uppercase tracking-wider font-bold">
            MAVEN AI
          </span>
          {topMsg && !open && (
            <span className={`readout text-xs px-1.5 py-0.5 rounded ${priorityStyle(topMsg.priority).bg} ${priorityStyle(topMsg.priority).text}`}>
              {messages.length}
            </span>
          )}
        </div>
        {open ? <ChevronUp className="w-3.5 h-3.5 text-text-dim" /> : <ChevronDown className="w-3.5 h-3.5 text-text-dim" />}
      </button>

      {open && (
        <>
          {/* Situation summary */}
          <div className="px-3 py-2 border-b border-border-subtle bg-bg-primary/30">
            <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">
              戦況分析
            </div>
            <p className="text-xs text-text-primary leading-snug">{summary}</p>
          </div>

          {/* Messages */}
          <div className="max-h-[36vh] overflow-y-auto">
            {messages.length === 0 ? (
              <div className="px-3 py-4 text-center">
                <Bot className="w-6 h-6 text-text-dim mx-auto mb-2" />
                <p className="text-xs text-text-dim">異常なし。状況監視中。</p>
              </div>
            ) : (
              messages.slice(0, 5).map(msg => {
                const Icon = categoryIcon(msg.category);
                const style = priorityStyle(msg.priority);
                const handleClick = () => {
                  if (msg.targetUnitId) {
                    const unit = state.playerUnits.find(u => u.id === msg.targetUnitId);
                    if (unit) onSelectUnit(unit);
                  }
                };
                return (
                  <button
                    key={msg.id}
                    onClick={handleClick}
                    disabled={!msg.targetUnitId}
                    className={`w-full text-left px-3 py-2 border-b border-border-subtle transition-colors ${msg.targetUnitId ? "hover:bg-bg-elevated/40 cursor-pointer" : "cursor-default"}`}
                  >
                    <div className="flex items-start gap-2">
                      <div className={`shrink-0 mt-0.5 p-1 rounded ${style.bg} border ${style.border}`}>
                        <Icon className={`w-3 h-3 ${style.text}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-xs font-bold ${style.text} mb-0.5`}>{msg.title}</div>
                        <div className="text-xs text-text-secondary leading-snug">{msg.detail}</div>
                        {msg.suggestedAction && (
                          <div className="text-xs text-text-primary mt-1 italic">
                            → {msg.suggestedAction}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {/* Chat toggle */}
          <button
            onClick={() => setChatOpen(o => !o)}
            className="w-full flex items-center justify-between px-3 py-1.5 border-t border-border-subtle bg-bg-primary/30 hover:bg-bg-elevated/40 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-sm text-accent-purple">
              <MessageSquare className="w-4 h-4" />
              <span className="font-bold">AIに質問する</span>
              {!chatOpen && (
                <span className="readout text-xs bg-accent-purple/20 text-accent-purple px-1.5 py-0.5 rounded border border-accent-purple/30 ml-1">
                  チャット
                </span>
              )}
            </div>
            {chatOpen ? <ChevronUp className="w-3 h-3 text-text-dim" /> : <ChevronDown className="w-3 h-3 text-text-dim" />}
          </button>

          {/* Chat interface */}
          {chatOpen && (
            <div className="border-t border-border-subtle">
              {/* Chat messages */}
              {chat.length > 0 && (
                <div className="max-h-32 overflow-y-auto px-3 py-2 space-y-2 bg-bg-deep/30">
                  {chat.map(m => (
                    <div key={m.id} className={`text-xs ${m.role === "user" ? "text-accent-cyan" : "text-text-secondary"}`}>
                      <div className="readout text-xs opacity-60 mb-0.5">
                        {m.role === "user" ? "あなた" : "MAVEN AI"}
                      </div>
                      <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested queries */}
              <div className="px-2 py-1.5 flex flex-wrap gap-1 border-t border-border-subtle">
                {SUGGESTED.map(q => (
                  <button
                    key={q}
                    onClick={() => handleSend(q)}
                    className="readout text-xs px-2 py-1 rounded border border-accent-purple/30 text-accent-purple hover:bg-accent-purple/10 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>

              {/* Input */}
              <div className="px-2 pb-2 pt-1 flex gap-1">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                      handleSend(input);
                    }
                  }}
                  placeholder="状況を質問..."
                  className="flex-1 bg-bg-deep/80 border border-border-subtle rounded px-2 py-1 text-xs text-text-primary placeholder-text-dim outline-none focus:border-accent-purple/40"
                  style={{ fontSize: "16px" }}
                />
                <button
                  onClick={() => handleSend(input)}
                  className="p-1 text-accent-purple hover:text-accent-purple/80 transition"
                  aria-label="送信"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

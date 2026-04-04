"use client";

import { useState, useRef, useEffect } from "react";
import { CHAT_HISTORY, SUGGESTED_QUERIES, type ChatMessage } from "@/lib/mock-data";
import { Send, Bot, User, Terminal, Sparkles } from "lucide-react";

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "system") {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 animate-slide-up">
        <Terminal className="w-3 h-3 text-accent-cyan-dim shrink-0" />
        <span className="readout text-[9px] text-accent-cyan-dim">{msg.content}</span>
        <span className="readout text-[8px] text-text-dim ml-auto">{msg.timestamp}</span>
      </div>
    );
  }

  const isAi = msg.role === "ai";

  return (
    <div className={`px-3 py-1.5 animate-slide-up ${isAi ? "" : "flex justify-end"}`}>
      <div className={`max-w-[95%] ${isAi ? "" : "ml-auto"}`}>
        <div className="flex items-center gap-1.5 mb-1">
          {isAi ? (
            <Bot className="w-3 h-3 text-accent-cyan" />
          ) : (
            <User className="w-3 h-3 text-accent-purple" />
          )}
          <span className={`readout text-[9px] ${isAi ? "text-accent-cyan" : "text-accent-purple"}`}>
            {isAi ? "MAVEN AI" : "OPERATOR"}
          </span>
          <span className="readout text-[8px] text-text-dim">{msg.timestamp}</span>
        </div>
        <div className={`text-[11px] leading-relaxed rounded px-2.5 py-2 whitespace-pre-wrap ${
          isAi
            ? "bg-accent-cyan/5 border border-accent-cyan/10 text-text-primary"
            : "bg-accent-purple/8 border border-accent-purple/15 text-text-primary"
        }`}>
          {msg.content}
        </div>
      </div>
    </div>
  );
}

const AI_RESPONSES: Record<string, string> = {
  "大阪拠点の稼働状況は？": "大阪第二拠点の現在の稼働状況:\n\n• 全体稼働率: 96.8%（目標: 95%）✅\n• ラインA: 稼働中（効率 98.2%）\n• ラインB: 稼働中（効率 93.6%↓注意）\n• ラインC: 定期メンテナンス中（15:00復帰予定）\n\nラインBの効率低下傾向を検知しています。来週の定期点検への追加を推奨します。",
  "今週の配送遅延の傾向を分析して": "今週の配送遅延分析:\n\n• 総遅延件数: 8件（前週比 +3件）\n• 平均遅延時間: 32分（前週: 18分）\n• 主要原因:\n  1. 交通渋滞（5件）— 東京都内 集中\n  2. ルート障害（2件）— 国道1号線工事\n  3. 積載ミス（1件）— 名古屋拠点\n\n⚠️ 東京都内の午後配送で遅延集中。ルート最適化の見直しを推奨します。",
  "SLAリスクのある顧客一覧を表示": "SLA抵触リスクのある顧客:\n\n🔴 高リスク（24h以内）:\n• ABC商事 — 品番A-2240 欠品リスク（SLA: 48h以内納品）\n• DEF物産 — 配送遅延中（SLA: 時間指定±30分）\n\n🟡 中リスク（72h以内）:\n• GHI工業 — 在庫薄（安全在庫ライン付近）\n\n対策は承認待ちワークフローに登録済みです。",
  "品番A-2240の発注を承認して": "品番A-2240 緊急補充発注を処理します:\n\n📋 発注内容:\n• 品番: A-2240（220個）\n• サプライヤー: B社（最短24h納品）\n• 推定コスト: ¥1,540,000\n• 納品先: 東京中央倉庫\n\n✅ 発注承認を受け付けました。ERPシステムへ送信中...\n→ ワークフロー「品番A-2240 緊急補充発注」を「承認済」に更新しました。",
};

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>(CHAT_HISTORY);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const response = AI_RESPONSES[text.trim()] ?? `「${text.trim()}」について分析中です。\n\n現在のデータソースを照会しています。結果は数秒後に表示されます。\n\n（※ プロトタイプのためプリセット応答のみ対応）`;
      const aiMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "ai",
        content: response,
        timestamp: new Date().toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 800 + Math.random() * 700);
  };

  return (
    <div className="panel flex flex-col h-full">
      <div className="panel-header">
        <Sparkles className="w-3 h-3" />
        自然言語インターフェース
        <span className="ml-auto readout text-[9px] text-alert-success flex items-center gap-1">
          <span className="w-1 h-1 rounded-full bg-alert-success animate-pulse-dot" />
          AI READY
        </span>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-2 space-y-1">
        {messages.map(msg => (
          <MessageBubble key={msg.id} msg={msg} />
        ))}
        {isTyping && (
          <div className="px-3 py-1.5 flex items-center gap-2">
            <Bot className="w-3 h-3 text-accent-cyan" />
            <span className="readout text-[10px] text-accent-cyan animate-blink">分析処理中...</span>
          </div>
        )}
      </div>

      {/* Suggested queries */}
      <div className="px-2 py-1.5 border-t border-border-subtle flex gap-1 overflow-x-auto">
        {SUGGESTED_QUERIES.map(q => (
          <button
            key={q}
            className="btn-tactical text-[8px] whitespace-nowrap py-1 px-2 shrink-0"
            onClick={() => sendMessage(q)}
          >
            {q}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="px-2 pb-2">
        <div className="flex items-center gap-2 bg-bg-deep/80 border border-border-active rounded px-3 py-1.5">
          <Terminal className="w-3.5 h-3.5 text-accent-cyan-dim shrink-0" />
          <input
            type="text"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) sendMessage(input);
            }}
            placeholder="指示を入力..."
            className="flex-1 bg-transparent text-text-primary placeholder-text-dim outline-none readout"
            style={{ fontSize: "16px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            className="p-1 text-accent-cyan hover:text-accent-cyan/80 transition"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useState } from "react";
import StatusHeader from "@/components/StatusHeader";
import HudKpi from "@/components/HudKpi";
import TacticalMap from "@/components/TacticalMap";
import AiTriage from "@/components/AiTriage";
import WorkflowKanban from "@/components/WorkflowKanban";
import ChatInterface from "@/components/ChatInterface";

export default function Dashboard() {
  const [, setSelectedMarker] = useState<string | null>(null);

  const handleSelectMarker = useCallback((id: string | null) => {
    setSelectedMarker(id);
  }, []);

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      {/* Top: Status Header */}
      <StatusHeader />

      {/* KPI Bar */}
      <div className="border-b border-border-subtle bg-bg-deep/60 px-3 py-1 shrink-0">
        <HudKpi />
      </div>

      {/* Main Content: 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Tactical Map + Workflow */}
        <div className="flex-[2] flex flex-col border-r border-border-subtle min-w-0">
          <div className="flex-[3] min-h-0">
            <TacticalMap onSelectMarker={handleSelectMarker} />
          </div>
          <div className="flex-[2] border-t border-border-subtle min-h-0">
            <WorkflowKanban />
          </div>
        </div>

        {/* Right: Triage + Chat */}
        <div className="flex-[1] flex flex-col min-w-[320px] max-w-[420px]">
          <div className="flex-[3] border-b border-border-subtle min-h-0 overflow-hidden">
            <AiTriage onSelectMarker={handleSelectMarker} />
          </div>
          <div className="flex-[2] min-h-0 overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </div>

      {/* Bottom status line */}
      <div className="h-6 border-t border-border-subtle bg-bg-deep/80 flex items-center px-4 justify-between shrink-0">
        <div className="readout text-[9px] text-text-dim flex items-center gap-4">
          <span>データソース: <span className="text-alert-success">12/12 接続</span></span>
          <span>最終同期: <span className="text-accent-cyan">2秒前</span></span>
          <span>AIモデル: <span className="text-accent-purple">MAVEN-LLM v3.2</span></span>
        </div>
        <div className="readout text-[9px] text-text-dim flex items-center gap-4">
          <span>オペレーター: <span className="text-text-primary">田中太郎</span></span>
          <span>セッション: <span className="text-accent-cyan">04h 23m</span></span>
        </div>
      </div>
    </div>
  );
}

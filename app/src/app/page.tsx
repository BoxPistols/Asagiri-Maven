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
    <div className="h-screen flex flex-col overflow-hidden bg-bg-deep">
      <StatusHeader />

      {/* Main workspace — map dominant, side panel secondary */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left: Map + KPI */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* KPI strip */}
          <div className="border-b border-border-subtle bg-bg-primary/60 px-5 py-2 shrink-0">
            <HudKpi />
          </div>
          {/* Map — takes all remaining space */}
          <div className="flex-1 min-h-0">
            <TacticalMap onSelectMarker={handleSelectMarker} />
          </div>
        </div>

        {/* Right sidebar — narrow */}
        <div className="w-[380px] shrink-0 flex flex-col border-l border-border-subtle">
          <div className="flex-[3] border-b border-border-subtle min-h-0 overflow-hidden">
            <AiTriage onSelectMarker={handleSelectMarker} />
          </div>
          <div className="flex-[2] border-b border-border-subtle min-h-0 overflow-hidden">
            <WorkflowKanban />
          </div>
          <div className="flex-[2] min-h-0 overflow-hidden">
            <ChatInterface />
          </div>
        </div>
      </div>

      {/* Status bar */}
      <div className="h-7 border-t border-border-subtle bg-bg-primary/80 backdrop-blur-sm flex items-center px-5 justify-between shrink-0">
        <div className="readout text-xs text-text-dim flex items-center gap-5">
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-alert-success" />
            データソース <span className="text-text-secondary">12/12</span>
          </span>
          <span>最終同期 <span className="text-accent-cyan">2秒前</span></span>
        </div>
        <div className="readout text-xs text-text-dim flex items-center gap-5">
          <span>田中太郎</span>
        </div>
      </div>
    </div>
  );
}

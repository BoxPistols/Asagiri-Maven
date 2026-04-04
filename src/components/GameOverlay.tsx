"use client";

import { Shield, Swords, Target, Trophy, Skull, RotateCcw, Play } from "lucide-react";
import type { GamePhase, GameKpis } from "@/lib/game-types";

interface GameOverlayProps {
  phase: GamePhase;
  wave: number;
  waveConfig: { name: string; description: string; briefing: string } | null;
  kpis: GameKpis;
  onStart: () => void;
  onRestart: () => void;
}

function KpiSummaryRow({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const barColor =
    value >= 60 ? "bg-alert-success" : value >= 30 ? "bg-alert-warning" : "bg-alert-critical";
  return (
    <div className="flex items-center gap-3">
      <span className="text-text-dim shrink-0">{icon}</span>
      <span className="readout text-xs text-text-secondary w-16 shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-bg-deep rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className="readout text-sm font-bold text-text-primary w-10 text-right">{value}</span>
    </div>
  );
}

function BriefingScreen({
  wave,
  waveConfig,
  onStart,
}: {
  wave: number;
  waveConfig: GameOverlayProps["waveConfig"];
  onStart: () => void;
}) {
  return (
    <div className="game-card animate-slide-up">
      {/* Top accent */}
      <div className="h-1 bg-gradient-to-r from-accent-cyan via-accent-indigo to-accent-purple rounded-t-lg" />

      <div className="p-6 space-y-5">
        {/* Wave badge */}
        <div className="flex items-center justify-center gap-3">
          <Swords className="w-5 h-5 text-accent-cyan" />
          <span className="readout text-xs text-accent-cyan uppercase tracking-[0.3em]">
            作戦指令
          </span>
          <Swords className="w-5 h-5 text-accent-cyan" />
        </div>

        <div className="text-center space-y-2">
          <div className="readout text-sm text-accent-cyan uppercase tracking-wider">
            Wave {wave}
          </div>
          <h2 className="text-2xl font-bold text-text-primary">
            {waveConfig?.name ?? `第${wave}波`}
          </h2>
          <p className="text-sm text-text-secondary leading-relaxed">
            {waveConfig?.description ?? "新たな脅威が迫っています。"}
          </p>
        </div>

        {/* Briefing text */}
        {waveConfig?.briefing && (
          <div className="bg-bg-deep/80 border border-border-subtle rounded-lg p-4">
            <div className="readout text-xs text-accent-cyan-dim uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Target className="w-3 h-3" />
              作戦概要
            </div>
            <p className="text-xs text-text-secondary leading-relaxed whitespace-pre-wrap">
              {waveConfig.briefing}
            </p>
          </div>
        )}

        <button
          onClick={onStart}
          className="btn-approve w-full justify-center text-base py-3 gap-2"
        >
          <Play className="w-4 h-4" />
          開始
        </button>
      </div>
    </div>
  );
}

function VictoryScreen({
  kpis,
  onRestart,
}: {
  kpis: GameKpis;
  onRestart: () => void;
}) {
  return (
    <div className="game-card animate-slide-up">
      <div className="h-1 bg-gradient-to-r from-alert-success via-accent-cyan to-alert-success rounded-t-lg" />

      <div className="p-6 space-y-5">
        <div className="flex items-center justify-center gap-3">
          <Trophy className="w-6 h-6 text-alert-success" />
          <span className="readout text-xs text-alert-success uppercase tracking-[0.3em]">
            作戦完了
          </span>
          <Trophy className="w-6 h-6 text-alert-success" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-alert-success">作戦成功</h2>
          <p className="text-sm text-text-secondary">
            全ての脅威を撃退しました。部隊の健闘を称えます。
          </p>
        </div>

        {/* Final KPI summary */}
        <div className="bg-bg-deep/80 border border-border-subtle rounded-lg p-4 space-y-3">
          <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">
            最終戦況
          </div>
          <KpiSummaryRow label="戦力" value={kpis.combat} icon={<Swords className="w-3.5 h-3.5" />} />
          <KpiSummaryRow label="物資" value={kpis.supply} icon={<Shield className="w-3.5 h-3.5" />} />
          <KpiSummaryRow label="士気" value={kpis.morale} icon={<Trophy className="w-3.5 h-3.5" />} />
          <KpiSummaryRow label="情報" value={kpis.intel} icon={<Target className="w-3.5 h-3.5" />} />
        </div>

        <button
          onClick={onRestart}
          className="btn-tactical w-full justify-center text-base py-3 gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          もう一度
        </button>
      </div>
    </div>
  );
}

function DefeatScreen({
  kpis,
  onRestart,
}: {
  kpis: GameKpis;
  onRestart: () => void;
}) {
  // Determine what went wrong
  const causes: string[] = [];
  if (kpis.combat <= 0) causes.push("戦力が壊滅しました");
  if (kpis.supply <= 0) causes.push("物資が枯渇しました");
  if (kpis.morale <= 0) causes.push("士気が崩壊しました");
  if (kpis.intel <= 0) causes.push("情報網が壊滅しました");
  if (causes.length === 0) causes.push("防衛線が突破されました");

  return (
    <div className="game-card animate-slide-up">
      <div className="h-1 bg-gradient-to-r from-alert-critical via-alert-warning to-alert-critical rounded-t-lg" />

      <div className="p-6 space-y-5">
        <div className="flex items-center justify-center gap-3">
          <Skull className="w-6 h-6 text-alert-critical" />
          <span className="readout text-xs text-alert-critical uppercase tracking-[0.3em]">
            作戦失敗
          </span>
          <Skull className="w-6 h-6 text-alert-critical" />
        </div>

        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-alert-critical">敗北</h2>
          <div className="space-y-1">
            {causes.map((cause, i) => (
              <p key={i} className="text-sm text-alert-critical/80">{cause}</p>
            ))}
          </div>
        </div>

        {/* Final KPI summary */}
        <div className="bg-bg-deep/80 border border-border-subtle rounded-lg p-4 space-y-3">
          <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">
            最終戦況
          </div>
          <KpiSummaryRow label="戦力" value={kpis.combat} icon={<Swords className="w-3.5 h-3.5" />} />
          <KpiSummaryRow label="物資" value={kpis.supply} icon={<Shield className="w-3.5 h-3.5" />} />
          <KpiSummaryRow label="士気" value={kpis.morale} icon={<Trophy className="w-3.5 h-3.5" />} />
          <KpiSummaryRow label="情報" value={kpis.intel} icon={<Target className="w-3.5 h-3.5" />} />
        </div>

        <button
          onClick={onRestart}
          className="btn-tactical w-full justify-center text-base py-3 gap-2 !border-alert-critical/40 !text-alert-critical hover:!bg-alert-critical/10"
        >
          <RotateCcw className="w-4 h-4" />
          再挑戦
        </button>
      </div>
    </div>
  );
}

export default function GameOverlay({
  phase,
  wave,
  waveConfig,
  kpis,
  onStart,
  onRestart,
}: GameOverlayProps) {
  // Only show overlay when not in "playing" or "paused" phase
  if (phase === "playing" || phase === "paused") return null;

  return (
    <div className="game-overlay">
      {phase === "briefing" && (
        <BriefingScreen wave={wave} waveConfig={waveConfig} onStart={onStart} />
      )}
      {phase === "victory" && (
        <VictoryScreen kpis={kpis} onRestart={onRestart} />
      )}
      {phase === "defeat" && (
        <DefeatScreen kpis={kpis} onRestart={onRestart} />
      )}
    </div>
  );
}

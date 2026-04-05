"use client";

import { Shield, Swords, Target, Trophy, Skull, RotateCcw, Play, ArrowRight, Wrench, Clock, Package } from "lucide-react";
import type { GamePhase, GameKpis } from "@/lib/game-types";

interface GameOverlayProps {
  phase: GamePhase;
  wave: number;
  waveConfig: { name: string; description: string; briefing: string } | null;
  kpis: GameKpis;
  turn?: number;
  unitsLost?: number;
  supplySpent?: number;
  supply?: number;
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
    <div className="game-card animate-slide-up" style={{ maxWidth: wave === 1 ? 560 : 480 }}>
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

        {/* Wave 1: Full Tutorial */}
        {wave === 1 && (
          <>
            {/* Turn flow diagram */}
            <div className="bg-accent-cyan/5 border border-accent-cyan/15 rounded-lg p-4">
              <div className="readout text-xs text-accent-cyan uppercase tracking-wider mb-3">
                ターンの流れ
              </div>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {[
                  { icon: <Target className="w-3.5 h-3.5" />, label: "移動" },
                  { icon: <Swords className="w-3.5 h-3.5" />, label: "攻撃" },
                  { icon: <Wrench className="w-3.5 h-3.5" />, label: "修理" },
                  { icon: <Clock className="w-3.5 h-3.5" />, label: "ターン終了" },
                ].map((step, i) => (
                  <div key={step.label} className="flex items-center gap-2">
                    <div className="flex items-center gap-1.5 bg-bg-deep/80 border border-border-subtle rounded px-2.5 py-1.5">
                      <span className="text-accent-cyan">{step.icon}</span>
                      <span className="readout text-xs text-text-primary">{step.label}</span>
                    </div>
                    {i < 3 && <ArrowRight className="w-3 h-3 text-text-dim" />}
                  </div>
                ))}
              </div>
            </div>

            {/* Type matchup chart */}
            <div className="bg-accent-indigo/5 border border-accent-indigo/15 rounded-lg p-4">
              <div className="readout text-xs text-accent-indigo uppercase tracking-wider mb-3">
                ユニット相性
              </div>
              <div className="grid grid-cols-4 gap-px text-center readout text-xs">
                {/* Header row */}
                <div className="p-1.5" />
                <div className="p-1.5 text-accent-cyan font-bold">歩兵</div>
                <div className="p-1.5 text-accent-cyan font-bold">車両</div>
                <div className="p-1.5 text-accent-cyan font-bold">ドローン</div>
                {/* Infantry row */}
                <div className="p-1.5 text-accent-cyan font-bold text-left">歩兵</div>
                <div className="p-1.5 bg-bg-deep/40 rounded text-text-dim">--</div>
                <div className="p-1.5 bg-alert-critical/8 rounded text-alert-critical">弱い</div>
                <div className="p-1.5 bg-alert-success/8 rounded text-alert-success">強い</div>
                {/* Vehicle row */}
                <div className="p-1.5 text-accent-cyan font-bold text-left">車両</div>
                <div className="p-1.5 bg-alert-success/8 rounded text-alert-success">強い</div>
                <div className="p-1.5 bg-bg-deep/40 rounded text-text-dim">--</div>
                <div className="p-1.5 bg-alert-critical/8 rounded text-alert-critical">弱い</div>
                {/* Drone row */}
                <div className="p-1.5 text-accent-cyan font-bold text-left">ドローン</div>
                <div className="p-1.5 bg-alert-critical/8 rounded text-alert-critical">弱い</div>
                <div className="p-1.5 bg-alert-success/8 rounded text-alert-success">強い</div>
                <div className="p-1.5 bg-bg-deep/40 rounded text-text-dim">--</div>
              </div>
            </div>

            {/* Supply system explanation */}
            <div className="bg-alert-warning/5 border border-alert-warning/12 rounded-lg p-4">
              <div className="readout text-xs text-alert-warning uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Package className="w-3 h-3" />
                補給システム
              </div>
              <ul className="text-xs text-text-secondary space-y-1.5 leading-relaxed">
                <li>- 施設がターンごとに補給を生産します</li>
                <li>- 部隊の修理には補給を消費します</li>
                <li>- 補給が不足すると修理や増援ができません</li>
                <li>- 施設を敵から防衛して補給ラインを維持しましょう</li>
              </ul>
            </div>

            {/* Operational guide */}
            <div className="bg-accent-purple/5 border border-accent-purple/15 rounded-lg p-4">
              <div className="readout text-xs text-accent-purple uppercase tracking-wider mb-2">
                操作ガイド
              </div>
              <ul className="text-xs text-text-secondary space-y-1.5 leading-relaxed">
                <li>1. 味方フェーズ: 地図上の部隊をクリックして移動・攻撃を指示</li>
                <li>2. 敵フェーズ: 敵が自動で行動します（待機してください）</li>
                <li>3. 判定フェーズ: 交戦結果が計算されます</li>
                <li>4. 戦力・物資・士気・情報・補給の5つを管理してください</li>
                <li>5. 全5ウェーブを生き残り、最終ボスを撃破すれば勝利</li>
              </ul>
            </div>
          </>
        )}

        <button
          onClick={onStart}
          className="btn-approve w-full justify-center text-base py-3 gap-2"
        >
          <Play className="w-4 h-4" />
          作戦開始
        </button>
      </div>
    </div>
  );
}

function calcScore(kpis: GameKpis, turn?: number, supply?: number): number {
  const kpiAvg = Math.round((kpis.combat + kpis.supply + kpis.morale + kpis.intel) / 4);
  const turnBonus = (turn ?? 0) * 10;
  const supplyBonus = supply ?? 0;
  return turnBonus + kpiAvg + supplyBonus;
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="readout text-xs text-text-dim">{label}</span>
      <span className={`readout text-sm font-bold ${accent ? "text-accent-cyan" : "text-text-primary"}`}>
        {value}
      </span>
    </div>
  );
}

function VictoryScreen({
  kpis,
  turn,
  unitsLost,
  supplySpent,
  supply,
  onRestart,
}: {
  kpis: GameKpis;
  turn?: number;
  unitsLost?: number;
  supplySpent?: number;
  supply?: number;
  onRestart: () => void;
}) {
  const score = calcScore(kpis, turn, supply);

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

        {/* Score */}
        <div className="text-center py-2">
          <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">
            作戦評価スコア
          </div>
          <div className="readout text-4xl font-bold text-accent-cyan" style={{ textShadow: "0 0 20px rgba(34,211,238,0.3)" }}>
            {score}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-bg-deep/80 border border-border-subtle rounded-lg p-4 space-y-2.5">
          <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">
            作戦統計
          </div>
          {typeof turn === "number" && <StatRow label="生存ターン数" value={turn} />}
          {typeof unitsLost === "number" && <StatRow label="喪失部隊" value={`${unitsLost}部隊`} />}
          {typeof supplySpent === "number" && <StatRow label="消費補給" value={supplySpent} />}
          {typeof supply === "number" && <StatRow label="残存補給" value={supply} />}
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
  turn,
  unitsLost,
  supplySpent,
  supply,
  onRestart,
}: {
  kpis: GameKpis;
  turn?: number;
  unitsLost?: number;
  supplySpent?: number;
  supply?: number;
  onRestart: () => void;
}) {
  // Determine what went wrong
  const causes: string[] = [];
  if (kpis.combat <= 0) causes.push("戦力が壊滅しました");
  if (kpis.supply <= 0) causes.push("物資が枯渇しました");
  if (kpis.morale <= 0) causes.push("士気が崩壊しました");
  if (kpis.intel <= 0) causes.push("情報網が壊滅しました");
  if (causes.length === 0) causes.push("防衛線が突破されました");

  const score = calcScore(kpis, turn, supply);

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

        {/* Score */}
        <div className="text-center py-1">
          <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">
            作戦評価スコア
          </div>
          <div className="readout text-3xl font-bold text-alert-critical" style={{ textShadow: "0 0 15px rgba(248,113,113,0.3)" }}>
            {score}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-bg-deep/80 border border-border-subtle rounded-lg p-4 space-y-2.5">
          <div className="readout text-xs text-text-dim uppercase tracking-wider mb-1">
            作戦統計
          </div>
          {typeof turn === "number" && <StatRow label="生存ターン数" value={turn} />}
          {typeof unitsLost === "number" && <StatRow label="喪失部隊" value={`${unitsLost}部隊`} />}
          {typeof supplySpent === "number" && <StatRow label="消費補給" value={supplySpent} />}
          {typeof supply === "number" && <StatRow label="残存補給" value={supply} />}
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
  turn,
  unitsLost,
  supplySpent,
  supply,
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
        <VictoryScreen
          kpis={kpis}
          turn={turn}
          unitsLost={unitsLost}
          supplySpent={supplySpent}
          supply={supply}
          onRestart={onRestart}
        />
      )}
      {phase === "defeat" && (
        <DefeatScreen
          kpis={kpis}
          turn={turn}
          unitsLost={unitsLost}
          supplySpent={supplySpent}
          supply={supply}
          onRestart={onRestart}
        />
      )}
    </div>
  );
}

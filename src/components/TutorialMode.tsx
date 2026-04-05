"use client";

import { useEffect, useState } from "react";
import { Play, ChevronRight, SkipForward, Shield, Swords, Target, AlertTriangle, Wrench, Flag } from "lucide-react";

interface TutorialStep {
  id: number;
  title: string;
  description: string;
  highlight?: "ally" | "enemy" | "objectives" | "actions" | "phases" | "arrow_keys";
  icon: React.ReactNode;
  duration: number; // milliseconds for auto-advance
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    id: 1,
    title: "MAVEN COMMAND へようこそ",
    description: "あなたは日本防衛軍の司令官です。5ウェーブの敵侵攻から日本を守ります。",
    icon: <Shield className="w-8 h-8" />,
    duration: 4000,
  },
  {
    id: 2,
    title: "味方ユニット (青)",
    description: "青いシールドマークが味方です。5つの基地と9機の機動部隊を指揮します。",
    highlight: "ally",
    icon: <Shield className="w-8 h-8 text-accent-blue" />,
    duration: 5000,
  },
  {
    id: 3,
    title: "敵ユニット (赤)",
    description: "赤い警告三角形が敵です。ターンごとに移動・攻撃してきます。",
    highlight: "enemy",
    icon: <AlertTriangle className="w-8 h-8 text-alert-critical" />,
    duration: 5000,
  },
  {
    id: 4,
    title: "操作方法",
    description: "味方をクリック→選択→地図クリックで移動、敵クリックで攻撃。Arrowキーでも移動可能。",
    highlight: "actions",
    icon: <Target className="w-8 h-8 text-accent-cyan" />,
    duration: 6000,
  },
  {
    id: 5,
    title: "ターンの流れ",
    description: "味方フェーズ → 敵フェーズ → 結果フェーズ の順に進みます。全ユニット行動後に「ターン終了」。",
    highlight: "phases",
    icon: <Flag className="w-8 h-8 text-accent-purple" />,
    duration: 6000,
  },
  {
    id: 6,
    title: "ユニット相性",
    description: "ドローン→歩兵→車両→艦船→ドローン のじゃんけん。有利な相手には1.5倍ダメージ。",
    icon: <Swords className="w-8 h-8 text-alert-warning" />,
    duration: 6000,
  },
  {
    id: 7,
    title: "任務目標",
    description: "右下パネルに勝利条件が表示されます。敵殲滅・拠点防衛・最終波到達を目指せ。",
    highlight: "objectives",
    icon: <Target className="w-8 h-8 text-alert-success" />,
    duration: 6000,
  },
  {
    id: 8,
    title: "補給と修理",
    description: "拠点から補給が生産されます。損傷したユニットは拠点近くで修理可能(補給10消費)。",
    icon: <Wrench className="w-8 h-8 text-alert-success" />,
    duration: 6000,
  },
  {
    id: 9,
    title: "準備完了",
    description: "それでは作戦を開始します。日本を守り抜いてください、司令官。",
    icon: <Play className="w-8 h-8 text-accent-cyan" />,
    duration: 3000,
  },
];

interface TutorialModeProps {
  onComplete: () => void;
  onSkip: () => void;
}

export default function TutorialMode({ onComplete, onSkip }: TutorialModeProps) {
  const [stepIdx, setStepIdx] = useState(0);
  const [autoPlay, setAutoPlay] = useState(true);
  const step = TUTORIAL_STEPS[stepIdx];
  const isLast = stepIdx === TUTORIAL_STEPS.length - 1;

  // Auto-advance
  useEffect(() => {
    if (!autoPlay) return;
    const timer = setTimeout(() => {
      if (isLast) {
        onComplete();
      } else {
        setStepIdx(i => i + 1);
      }
    }, step.duration);
    return () => clearTimeout(timer);
  }, [stepIdx, autoPlay, isLast, step.duration, onComplete]);

  const handleNext = () => {
    setAutoPlay(false);
    if (isLast) onComplete();
    else setStepIdx(i => i + 1);
  };

  const progress = ((stepIdx + 1) / TUTORIAL_STEPS.length) * 100;

  return (
    <div className="fixed inset-0 z-[10000] bg-bg-deep/95 backdrop-blur-md flex flex-col items-center justify-center p-4">
      {/* Progress bar */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-bg-surface">
        <div
          className="h-full bg-gradient-to-r from-accent-cyan to-accent-indigo transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Skip button */}
      <button
        onClick={onSkip}
        className="absolute top-4 right-4 btn-tactical text-xs gap-2"
      >
        <SkipForward className="w-3.5 h-3.5" />
        スキップ
      </button>

      {/* Step counter */}
      <div className="readout text-xs text-text-dim uppercase tracking-widest mb-6">
        TUTORIAL — Step {stepIdx + 1} / {TUTORIAL_STEPS.length}
      </div>

      {/* Main card */}
      <div className="max-w-lg w-full bg-bg-surface border-2 border-accent-cyan/30 rounded-xl p-8 shadow-2xl animate-slide-up" key={stepIdx}>
        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-accent-cyan/10 border-2 border-accent-cyan/30 flex items-center justify-center text-accent-cyan">
            {step.icon}
          </div>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold text-text-primary text-center mb-3">
          {step.title}
        </h2>

        {/* Description */}
        <p className="text-sm text-text-secondary text-center leading-relaxed mb-6">
          {step.description}
        </p>

        {/* Demo visual based on highlight */}
        {step.highlight === "ally" && (
          <div className="flex justify-center gap-4 mb-6">
            <div className="relative">
              <svg width="120" height="132" viewBox="0 0 40 44">
                <circle cx="20" cy="18" r="16" fill="rgba(59,130,246,0.25)" />
                <path d="M 20 2 L 36 6 L 36 22 Q 36 32 20 36 Q 4 32 4 22 L 4 6 Z" fill="rgba(15,23,42,0.95)" stroke="#3b82f6" strokeWidth="2"/>
                <rect x="8" y="0" width="24" height="6" rx="1" fill="#3b82f6"/>
                <text x="20" y="5" textAnchor="middle" fontFamily="monospace" fontSize="5" fontWeight="bold" fill="#fff">ALLY</text>
                <rect x="2" y="38" width="36" height="4" rx="2" fill="#34d399"/>
              </svg>
            </div>
          </div>
        )}

        {step.highlight === "enemy" && (
          <div className="flex justify-center gap-4 mb-6">
            <div className="relative">
              <svg width="144" height="156" viewBox="0 0 48 52">
                <circle cx="24" cy="22" r="20" fill="rgba(239,68,68,0.3)">
                  <animate attributeName="r" values="18;24;18" dur="1.5s" repeatCount="indefinite"/>
                  <animate attributeName="opacity" values="0.6;0;0.6" dur="1.5s" repeatCount="indefinite"/>
                </circle>
                <path d="M 24 4 L 44 38 L 4 38 Z" fill="#7f0c0c" stroke="#ef4444" strokeWidth="2.5"/>
                <path d="M 24 8 L 40 36 L 8 36 Z" fill="rgba(127,12,12,0.95)" stroke="#fbbf24" strokeWidth="1.2"/>
                <rect x="22" y="14" width="4" height="12" rx="1" fill="#fbbf24"/>
                <circle cx="24" cy="31" r="2" fill="#fbbf24"/>
                <rect x="8" y="0" width="32" height="8" rx="2" fill="#ef4444"/>
                <text x="24" y="6" textAnchor="middle" fontFamily="monospace" fontSize="6" fontWeight="bold" fill="#fff">ENEMY</text>
              </svg>
            </div>
          </div>
        )}

        {step.highlight === "actions" && (
          <div className="grid grid-cols-2 gap-2 mb-6">
            {[
              { key: "クリック", label: "ユニット選択" },
              { key: "↑↓←→", label: "矢印で移動" },
              { key: "Q/W/E/R", label: "アクション" },
              { key: "Space", label: "ターン終了" },
            ].map(item => (
              <div key={item.key} className="bg-bg-deep/60 border border-border-subtle rounded px-3 py-2 text-center">
                <div className="readout text-xs text-accent-cyan font-bold mb-1">{item.key}</div>
                <div className="text-xs text-text-secondary">{item.label}</div>
              </div>
            ))}
          </div>
        )}

        {step.highlight === "phases" && (
          <div className="flex items-center justify-center gap-2 mb-6">
            {[
              { label: "味方", color: "bg-accent-cyan" },
              { label: "敵", color: "bg-alert-critical" },
              { label: "結果", color: "bg-accent-purple" },
            ].map((phase, i) => (
              <div key={phase.label} className="flex items-center gap-2">
                <div className={`${phase.color} px-3 py-1.5 rounded text-xs text-white font-bold`}>
                  {phase.label}フェーズ
                </div>
                {i < 2 && <ChevronRight className="w-4 h-4 text-text-dim" />}
              </div>
            ))}
          </div>
        )}

        {step.highlight === "objectives" && (
          <div className="bg-bg-deep/60 border border-border-subtle rounded-lg p-3 space-y-2 mb-6">
            {[
              { label: "敵部隊を殲滅", value: "0/8" },
              { label: "全5拠点を防衛", value: "5/5" },
              { label: "最終波まで生存", value: "1/5" },
            ].map(obj => (
              <div key={obj.label} className="flex items-center justify-between text-xs">
                <span className="text-text-primary">◆ {obj.label}</span>
                <span className="readout text-accent-cyan font-bold">{obj.value}</span>
              </div>
            ))}
          </div>
        )}

        {/* Next button */}
        <button
          onClick={handleNext}
          className="btn-approve w-full justify-center text-base py-3 gap-2"
        >
          {isLast ? (
            <>
              <Play className="w-4 h-4" />
              作戦開始
            </>
          ) : (
            <>
              <ChevronRight className="w-4 h-4" />
              次へ
            </>
          )}
        </button>
      </div>

      {/* Auto-play indicator */}
      {autoPlay && (
        <div className="mt-4 text-xs text-text-dim readout">
          自動進行中... クリックで一時停止
        </div>
      )}
    </div>
  );
}

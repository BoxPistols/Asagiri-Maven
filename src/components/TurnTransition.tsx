"use client";

import { useEffect, useState } from "react";

interface TurnTransitionProps {
  show: boolean;
  type: "player_phase" | "enemy_phase" | "wave_start" | "resolution";
  turn: number;
  wave: number;
  waveName?: string;
  enemyCount?: number;
}

/**
 * Phase transition overlay.
 * - player_phase: "味方フェーズ" in cyan, brief fade-in (0.6s)
 * - enemy_phase:  "敵フェーズ" in red, menacing feel
 * - resolution:   No overlay, just a brief screen-edge flash
 * - wave_start:   "第X波 開始" dramatic reveal, holds 1.5s
 */
export default function TurnTransition({
  show,
  type,
  turn,
  wave,
  waveName,
  enemyCount,
}: TurnTransitionProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
    } else {
      setVisible(false);
    }
  }, [show]);

  if (!visible) return null;

  // Resolution: brief edge flash only
  if (type === "resolution") {
    return (
      <div
        className="animate-resolution-flash"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
          pointerEvents: "none",
          background:
            "radial-gradient(ellipse at center, rgba(192, 132, 252, 0.12), transparent 70%)",
        }}
      />
    );
  }

  // Wave start: dramatic reveal
  if (type === "wave_start") {
    return (
      <div
        className="animate-wave-reveal"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(7, 11, 21, 0.8)",
          pointerEvents: "none",
        }}
      >
        {/* Decorative line */}
        <div
          className="animate-line-expand"
          style={{
            width: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)",
            marginBottom: 24,
          }}
        />

        <div
          className="readout"
          style={{
            fontSize: 14,
            letterSpacing: "0.4em",
            textTransform: "uppercase",
            color: "var(--accent-cyan)",
            marginBottom: 8,
            textShadow: "0 0 20px rgba(34,211,238,0.6)",
            opacity: 0,
            animation: "wave-text-in 0.4s 0.3s ease-out forwards",
          }}
        >
          WAVE {wave}
        </div>

        <div
          className="readout"
          style={{
            fontSize: 42,
            fontWeight: 700,
            letterSpacing: "0.12em",
            color: "var(--text-primary)",
            textShadow: "0 0 30px rgba(34,211,238,0.4), 0 0 60px rgba(34,211,238,0.15)",
            opacity: 0,
            animation: "wave-text-in 0.5s 0.5s ease-out forwards",
          }}
        >
          第{wave}波 開始
        </div>

        {waveName && (
          <div
            className="readout"
            style={{
              fontSize: 16,
              letterSpacing: "0.15em",
              color: "var(--accent-cyan)",
              marginTop: 8,
              opacity: 0,
              animation: "wave-text-in 0.4s 0.7s ease-out forwards",
              textShadow: "0 0 12px rgba(34,211,238,0.4)",
            }}
          >
            — {waveName} —
          </div>
        )}

        {/* Decorative line bottom */}
        <div
          className="animate-line-expand"
          style={{
            width: 0,
            height: 1,
            background: "linear-gradient(90deg, transparent, var(--accent-cyan), transparent)",
            marginTop: 24,
            animationDelay: "0.2s",
          }}
        />
      </div>
    );
  }

  // Player phase
  if (type === "player_phase") {
    return (
      <div
        className="animate-phase-player"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9000,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "rgba(7, 11, 21, 0.5)",
          pointerEvents: "none",
        }}
      >
        <div
          className="readout"
          style={{
            fontSize: 12,
            letterSpacing: "0.3em",
            textTransform: "uppercase",
            color: "var(--accent-cyan-dim)",
            marginBottom: 6,
          }}
        >
          TURN {turn}
        </div>
        <div
          className="readout"
          style={{
            fontSize: 32,
            fontWeight: 700,
            letterSpacing: "0.2em",
            color: "var(--accent-cyan)",
            textShadow:
              "0 0 20px rgba(34,211,238,0.5), 0 0 40px rgba(34,211,238,0.2)",
          }}
        >
          味方フェーズ
        </div>
        <div
          className="readout"
          style={{
            fontSize: 13,
            letterSpacing: "0.15em",
            color: "var(--accent-cyan-dim)",
            marginTop: 8,
            opacity: 0.8,
          }}
        >
          部隊に指示を出してください
        </div>
      </div>
    );
  }

  // Enemy phase
  return (
    <div
      className="animate-phase-enemy"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(7, 11, 21, 0.55)",
        pointerEvents: "none",
      }}
    >
      <div
        className="readout"
        style={{
          fontSize: 32,
          fontWeight: 700,
          letterSpacing: "0.2em",
          color: "var(--alert-critical)",
          textShadow:
            "0 0 20px rgba(248,113,113,0.5), 0 0 40px rgba(248,113,113,0.2)",
        }}
      >
        敵フェーズ
      </div>
      {typeof enemyCount === "number" && (
        <div
          className="readout"
          style={{
            fontSize: 13,
            letterSpacing: "0.15em",
            color: "var(--alert-critical)",
            marginTop: 8,
            opacity: 0.75,
          }}
        >
          残存敵部隊: {enemyCount}体
        </div>
      )}
      {/* Red vignette on edges */}
      <div
        className="enemy-phase-vignette"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

"use client";

interface TurnTransitionProps {
  turn: number;
  wave: number;
  show: boolean;
  hasCombat: boolean;
  waveChanged: boolean;
}

/**
 * A brief overlay flash shown when a turn advances.
 * - Shows "ターン X" in large centered text
 * - If combat happened, briefly flashes "交戦" in red
 * - If the wave changed, shows "第X波" prominently
 * - Fades in and out over 0.8s total (CSS animation)
 */
export default function TurnTransition({
  turn,
  wave,
  show,
  hasCombat,
  waveChanged,
}: TurnTransitionProps) {
  if (!show) return null;

  return (
    <div
      className="animate-turn-flash"
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
      {/* Wave change banner */}
      {waveChanged && (
        <div
          className="readout"
          style={{
            fontSize: 14,
            letterSpacing: "0.25em",
            textTransform: "uppercase",
            color: "var(--accent-cyan)",
            marginBottom: 6,
            textShadow: "0 0 12px rgba(34,211,238,0.5)",
          }}
        >
          第{wave}波 開始
        </div>
      )}

      {/* Turn number */}
      <div
        className="readout"
        style={{
          fontSize: waveChanged ? 36 : 28,
          fontWeight: 700,
          letterSpacing: "0.15em",
          color: "var(--text-primary)",
          textShadow: "0 0 20px rgba(241,245,249,0.3)",
        }}
      >
        ターン {turn}
      </div>

      {/* Combat flash */}
      {hasCombat && !waveChanged && (
        <div
          className="readout"
          style={{
            fontSize: 13,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#f87171",
            marginTop: 8,
            textShadow: "0 0 10px rgba(248,113,113,0.6)",
          }}
        >
          交戦発生
        </div>
      )}
    </div>
  );
}

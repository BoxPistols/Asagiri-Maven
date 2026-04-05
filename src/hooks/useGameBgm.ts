"use client";

import { useEffect, useRef } from "react";
import type { GamePhase, TurnPhase } from "@/lib/game-types";

// Web Audio API synthesized BGM
// Different tracks for different game states

type BgmTrack = "briefing" | "player_phase" | "enemy_phase" | "victory" | "defeat" | "none";

interface BgmState {
  ctx: AudioContext | null;
  gain: GainNode | null;
  nodes: OscillatorNode[];
  intervals: ReturnType<typeof setInterval>[];
  currentTrack: BgmTrack;
}

function createCtx(): AudioContext | null {
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    return new AC();
  } catch {
    return null;
  }
}

function stopAll(s: BgmState) {
  for (const n of s.nodes) {
    try { n.stop(); n.disconnect(); } catch { /* ignore */ }
  }
  s.nodes = [];
  for (const id of s.intervals) clearInterval(id);
  s.intervals = [];
}

// Play a note
function playNote(ctx: AudioContext, dest: GainNode, freq: number, duration: number, type: OscillatorType = "sine", vol = 0.15, startTime?: number) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  const t0 = startTime ?? ctx.currentTime;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(vol, t0 + 0.05);
  gain.gain.linearRampToValueAtTime(vol * 0.6, t0 + duration * 0.7);
  gain.gain.linearRampToValueAtTime(0, t0 + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(t0);
  osc.stop(t0 + duration + 0.1);
}

// Ambient pad: slow, calm, two-tone drone
function startBriefingTrack(s: BgmState) {
  if (!s.ctx || !s.gain) return;
  const ctx = s.ctx;
  const master = s.gain;

  const loop = () => {
    const notes = [220, 277, 330, 277]; // Am arpeggio
    notes.forEach((f, i) => {
      playNote(ctx, master, f, 2.5, "sine", 0.08, ctx.currentTime + i * 1.5);
      playNote(ctx, master, f * 2, 2.5, "triangle", 0.03, ctx.currentTime + i * 1.5);
    });
  };
  loop();
  const id = setInterval(loop, 6000);
  s.intervals.push(id);
}

// Player phase: tactical, steady rhythm
function startPlayerPhaseTrack(s: BgmState) {
  if (!s.ctx || !s.gain) return;
  const ctx = s.ctx;
  const master = s.gain;

  const loop = () => {
    // Bass line
    const bass = [110, 110, 147, 131]; // A-A-D-C♯
    bass.forEach((f, i) => {
      playNote(ctx, master, f, 0.4, "sawtooth", 0.06, ctx.currentTime + i * 0.5);
    });
    // Melody (subtle)
    const melody = [440, 494, 523, 494]; // A-B-C-B
    melody.forEach((f, i) => {
      playNote(ctx, master, f, 0.3, "sine", 0.04, ctx.currentTime + i * 0.5 + 0.25);
    });
  };
  loop();
  const id = setInterval(loop, 2000);
  s.intervals.push(id);
}

// Enemy phase: tense, low drone + pulse
function startEnemyPhaseTrack(s: BgmState) {
  if (!s.ctx || !s.gain) return;
  const ctx = s.ctx;
  const master = s.gain;

  const loop = () => {
    // Low ominous drone
    playNote(ctx, master, 82, 1.8, "sawtooth", 0.1, ctx.currentTime);
    playNote(ctx, master, 87, 1.8, "square", 0.04, ctx.currentTime);
    // Pulse
    playNote(ctx, master, 165, 0.15, "square", 0.06, ctx.currentTime + 0.5);
    playNote(ctx, master, 165, 0.15, "square", 0.06, ctx.currentTime + 1.0);
    playNote(ctx, master, 165, 0.15, "square", 0.06, ctx.currentTime + 1.5);
  };
  loop();
  const id = setInterval(loop, 2000);
  s.intervals.push(id);
}

function startVictoryTrack(s: BgmState) {
  if (!s.ctx || !s.gain) return;
  const ctx = s.ctx;
  const master = s.gain;
  // Triumphant progression
  const chords = [
    [262, 330, 392], // C major
    [349, 440, 523], // F major
    [392, 494, 587], // G major
    [523, 659, 784], // C octave
  ];
  chords.forEach((chord, i) => {
    chord.forEach(f => {
      playNote(ctx, master, f, 0.8, "sine", 0.1, ctx.currentTime + i * 0.8);
    });
  });
}

function startDefeatTrack(s: BgmState) {
  if (!s.ctx || !s.gain) return;
  const ctx = s.ctx;
  const master = s.gain;
  // Somber minor descent
  const notes = [294, 262, 233, 196];
  notes.forEach((f, i) => {
    playNote(ctx, master, f, 1.5, "triangle", 0.1, ctx.currentTime + i * 1.2);
    playNote(ctx, master, f * 0.5, 1.5, "sine", 0.06, ctx.currentTime + i * 1.2);
  });
}

export function useGameBgm(phase: GamePhase, turnPhase: TurnPhase, muted: boolean) {
  const stateRef = useRef<BgmState>({
    ctx: null,
    gain: null,
    nodes: [],
    intervals: [],
    currentTrack: "none",
  });

  useEffect(() => {
    const s = stateRef.current;

    // Determine target track
    let target: BgmTrack;
    if (muted) target = "none";
    else if (phase === "briefing") target = "briefing";
    else if (phase === "victory") target = "victory";
    else if (phase === "defeat") target = "defeat";
    else if (phase === "playing" && turnPhase === "player") target = "player_phase";
    else if (phase === "playing" && turnPhase === "enemy") target = "enemy_phase";
    else target = "none";

    if (s.currentTrack === target) return;

    // Initialize audio context on first play
    if (!s.ctx && target !== "none") {
      s.ctx = createCtx();
      if (!s.ctx) return;
      s.gain = s.ctx.createGain();
      s.gain.gain.value = 0.25;
      s.gain.connect(s.ctx.destination);
    }

    // Stop current track
    stopAll(s);
    s.currentTrack = target;

    // Start new track
    if (s.ctx) {
      s.ctx.resume().catch(() => { /* ignore */ });
    }
    switch (target) {
      case "briefing": startBriefingTrack(s); break;
      case "player_phase": startPlayerPhaseTrack(s); break;
      case "enemy_phase": startEnemyPhaseTrack(s); break;
      case "victory": startVictoryTrack(s); break;
      case "defeat": startDefeatTrack(s); break;
    }
  }, [phase, turnPhase, muted]);

  // Cleanup on unmount
  useEffect(() => {
    const s = stateRef.current;
    return () => {
      stopAll(s);
      if (s.ctx) {
        try { s.ctx.close(); } catch { /* ignore */ }
      }
    };
  }, []);
}

"use client";

import { useCallback, useRef, useState, useEffect } from "react";

// ---------------------------------------------------------------------------
// useGameAudio — Synthesized sound effects via Web Audio API
// ---------------------------------------------------------------------------

const STORAGE_KEY = "maven-audio-muted";
const DEFAULT_VOLUME = 0.3;

export function useGameAudio() {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const volumeRef = useRef(DEFAULT_VOLUME);
  const [muted, setMuted] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  // Persist muted state
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(muted));
    } catch {
      // ignore
    }
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = muted ? 0 : volumeRef.current;
    }
  }, [muted]);

  // Lazy AudioContext init (must be called from user gesture context)
  const ensureCtx = useCallback((): AudioContext | null => {
    try {
      if (!ctxRef.current) {
        const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AC) return null;
        ctxRef.current = new AC();
        masterGainRef.current = ctxRef.current.createGain();
        masterGainRef.current.gain.value = muted ? 0 : volumeRef.current;
        masterGainRef.current.connect(ctxRef.current.destination);
      }
      if (ctxRef.current.state === "suspended") {
        ctxRef.current.resume();
      }
      return ctxRef.current;
    } catch {
      return null;
    }
  }, [muted]);

  // ---- Helpers ----

  const createNoiseBuffer = useCallback((duration: number, sampleRate: number): AudioBuffer | null => {
    const ctx = ctxRef.current;
    if (!ctx) return null;
    const length = Math.floor(sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }, []);

  const playTone = useCallback((
    freq: number,
    duration: number,
    waveType: OscillatorType = "sine",
    opts?: {
      attack?: number;
      decay?: number;
      sustain?: number;
      release?: number;
      detune?: number;
      freqEnd?: number;
      gainStart?: number;
    },
  ) => {
    const ctx = ensureCtx();
    if (!ctx || !masterGainRef.current) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = waveType;
    osc.frequency.setValueAtTime(freq, now);
    if (opts?.freqEnd !== undefined) {
      osc.frequency.linearRampToValueAtTime(opts.freqEnd, now + duration);
    }
    if (opts?.detune) {
      osc.detune.setValueAtTime(opts.detune, now);
    }

    // ADSR envelope
    const attack = opts?.attack ?? 0.005;
    const decay = opts?.decay ?? duration * 0.3;
    const sustain = opts?.sustain ?? 0.3;
    const release = opts?.release ?? duration * 0.2;
    const gainStart = opts?.gainStart ?? 0.6;
    const totalDuration = duration + release;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainStart, now + attack);
    gain.gain.linearRampToValueAtTime(gainStart * sustain, now + attack + decay);
    gain.gain.setValueAtTime(gainStart * sustain, now + duration);
    gain.gain.linearRampToValueAtTime(0, now + totalDuration);

    osc.connect(gain);
    gain.connect(masterGainRef.current);
    osc.start(now);
    osc.stop(now + totalDuration + 0.01);
  }, [ensureCtx]);

  const playNoise = useCallback((
    duration: number,
    opts?: {
      attack?: number;
      decay?: number;
      gainStart?: number;
      filterFreq?: number;
      filterType?: BiquadFilterType;
    },
  ) => {
    const ctx = ensureCtx();
    if (!ctx || !masterGainRef.current) return;

    const now = ctx.currentTime;
    const buffer = createNoiseBuffer(duration + 0.1, ctx.sampleRate);
    if (!buffer) return;

    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gain = ctx.createGain();
    const attack = opts?.attack ?? 0.003;
    const decayTime = opts?.decay ?? duration * 0.8;
    const gainStart = opts?.gainStart ?? 0.3;

    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(gainStart, now + attack);
    gain.gain.linearRampToValueAtTime(0, now + attack + decayTime);

    if (opts?.filterFreq) {
      const filter = ctx.createBiquadFilter();
      filter.type = opts.filterType ?? "lowpass";
      filter.frequency.setValueAtTime(opts.filterFreq, now);
      source.connect(filter);
      filter.connect(gain);
    } else {
      source.connect(gain);
    }

    gain.connect(masterGainRef.current);
    source.start(now);
    source.stop(now + duration + 0.1);
  }, [ensureCtx, createNoiseBuffer]);

  // ---- Sound Effects ----

  const playSelect = useCallback(() => {
    try {
      playTone(880, 0.05, "sine", { attack: 0.003, decay: 0.03, sustain: 0.1, release: 0.015, gainStart: 0.4 });
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playMove = useCallback(() => {
    try {
      playNoise(0.2, { attack: 0.01, decay: 0.18, gainStart: 0.15, filterFreq: 3000, filterType: "bandpass" });
      playTone(400, 0.15, "sine", { freqEnd: 200, attack: 0.01, decay: 0.12, sustain: 0.1, release: 0.03, gainStart: 0.2 });
    } catch { /* audio unavailable */ }
  }, [playNoise, playTone]);

  const playAttack = useCallback(() => {
    try {
      playTone(200, 0.08, "square", { attack: 0.002, decay: 0.06, sustain: 0.1, release: 0.02, gainStart: 0.35 });
      playNoise(0.15, { attack: 0.002, decay: 0.12, gainStart: 0.3, filterFreq: 4000 });
    } catch { /* audio unavailable */ }
  }, [playTone, playNoise]);

  const playExplosion = useCallback(() => {
    try {
      playTone(80, 0.4, "sine", { attack: 0.005, decay: 0.35, sustain: 0.05, release: 0.1, gainStart: 0.5, freqEnd: 40 });
      playNoise(0.4, { attack: 0.005, decay: 0.35, gainStart: 0.4, filterFreq: 1500 });
      playTone(120, 0.2, "triangle", { attack: 0.003, decay: 0.15, sustain: 0.1, release: 0.05, gainStart: 0.25 });
    } catch { /* audio unavailable */ }
  }, [playTone, playNoise]);

  const playDamage = useCallback(() => {
    try {
      playTone(150, 0.1, "triangle", { attack: 0.003, decay: 0.07, sustain: 0.15, release: 0.03, gainStart: 0.3 });
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playPhaseChange = useCallback(() => {
    try {
      playTone(660, 0.1, "sine", { attack: 0.005, decay: 0.06, sustain: 0.2, release: 0.03, gainStart: 0.35 });
      setTimeout(() => {
        try {
          playTone(880, 0.1, "sine", { attack: 0.005, decay: 0.06, sustain: 0.2, release: 0.03, gainStart: 0.35 });
        } catch { /* ignore */ }
      }, 110);
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playWaveStart = useCallback(() => {
    try {
      const notes = [523, 659, 784]; // C-E-G
      notes.forEach((freq, i) => {
        setTimeout(() => {
          try {
            playTone(freq, 0.15, "sine", { attack: 0.005, decay: 0.1, sustain: 0.2, release: 0.04, gainStart: 0.4 });
          } catch { /* ignore */ }
        }, i * 160);
      });
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playVictory = useCallback(() => {
    try {
      const notes = [523, 659, 784, 1047]; // C-E-G-C
      notes.forEach((freq, i) => {
        setTimeout(() => {
          try {
            playTone(freq, 0.25, "sine", { attack: 0.01, decay: 0.15, sustain: 0.3, release: 0.08, gainStart: 0.4 });
          } catch { /* ignore */ }
        }, i * 180);
      });
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playDefeat = useCallback(() => {
    try {
      const notes = [523, 415, 349, 294]; // C-Ab-F-D descending minor
      notes.forEach((freq, i) => {
        setTimeout(() => {
          try {
            playTone(freq, 0.3, "sine", { attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.1, gainStart: 0.35 });
          } catch { /* ignore */ }
        }, i * 220);
      });
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playError = useCallback(() => {
    try {
      playTone(150, 0.1, "square", { attack: 0.003, decay: 0.07, sustain: 0.2, release: 0.02, gainStart: 0.25 });
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playRepair = useCallback(() => {
    try {
      playTone(600, 0.3, "sine", { freqEnd: 1200, attack: 0.01, decay: 0.2, sustain: 0.2, release: 0.08, gainStart: 0.3 });
      // Add a subtle sparkle layer
      setTimeout(() => {
        try {
          playTone(1200, 0.15, "sine", { attack: 0.005, decay: 0.1, sustain: 0.1, release: 0.04, gainStart: 0.15 });
        } catch { /* ignore */ }
      }, 150);
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const playButton = useCallback(() => {
    try {
      playTone(1000, 0.02, "sine", { attack: 0.002, decay: 0.015, sustain: 0.1, release: 0.005, gainStart: 0.2 });
    } catch { /* audio unavailable */ }
  }, [playTone]);

  const setVolume = useCallback((v: number) => {
    const clamped = Math.max(0, Math.min(1, v));
    volumeRef.current = clamped;
    if (masterGainRef.current && !muted) {
      masterGainRef.current.gain.value = clamped;
    }
  }, [muted]);

  const toggleMute = useCallback(() => {
    setMuted((prev) => !prev);
  }, []);

  return {
    playSelect,
    playMove,
    playAttack,
    playExplosion,
    playDamage,
    playPhaseChange,
    playWaveStart,
    playVictory,
    playDefeat,
    playError,
    playRepair,
    playButton,
    setVolume,
    muted,
    toggleMute,
  };
}

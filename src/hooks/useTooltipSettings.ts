"use client";

import { useCallback, useEffect, useState } from "react";

export type TooltipMode = "auto" | "manual";

const STORAGE_KEY = "maven-tooltip-mode";
const AUTO_CLOSE_MS = 2500;

interface TooltipSettings {
  mode: TooltipMode;
  autoCloseMs: number;
  setMode: (m: TooltipMode) => void;
  toggleMode: () => void;
}

export function useTooltipSettings(): TooltipSettings {
  const [mode, setModeState] = useState<TooltipMode>("auto");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "manual") setModeState("manual");
  }, []);

  const setMode = useCallback((m: TooltipMode) => {
    setModeState(m);
    try { localStorage.setItem(STORAGE_KEY, m); } catch { /* ignore */ }
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => {
      const next = prev === "auto" ? "manual" : "auto";
      try { localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { mode, autoCloseMs: AUTO_CLOSE_MS, setMode, toggleMode };
}

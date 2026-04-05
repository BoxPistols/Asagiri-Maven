"use client";

import { useCallback, useEffect, useState } from "react";
import { safeGet, safeSet } from "@/lib/safe-storage";

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
    if (safeGet(STORAGE_KEY) === "manual") setModeState("manual");
  }, []);

  const setMode = useCallback((m: TooltipMode) => {
    setModeState(m);
    safeSet(STORAGE_KEY, m);
  }, []);

  const toggleMode = useCallback(() => {
    setModeState(prev => {
      const next = prev === "auto" ? "manual" : "auto";
      safeSet(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return { mode, autoCloseMs: AUTO_CLOSE_MS, setMode, toggleMode };
}

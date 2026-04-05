"use client";

import { Volume2, VolumeX } from "lucide-react";

interface AudioControlsProps {
  muted: boolean;
  onToggleMute: () => void;
}

export default function AudioControls({ muted, onToggleMute }: AudioControlsProps) {
  return (
    <button
      onClick={onToggleMute}
      className="w-8 h-8 flex items-center justify-center rounded border border-border-subtle bg-bg-primary/60 hover:bg-bg-secondary/80 transition-colors"
      aria-label={muted ? "ミュート解除" : "ミュート"}
      title={muted ? "ミュート解除" : "ミュート"}
    >
      {muted ? (
        <VolumeX className="w-4 h-4 text-text-dim" />
      ) : (
        <Volume2 className="w-4 h-4 text-accent-cyan" />
      )}
    </button>
  );
}

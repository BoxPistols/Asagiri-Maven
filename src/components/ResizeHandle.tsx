"use client";

import { useCallback, useRef } from "react";
import { GripHorizontal } from "lucide-react";

interface ResizeHandleProps {
  onResize: (deltaY: number) => void;
}

export default function ResizeHandle({ onResize }: ResizeHandleProps) {
  const startY = useRef(0);
  const dragging = useRef(false);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    startY.current = e.clientY;
    dragging.current = true;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    const delta = e.clientY - startY.current;
    startY.current = e.clientY;
    onResize(delta);
  }, [onResize]);

  const handlePointerUp = useCallback(() => {
    dragging.current = false;
  }, []);

  return (
    <div
      className="h-2 flex items-center justify-center cursor-row-resize shrink-0 group hover:bg-accent-cyan/5 transition-colors border-y border-border-subtle"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      role="separator"
      aria-orientation="horizontal"
      aria-label="パネルサイズ変更"
    >
      <GripHorizontal className="w-4 h-3 text-text-dim group-hover:text-accent-cyan transition-colors" />
    </div>
  );
}

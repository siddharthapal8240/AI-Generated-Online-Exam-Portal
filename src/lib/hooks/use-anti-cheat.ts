"use client";

import { useEffect, useRef } from "react";

interface AntiCheatConfig {
  enabled: boolean;
  onTabSwitch?: (count: number) => void;
  maxTabSwitches?: number;
  onMaxReached?: () => void;
}

export function useAntiCheat({
  enabled,
  onTabSwitch,
  maxTabSwitches = 5,
  onMaxReached,
}: AntiCheatConfig) {
  const tabSwitchCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabSwitchCountRef.current++;
        onTabSwitch?.(tabSwitchCountRef.current);
        if (tabSwitchCountRef.current >= maxTabSwitches) {
          onMaxReached?.();
        }
      }
    };

    const handleCopy = (e: Event) => e.preventDefault();
    const handlePaste = (e: Event) => e.preventDefault();
    const handleContextMenu = (e: Event) => e.preventDefault();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("copy", handleCopy);
    document.addEventListener("paste", handlePaste);
    document.addEventListener("contextmenu", handleContextMenu);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("copy", handleCopy);
      document.removeEventListener("paste", handlePaste);
      document.removeEventListener("contextmenu", handleContextMenu);
    };
  }, [enabled, onTabSwitch, maxTabSwitches, onMaxReached]);

  return { tabSwitchCount: tabSwitchCountRef.current };
}

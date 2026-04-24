"use client";

import { useState, useEffect, useCallback } from "react";
import { useExamSessionStore } from "@/stores/exam-session.store";

export function useExamTimer(onExpire: () => void) {
  const { expiresAt, serverTimeOffset } = useExamSessionStore();
  const [remaining, setRemaining] = useState(0);

  const getServerTime = useCallback(
    () => Date.now() - serverTimeOffset,
    [serverTimeOffset],
  );

  useEffect(() => {
    const tick = () => {
      const serverNow = getServerTime();
      const ms = Math.max(0, expiresAt - serverNow);
      setRemaining(ms);

      if (ms <= 0) {
        onExpire();
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, getServerTime, onExpire]);

  const totalSeconds = Math.floor(remaining / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const formatted =
    hours > 0
      ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      : `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  return {
    remaining: totalSeconds,
    formatted,
    isWarning: totalSeconds <= 600 && totalSeconds > 300, // < 10 min
    isCritical: totalSeconds <= 300 && totalSeconds > 60, // < 5 min
    isDanger: totalSeconds <= 60, // < 1 min
  };
}

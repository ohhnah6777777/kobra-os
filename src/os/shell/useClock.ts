import { useEffect, useState } from "react";
import { useOS } from "../store";

export function useNow(intervalMs = 1000) {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function useClockText() {
  const clock = useOS((s) => s.settings.clock);
  const now = useNow(1000);
  if (!now) return { time: "", date: "" };
  const time = now.toLocaleTimeString([], {
    hour: clock.h24 ? "2-digit" : "numeric",
    minute: "2-digit",
    second: clock.seconds ? "2-digit" : undefined,
    hour12: !clock.h24,
  });
  const date = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" });
  return { time, date, showDate: clock.date };
}

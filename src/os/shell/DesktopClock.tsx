import { useOS } from "../store";
import { useNow } from "./useClock";

/** Top-center clock that sits where the old watermark was. */
export function DesktopClock() {
  const now = useNow(1000);
  const h24 = useOS((s) => s.settings.clock.h24);
  const left = useOS((s) => s.settings.barPosition === "left");
  if (!now) return null;
  const time = now.toLocaleTimeString([], { hour: h24 ? "2-digit" : "numeric", minute: "2-digit", hour12: !h24 }).replace(/\s?[AP]M/i, "");
  return (
    <div className={`pointer-events-none absolute top-5 z-[1] -translate-x-1/2 select-none text-center text-lock-ink [text-shadow:0_2px_14px_oklch(0_0_0/55%)] ${left ? "left-[calc(50%+30px)]" : "left-1/2"}`} suppressHydrationWarning>
      <div className="font-wide text-[11px] uppercase tracking-[0.55em]">{now.toLocaleDateString("en-US", { weekday: "long" })}</div>
      <div className="mt-1 font-sans text-4xl font-bold tabular-nums tracking-tight sm:text-5xl">{time}</div>
      <div className="mt-1 font-wide text-[10px] uppercase tracking-[0.35em] opacity-80">{now.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</div>
    </div>
  );
}

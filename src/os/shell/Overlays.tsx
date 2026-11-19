import { useEffect, useState } from "react";
import { Power, Sparkles, X } from "lucide-react";
import { CHANGELOG, OS_VERSION } from "../config";
import { useOS } from "../store";

export function SleepOverlay() {
  useEffect(() => {
    const armedAt = Date.now() + 600;
    const wake = () => { if (Date.now() > armedAt) useOS.getState().setPhase("desktop"); };
    window.addEventListener("keydown", wake);
    window.addEventListener("pointermove", wake);
    window.addEventListener("pointerdown", wake);
    return () => {
      window.removeEventListener("keydown", wake);
      window.removeEventListener("pointermove", wake);
      window.removeEventListener("pointerdown", wake);
    };
  }, []);
  return <div className="animate-fade fixed inset-0 z-[9900] cursor-none bg-blackout" />;
}

export function RestartOverlay({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div className="animate-fade fixed inset-0 z-[9900] grid place-items-center bg-blackout">
      <div className="flex flex-col items-center gap-5">
        <div className="size-8 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" />
        <div className="font-mono text-sm text-muted-foreground">Restarting...</div>
      </div>
    </div>
  );
}

export function ShutdownOverlay({ onPower }: { onPower: () => void }) {
  return (
    <div className="animate-fade fixed inset-0 z-[9900] grid place-items-center bg-blackout">
      <div className="flex flex-col items-center gap-4 text-center">
        <button onClick={onPower} aria-label="Power on" className="grid size-16 place-items-center rounded-full border border-hairline-strong text-muted-foreground transition hover:text-primary hover:glow">
          <Power className="size-7" />
        </button>
        <div className="font-mono text-xs text-muted-foreground">kobra os is shut down</div>
      </div>
    </div>
  );
}

export function UpdatingOverlay({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setPct((p) => Math.min(100, p + 4 + Math.random() * 9)), 160);
    return () => clearInterval(t);
  }, []);
  useEffect(() => {
    if (pct >= 100) {
      const t = setTimeout(onDone, 500);
      return () => clearTimeout(t);
    }
  }, [pct, onDone]);
  return (
    <div className="fixed inset-0 z-[9900] grid place-items-center bg-blackout">
      <div className="flex w-72 flex-col items-center gap-6">
        <div className="animate-glow text-2xl font-semibold text-primary">Updating kobra os...</div>
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted"><div className="h-full bg-primary glow transition-all" style={{ width: `${pct}%` }} /></div>
        <div className="font-mono text-xs text-muted-foreground">installing v{OS_VERSION} · do not close this tab</div>
      </div>
    </div>
  );
}

export function ChangelogModal({ onClose }: { onClose: () => void }) {
  const entry = CHANGELOG[0]!;
  return (
    <div className="fixed inset-0 z-[9600] grid place-items-center bg-background/50 backdrop-blur-sm" onPointerDown={onClose}>
      <div className="glass-strong window-shadow animate-pop w-[min(440px,92vw)] rounded-2xl p-6" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-xl bg-primary/15 text-primary"><Sparkles className="size-5" /></div>
            <div>
              <div className="text-lg font-semibold">kobra os v{entry.version}</div>
              <div className="text-xs text-muted-foreground">Updated · {entry.date}</div>
            </div>
          </div>
          <button className="os-btn size-8 p-0" onClick={onClose} aria-label="Close"><X className="size-4" /></button>
        </div>
        <ul className="mt-5 space-y-2.5 text-sm">
          {entry.notes.map((n) => (
            <li key={n} className="flex gap-2.5"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-primary" />{n}</li>
          ))}
        </ul>
        <button className="os-btn os-btn-primary mt-6 w-full" onClick={onClose}>Continue</button>
      </div>
    </div>
  );
}

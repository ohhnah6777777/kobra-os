import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Lock, Moon, Power, RotateCcw, Search, Settings2 } from "lucide-react";
import { APPS } from "../apps";
import { useOS } from "../store";
import { lockScreen, powerAction } from "../session";
import { openAppMenu } from "./appMenu";

export function Launcher() {
  const open = useOS((s) => s.launcherOpen);
  const user = useOS((s) => s.user);
  const taskbar = useOS((s) => s.settings.taskbar);
  const syncStatus = useOS((s) => s.syncStatus);
  const { openApp, setLauncher } = useOS.getState();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQ("");
    setSel(0);
    setTimeout(() => inputRef.current?.focus(), 30);
    const onDown = (e: PointerEvent) => {
      const t = e.target as HTMLElement;
      if (ref.current?.contains(t) || t.closest("[data-launcher-toggle]")) return;
      setLauncher(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setLauncher(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, setLauncher]);

  const results = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return APPS;
    return APPS.filter((a) => (a.name + " " + a.id + " " + (a.keywords ?? "")).toLowerCase().includes(s));
  }, [q]);

  if (!open) return null;

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight" || e.key === "ArrowDown") { e.preventDefault(); setSel((v) => Math.min(v + 1, results.length - 1)); }
    if (e.key === "ArrowLeft" || e.key === "ArrowUp") { e.preventDefault(); setSel((v) => Math.max(v - 1, 0)); }
    if (e.key === "Enter") {
      const app = results[sel];
      if (app) openApp(app.id);
      else if (q.trim()) openApp("browser", { url: q.trim() });
    }
  };

  const name = user?.kind === "account" ? user.name : "Guest";
  const pos = taskbar === "dock" ? "bottom-[92px] left-1/2 -translate-x-1/2" : "bottom-[60px] left-2";

  return (
    <div ref={ref} className={`glass-strong window-shadow animate-pop fixed z-[8000] w-[min(560px,94vw)] rounded-2xl p-4 ${pos}`}>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => { setQ(e.target.value); setSel(0); }}
          onKeyDown={onKeyDown}
          placeholder="Search apps or the web"
          className="os-input h-11 rounded-xl pl-9"
        />
      </div>
      <div className="mt-4 grid max-h-[46vh] grid-cols-4 gap-1 overflow-y-auto sm:grid-cols-5">
        {results.map((a, i) => (
          <button
            key={a.id}
            onClick={() => openApp(a.id)}
            onContextMenu={(e) => openAppMenu(e, a.id)}
            onMouseEnter={() => setSel(i)}
            className={`flex flex-col items-center gap-1.5 rounded-xl p-2.5 text-center transition-colors ${sel === i ? "bg-accent" : "hover:bg-muted"}`}
          >
            <img src={a.icon} alt="" className="size-12 drop-shadow-lg" draggable={false} />
            <span className="line-clamp-1 text-xs">{a.name}</span>
          </button>
        ))}
        {results.length === 0 && q.trim() && (
          <button onClick={() => openApp("browser", { url: q.trim() })} className="col-span-full flex items-center gap-3 rounded-xl p-3 text-sm hover:bg-muted">
            <Globe className="size-5 text-primary" /> Search the web for “{q.trim()}”
          </button>
        )}
      </div>
      <div className="mt-4 flex items-center justify-between border-t border-hairline pt-3">
        <div className="flex items-center gap-2.5">
          <div className="grid size-8 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{name[0]?.toUpperCase()}</div>
          <div className="leading-tight">
            <div className="text-sm font-medium">{name}</div>
            <div className="text-[11px] text-muted-foreground">{user?.kind === "account" ? (syncStatus === "error" ? "Sync paused" : syncStatus === "syncing" ? "Syncing…" : "Synced") : "Guest session · saved on this device"}</div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button title="Settings" className="os-btn size-9 p-0" onClick={() => openApp("settings")}><Settings2 className="size-4" /></button>
          <button title="Lock" className="os-btn size-9 p-0" onClick={() => void lockScreen()}><Lock className="size-4" /></button>
          <button title="Sleep" className="os-btn size-9 p-0" onClick={() => void powerAction("sleep")}><Moon className="size-4" /></button>
          <button title="Restart" className="os-btn size-9 p-0" onClick={() => void powerAction("restart")}><RotateCcw className="size-4" /></button>
          <button title="Shut Down" className="os-btn os-btn-danger size-9 p-0" onClick={() => void powerAction("shutdown")}><Power className="size-4" /></button>
        </div>
      </div>
    </div>
  );
}

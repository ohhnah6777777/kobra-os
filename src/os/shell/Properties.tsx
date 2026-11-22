import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { appById } from "../apps";
import { OS_VERSION } from "../config";
import { useOS } from "../store";
import { useProps } from "./appMenu";

/** Small card that floats above the app icon; nothing else on screen is dimmed or blocked. */
export function PropertiesDialog() {
  const { app, anchor, set } = useProps();
  const pinned = useOS((s) => (app ? s.settings.pinned.includes(app) : false));
  const onDesk = useOS((s) => (app ? s.settings.desktopIcons.some((d) => d.kind === "app" && d.ref === app) : false));
  const running = useOS((s) => (app ? s.windows.filter((w) => w.app === app).length : 0));
  const card = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const meta = app ? appById(app) : undefined;

  useEffect(() => {
    if (!app) return;
    const esc = (e: KeyboardEvent) => e.key === "Escape" && set(null);
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [app, set]);

  useEffect(() => {
    const el = card.current;
    if (!el || !app) return;
    const w = el.offsetWidth, h = el.offsetHeight;
    const a = anchor ?? { x: window.innerWidth / 2, y: window.innerHeight / 2 + h / 2 };
    const left = Math.max(8, Math.min(window.innerWidth - w - 8, a.x - w / 2));
    const above = a.y - h - 14;
    setPos({ left, top: above > 8 ? above : Math.min(window.innerHeight - h - 8, a.y + 70) });
  }, [app, anchor]);

  if (!meta) return null;
  const rows: [string, string][] = [
    ["Name", meta.name],
    ["Identifier", `kobra.app.${meta.id}`],
    ["Kind", "Pre-installed app"],
    ["Version", `kobra os v${OS_VERSION}`],
    ["Taskbar", pinned ? "Pinned" : "Not pinned"],
    ["Desktop", onDesk ? "On desktop" : "Not on desktop"],
    ["Status", running ? `Running · ${running} window${running > 1 ? "s" : ""}` : "Not running"],
  ];
  return (
    <div
      ref={card}
      role="dialog"
      aria-label={`${meta.name} properties`}
      className="glass-strong window-shadow animate-pop fixed z-[9500] w-[300px] rounded-2xl p-4"
      style={pos ? { left: pos.left, top: pos.top } : { left: -9999, top: -9999 }}
    >
      <div className="flex items-start gap-3">
        <img src={meta.icon} alt="" className="size-12" />
        <div className="min-w-0 flex-1">
          <div className="truncate font-semibold">{meta.name}</div>
          <div className="text-xs text-muted-foreground">Properties</div>
        </div>
        <button className="os-btn size-7 p-0" onClick={() => set(null)} aria-label="Close properties"><X className="size-4" /></button>
      </div>
      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs">
        {rows.map(([k, v]) => (
          <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="truncate font-mono">{v}</dd></div>
        ))}
      </dl>
      {anchor && <span className="absolute -bottom-1.5 left-1/2 size-3 -translate-x-1/2 rotate-45 border-b border-r border-hairline-strong bg-popover" style={{ left: Math.max(16, Math.min(284, anchor.x - (pos?.left ?? 0))) }} />}
    </div>
  );
}

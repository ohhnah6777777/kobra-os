import { X } from "lucide-react";
import { appById } from "../apps";
import { OS_VERSION } from "../config";
import { useOS } from "../store";
import { useProps } from "./appMenu";

export function PropertiesDialog() {
  const { app, set } = useProps();
  const pinned = useOS((s) => (app ? s.settings.pinned.includes(app) : false));
  const hidden = useOS((s) => (app ? s.settings.hiddenDesktop.includes(app) : false));
  const meta = app ? appById(app) : undefined;
  if (!meta) return null;
  const rows: [string, string][] = [
    ["Name", meta.name],
    ["Identifier", `kobra.app.${meta.id}`],
    ["Kind", "Pre-installed application"],
    ["Version", `bundled with kobra os v${OS_VERSION}`],
    ["Taskbar", pinned ? "Pinned" : "Not pinned"],
    ["Desktop", hidden ? "Hidden" : "Visible"],
  ];
  return (
    <div className="fixed inset-0 z-[9500] grid place-items-center bg-background/40 backdrop-blur-sm" onPointerDown={() => set(null)}>
      <div className="glass-strong window-shadow animate-pop w-[360px] rounded-2xl p-5" onPointerDown={(e) => e.stopPropagation()}>
        <div className="flex items-start gap-4">
          <img src={meta.icon} alt="" className="size-16" />
          <div className="flex-1">
            <div className="text-lg font-semibold">{meta.name}</div>
            <div className="text-xs text-muted-foreground">Properties</div>
          </div>
          <button className="os-btn size-8 p-0" onClick={() => set(null)} aria-label="Close"><X className="size-4" /></button>
        </div>
        <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents"><dt className="text-muted-foreground">{k}</dt><dd className="font-mono text-xs leading-5">{v}</dd></div>
          ))}
        </dl>
      </div>
    </div>
  );
}

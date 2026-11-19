import { useState } from "react";
import { APPS } from "../apps";
import { useOS } from "../store";
import { openAppMenu } from "./appMenu";

export function DesktopIcons() {
  const hidden = useOS((s) => s.settings.hiddenDesktop);
  const [sel, setSel] = useState<string | null>(null);
  const apps = APPS.filter((a) => !hidden.includes(a.id));
  return (
    <div className="absolute left-3 top-3 z-[1] grid max-h-[calc(100vh-110px)] grid-flow-col grid-rows-[repeat(auto-fill,92px)] gap-1" onPointerDown={() => setSel(null)}>
      {apps.map((a) => (
        <button
          key={a.id}
          onPointerDown={(e) => { e.stopPropagation(); setSel(a.id); }}
          onDoubleClick={() => useOS.getState().openApp(a.id)}
          onKeyDown={(e) => e.key === "Enter" && useOS.getState().openApp(a.id)}
          onContextMenu={(e) => { setSel(a.id); openAppMenu(e, a.id, { onDesktop: true }); }}
          className={`flex w-[84px] flex-col items-center gap-1 rounded-xl p-1.5 text-center outline-none transition-colors ${sel === a.id ? "bg-primary/20 ring-1 ring-primary/50" : "hover:bg-foreground/5"}`}
        >
          <img src={a.icon} alt="" className="size-12 drop-shadow-[0_6px_10px_rgba(0,0,0,0.45)]" draggable={false} />
          <span className="line-clamp-2 text-[11px] font-medium leading-tight [text-shadow:0_1px_3px_var(--background)]">{a.name}</span>
        </button>
      ))}
    </div>
  );
}

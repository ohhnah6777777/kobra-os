import { memo, useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, Minus, X } from "lucide-react";
import { appById } from "../apps";
import { AppHost } from "../AppHost";
import { useOS, type Win } from "../store";
import { winRect, insets } from "./layout";

type Drag =
  | { kind: "move"; sx: number; sy: number; ox: number; oy: number; fromSnap: boolean }
  | { kind: "resize"; dir: string; sx: number; sy: number; o: { x: number; y: number; w: number; h: number } };

const MIN_W = 300, MIN_H = 200;
const EDGES = ["n", "s", "e", "w", "ne", "nw", "se", "sw"] as const;
const edgeClass: Record<string, string> = {
  n: "top-0 left-2 right-2 h-1.5 cursor-ns-resize",
  s: "bottom-0 left-2 right-2 h-1.5 cursor-ns-resize",
  e: "right-0 top-2 bottom-2 w-1.5 cursor-ew-resize",
  w: "left-0 top-2 bottom-2 w-1.5 cursor-ew-resize",
  ne: "right-0 top-0 size-3 cursor-nesw-resize",
  nw: "left-0 top-0 size-3 cursor-nwse-resize",
  se: "right-0 bottom-0 size-3 cursor-nwse-resize",
  sw: "left-0 bottom-0 size-3 cursor-nesw-resize",
};

export const WindowFrame = memo(function WindowFrame({ win, onSnapPreview }: { win: Win; onSnapPreview: (s: "left" | "right" | "max" | null) => void }) {
  const taskbar = useOS((s) => s.settings.taskbar);
  const barPosition = useOS((s) => s.settings.barPosition);
  const animations = useOS((s) => s.settings.animations);
  const bar = { taskbar, barPosition };
  const focused = useOS((s) => s.zTop === win.z);
  const { focusWin, updateWin, closeWin, minimizeWin, toggleMax } = useOS.getState();
  const [vp, setVp] = useState({ w: 1280, h: 800 });
  const drag = useRef<Drag | null>(null);
  const snapRef = useRef<"left" | "right" | "max" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [closing, setClosing] = useState(false);
  const meta = appById(win.app);

  useEffect(() => {
    const r = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    r();
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);

  const rect = winRect(win, vp.w, vp.h, bar);
  const tiled = win.maximized || !!win.snap;

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    if (d.kind === "move") {
      let ox = d.ox, oy = d.oy;
      if (d.fromSnap) {
        // unsnap: keep cursor proportionally inside the restored window
        ox = e.clientX - win.w / 2;
        oy = 0;
        d.ox = ox; d.oy = oy; d.sx = e.clientX; d.sy = e.clientY; d.fromSnap = false;
        updateWin(win.id, { snap: null, maximized: false, x: ox, y: oy });
        return;
      }
      const nx = Math.min(Math.max(ox + e.clientX - d.sx, -win.w + 120), window.innerWidth - 120);
      const ny = Math.min(Math.max(oy + e.clientY - d.sy, 0), window.innerHeight - insets(bar).bottom - 40);
      updateWin(win.id, { x: nx, y: ny });
      const s = e.clientX <= insets(bar).left + 6 ? "left" : e.clientX >= window.innerWidth - 6 ? "right" : e.clientY <= 4 ? "max" : null;
      if (s !== snapRef.current) { snapRef.current = s; onSnapPreview(s); }
    } else {
      const { dir, sx, sy, o } = d;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      let { x, y, w, h } = o;
      if (dir.includes("e")) w = Math.max(MIN_W, o.w + dx);
      if (dir.includes("s")) h = Math.max(MIN_H, o.h + dy);
      if (dir.includes("w")) { w = Math.max(MIN_W, o.w - dx); x = o.x + (o.w - w); }
      if (dir.includes("n")) { h = Math.max(MIN_H, o.h - dy); y = Math.max(0, o.y + (o.h - h)); }
      updateWin(win.id, { x, y, w, h });
    }
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    if (d?.kind === "move" && snapRef.current) {
      const s = snapRef.current;
      updateWin(win.id, s === "max" ? { maximized: true, snap: null } : { snap: s, maximized: false });
    }
    snapRef.current = null;
    onSnapPreview(null);
  };

  const startMove = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    focusWin(win.id);
    drag.current = { kind: "move", sx: e.clientX, sy: e.clientY, ox: rect.x, oy: rect.y, fromSnap: tiled };
    setDragging(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (tiled) return;
    focusWin(win.id);
    drag.current = { kind: "resize", dir, sx: e.clientX, sy: e.clientY, o: { x: win.x, y: win.y, w: win.w, h: win.h } };
    setDragging(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const close = () => {
    if (!animations) { closeWin(win.id); return; }
    setClosing(true);
    setTimeout(() => closeWin(win.id), 140);
  };

  return (
    <div
      data-window={win.id}
      onPointerDownCapture={() => focusWin(win.id)}
      className={`glass window-shadow absolute flex flex-col overflow-hidden ${tiled ? "rounded-none" : "rounded-xl"} ${focused ? "border-hairline-strong" : "opacity-[0.97]"} ${closing ? "scale-95 opacity-0" : animations ? "animate-pop" : ""} ${dragging || !animations ? "" : "transition-[left,top,width,height,opacity,transform] duration-200 ease-out"}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: win.z, display: win.minimized ? "none" : undefined }}
    >
      <div
        onPointerDown={startMove}
        onDoubleClick={() => toggleMax(win.id)}
        className={`flex h-10 shrink-0 select-none items-center gap-3 border-b border-hairline px-3 ${focused ? "bg-card" : "bg-muted"}`}
      >
        <div className="flex items-center gap-2">
          <button aria-label="Close" onClick={close} className="group grid size-3.5 place-items-center rounded-full bg-destructive/90 hover:bg-destructive">
            <X className="size-2.5 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} />
          </button>
          <button aria-label="Minimize" onClick={() => minimizeWin(win.id)} className="group grid size-3.5 place-items-center rounded-full bg-warning/90 hover:bg-warning">
            <Minus className="size-2.5 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} />
          </button>
          <button aria-label="Maximize" onClick={() => toggleMax(win.id)} className="group grid size-3.5 place-items-center rounded-full bg-success/90 hover:bg-success">
            {win.maximized ? <Minimize2 className="size-2 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} /> : <Maximize2 className="size-2 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} />}
          </button>
        </div>
        <div className="pointer-events-none flex min-w-0 flex-1 items-center justify-center gap-2 pr-14 text-xs font-medium text-muted-foreground">
          {meta && <img src={meta.icon} alt="" className="size-4" draggable={false} />}
          <span className="truncate">{win.title}</span>
        </div>
      </div>
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <div className="h-full w-full overflow-hidden"><AppHost win={win} /></div>
        {dragging && <div className="absolute inset-0" />}
      </div>
      {!tiled && EDGES.map((d) => <div key={d} onPointerDown={startResize(d)} className={`absolute z-10 ${edgeClass[d]}`} />)}
    </div>
  );
});

export function SnapPreview({ side }: { side: "left" | "right" | "max" | null }) {
  const taskbar = useOS((s) => s.settings.taskbar);
  const barPosition = useOS((s) => s.settings.barPosition);
  if (!side) return null;
  const { left, bottom } = insets({ taskbar, barPosition });
  const half = `calc((100% - ${left}px) / 2 - 12px)`;
  const style =
    side === "max" ? { left: left + 8, top: 8, right: 8, bottom: bottom + 8 } : side === "left" ? { left: left + 8, top: 8, width: half, bottom: bottom + 8 } : { right: 8, top: 8, width: half, bottom: bottom + 8 };
  return <div className="pointer-events-none fixed z-[9] rounded-2xl border border-primary/50 bg-primary/10 backdrop-blur-sm transition-all duration-150 glow" style={style} />;
}

import { memo, useEffect, useRef, useState } from "react";
import { Copy, Maximize2, Minimize2, Minus, Square, X } from "lucide-react";
import { appById } from "../apps";
import { AppHost } from "../AppHost";
import { useOS, type Win } from "../store";
import { winRect, insets, tiledInsets, workArea } from "./layout";
import { SnapMaximizeButton, zoneToBounds } from "./SnapLayouts";

type Drag =
  | { kind: "move"; sx: number; sy: number; ox: number; oy: number; fromSnap: boolean; dx: number; dy: number }
  | { kind: "resize"; dir: string; sx: number; sy: number; o: { x: number; y: number; w: number; h: number }; r: { x: number; y: number; w: number; h: number } };

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
  const motion = useOS((s) => s.settings.uiMotion ?? true);
  const titleBar = useOS((s) => s.settings.titleBar ?? "windows");
  const bar = { taskbar, barPosition };
  const focused = useOS((s) => s.zTop === win.z);
  const { focusWin, updateWin, closeWin, minimizeWin, toggleMax } = useOS.getState();
  const [vp, setVp] = useState({ w: typeof window !== "undefined" ? window.innerWidth : 1280, h: typeof window !== "undefined" ? window.innerHeight : 800 });
  const el = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const snapRef = useRef<"left" | "right" | "max" | null>(null);
  const [dragging, setDragging] = useState(false);
  const [leaving, setLeaving] = useState<"close" | "min" | null>(null);
  const [entered, setEntered] = useState(false);
  const wasMin = useRef(win.minimized);
  const meta = appById(win.app);

  useEffect(() => {
    const r = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", r);
    return () => window.removeEventListener("resize", r);
  }, []);
  // Replay the open animation when a window is restored from the dock.
  useEffect(() => {
    if (wasMin.current && !win.minimized) { setEntered(false); setLeaving(null); }
    wasMin.current = win.minimized;
  }, [win.minimized]);

  const rect = winRect(win, vp.w, vp.h, bar);
  const tiled = win.maximized || !!win.snap;

  /* Dragging writes straight to the element (GPU transform) and only commits to the store on release. */
  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    const node = el.current;
    if (!d || !node) return;
    if (d.kind === "move") {
      if (d.fromSnap) {
        const ox = e.clientX - win.w / 2;
        d.ox = ox; d.oy = 0; d.sx = e.clientX; d.sy = e.clientY; d.fromSnap = false; d.dx = 0; d.dy = 0;
        updateWin(win.id, { snap: null, maximized: false, x: ox, y: 0 });
        return;
      }
      const nx = Math.min(Math.max(d.ox + e.clientX - d.sx, -win.w + 120), window.innerWidth - 120);
      const ny = Math.min(Math.max(d.oy + e.clientY - d.sy, 0), window.innerHeight - insets(bar).bottom - 40);
      d.dx = nx - d.ox; d.dy = ny - d.oy;
      node.style.transform = `translate3d(${d.dx}px, ${d.dy}px, 0)`;
      const left = tiledInsets(bar).left;
      const s = e.clientX <= left + 6 ? "left" : e.clientX >= window.innerWidth - 6 ? "right" : e.clientY <= 4 ? "max" : null;
      if (s !== snapRef.current) { snapRef.current = s; onSnapPreview(s); }
    } else {
      const { dir, sx, sy, o } = d;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      let { x, y, w, h } = o;
      if (dir.includes("e")) w = Math.max(MIN_W, o.w + dx);
      if (dir.includes("s")) h = Math.max(MIN_H, o.h + dy);
      if (dir.includes("w")) { w = Math.max(MIN_W, o.w - dx); x = o.x + (o.w - w); }
      if (dir.includes("n")) { h = Math.max(MIN_H, o.h - dy); y = Math.max(0, o.y + (o.h - h)); }
      d.r = { x, y, w, h };
      node.style.left = `${x}px`; node.style.top = `${y}px`; node.style.width = `${w}px`; node.style.height = `${h}px`;
    }
  };
  const onPointerUp = () => {
    const d = drag.current;
    drag.current = null;
    setDragging(false);
    window.removeEventListener("pointermove", onPointerMove);
    window.removeEventListener("pointerup", onPointerUp);
    if (el.current) el.current.style.transform = "";
    if (d?.kind === "move") {
      const s = snapRef.current;
      if (s) updateWin(win.id, s === "max" ? { maximized: true, snap: null } : { snap: s, maximized: false });
      else if (d.dx || d.dy) updateWin(win.id, { x: d.ox + d.dx, y: d.oy + d.dy });
    } else if (d?.kind === "resize") {
      updateWin(win.id, d.r);
    }
    snapRef.current = null;
    onSnapPreview(null);
  };

  const startMove = (e: React.PointerEvent) => {
    if (e.button !== 0 || (e.target as HTMLElement).closest("button")) return;
    focusWin(win.id);
    drag.current = { kind: "move", sx: e.clientX, sy: e.clientY, ox: rect.x, oy: rect.y, fromSnap: tiled, dx: 0, dy: 0 };
    setDragging(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };
  const startResize = (dir: string) => (e: React.PointerEvent) => {
    e.stopPropagation();
    if (tiled) return;
    focusWin(win.id);
    const o = { x: win.x, y: win.y, w: win.w, h: win.h };
    drag.current = { kind: "resize", dir, sx: e.clientX, sy: e.clientY, o, r: o };
    setDragging(true);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
  };

  const close = () => {
    if (!motion) { closeWin(win.id); return; }
    setLeaving("close");
    setTimeout(() => closeWin(win.id), 150);
  };
  const minimize = () => {
    if (!motion) { minimizeWin(win.id); return; }
    setLeaving("min");
    setTimeout(() => { minimizeWin(win.id); setLeaving(null); }, 210);
  };
  const snapTo = (zone: Parameters<typeof zoneToBounds>[0]) => {
    const b = zoneToBounds(zone, workArea(window.innerWidth, window.innerHeight, bar));
    updateWin(win.id, { ...b, maximized: false, snap: null });
    focusWin(win.id);
  };

  const anim = leaving === "close" ? "anim-close" : leaving === "min" ? "anim-min" : !entered ? "anim-window" : "";
  const ctrl = "grid h-full w-11 place-items-center text-muted-foreground transition-colors hover:bg-muted hover:text-foreground";

  return (
    <div
      ref={el}
      data-window={win.id}
      onPointerDownCapture={() => focusWin(win.id)}
      onAnimationEnd={(e) => { if (e.target === e.currentTarget && !leaving) setEntered(true); }}
      className={`glass absolute flex flex-col overflow-hidden ${win.maximized ? "rounded-none border-0" : "rounded-xl"} ${focused ? "win-focused" : "window-shadow opacity-[0.97]"} ${anim} ${dragging ? "win-dragging" : focused ? "" : "win-idle"} ${dragging || !motion ? "" : "transition-[left,top,width,height,box-shadow] duration-200 ease-out"}`}
      style={{ left: rect.x, top: rect.y, width: rect.w, height: rect.h, zIndex: win.z, display: win.minimized ? "none" : undefined }}
    >
      <div
        onPointerDown={startMove}
        onDoubleClick={() => toggleMax(win.id)}
        className={`flex h-9 shrink-0 select-none items-center gap-3 border-b border-hairline px-3 ${focused ? "bg-card" : "bg-muted"}`}
      >
        {titleBar === "windows" ? (
          <>
            <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-2 text-xs font-medium text-muted-foreground">
              {meta && <img src={meta.icon} alt="" className="app-icon size-4" draggable={false} />}
              <span className={`truncate ${focused ? "text-foreground" : ""}`}>{win.title}</span>
            </div>
            <div className="-mr-3 flex h-full items-stretch">
              <button aria-label="Minimize" onClick={minimize} className={ctrl}><Minus className="size-4" strokeWidth={1.5} /></button>
              <SnapMaximizeButton onMaximize={() => toggleMax(win.id)} onSnap={snapTo} className={ctrl}>
                {win.maximized ? <Copy className="size-3.5 -scale-x-100" strokeWidth={1.5} /> : <Square className="size-3.5" strokeWidth={1.5} />}
              </SnapMaximizeButton>
              <button aria-label="Close" onClick={close} className="grid h-full w-11 place-items-center text-muted-foreground transition-colors hover:bg-destructive hover:text-destructive-foreground"><X className="size-4" strokeWidth={1.5} /></button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <button aria-label="Close" onClick={close} className="group grid size-3.5 place-items-center rounded-full bg-destructive/90 hover:bg-destructive">
                <X className="size-2.5 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} />
              </button>
              <button aria-label="Minimize" onClick={minimize} className="group grid size-3.5 place-items-center rounded-full bg-warning/90 hover:bg-warning">
                <Minus className="size-2.5 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} />
              </button>
              <button aria-label="Maximize" onClick={() => toggleMax(win.id)} className="group grid size-3.5 place-items-center rounded-full bg-success/90 hover:bg-success">
                {win.maximized ? <Minimize2 className="size-2 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} /> : <Maximize2 className="size-2 text-primary-foreground opacity-0 group-hover:opacity-100" strokeWidth={3} />}
              </button>
            </div>
            <div className="pointer-events-none flex min-w-0 flex-1 items-center justify-center gap-2 pr-14 text-xs font-medium text-muted-foreground">
              {meta && <img src={meta.icon} alt="" className="app-icon size-4" draggable={false} />}
              <span className={`truncate ${focused ? "text-foreground" : ""}`}>{win.title}</span>
            </div>
          </>
        )}
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
  const { left, bottom } = tiledInsets({ taskbar, barPosition });
  const half = `calc((100% - ${left}px) / 2 - 12px)`;
  const style =
    side === "max" ? { left: left + 8, top: 8, right: 8, bottom: bottom + 8 } : side === "left" ? { left: left + 8, top: 8, width: half, bottom: bottom + 8 } : { right: 8, top: 8, width: half, bottom: bottom + 8 };
  return <div className="pointer-events-none fixed z-[9] rounded-2xl border border-primary/60 bg-primary/10 backdrop-blur-sm transition-all duration-150 glow" style={style} />;
}

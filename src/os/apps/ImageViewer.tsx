import { useRef, useState } from "react";
import { Maximize2, RotateCw, ZoomIn, ZoomOut } from "lucide-react";
import { baseName, useOS, type Win } from "../store";

export default function ImageViewerApp({ win }: { win: Win }) {
  const fs = useOS((s) => s.data.fs);
  const path = typeof win.props?.["path"] === "string" ? (win.props["path"] as string) : "";
  const src = typeof win.props?.["src"] === "string" ? (win.props["src"] as string) : fs[path]?.content ?? "";
  const name = path ? baseName(path) : "";
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const clamp = (z: number) => Math.min(8, Math.max(0.1, z));
  const reset = () => { setZoom(1); setRot(0); setPos({ x: 0, y: 0 }); };
  const btn = "rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground";
  return (
    <div className="flex h-full flex-col bg-blackout text-foreground">
      <div className="relative flex-1 cursor-grab touch-none overflow-hidden active:cursor-grabbing"
        onWheel={(e) => setZoom((z) => clamp(z * (e.deltaY < 0 ? 1.1 : 0.9)))}
        onDoubleClick={reset}
        onPointerDown={(e) => { e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; }}
        onPointerMove={(e) => { const d = drag.current; if (d) setPos({ x: d.px + e.clientX - d.x, y: d.py + e.clientY - d.y }); }}
        onPointerUp={() => (drag.current = null)}>
        {src ? <img src={src} alt={name} draggable={false} className="absolute left-1/2 top-1/2 max-h-full max-w-full select-none"
          style={{ transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px)) scale(${zoom}) rotate(${rot}deg)` }} />
          : <p className="grid h-full place-items-center text-sm text-muted-foreground">Open a picture from Files to view it here.</p>}
      </div>
      <div className="flex items-center justify-center gap-1 border-t border-hairline bg-card px-3 py-1.5">
        <button className={btn} onClick={() => setZoom((z) => clamp(z / 1.25))} aria-label="Zoom out"><ZoomOut className="size-4" /></button>
        <span className="w-12 text-center font-mono text-xs text-muted-foreground">{Math.round(zoom * 100)}%</span>
        <button className={btn} onClick={() => setZoom((z) => clamp(z * 1.25))} aria-label="Zoom in"><ZoomIn className="size-4" /></button>
        <button className={btn} onClick={() => setRot((r) => (r + 90) % 360)} aria-label="Rotate"><RotateCw className="size-4" /></button>
        <button className={btn} onClick={reset} aria-label="Fit"><Maximize2 className="size-4" /></button>
        {name && <span className="ml-3 max-w-[40%] truncate text-xs text-muted-foreground">{name}</span>}
      </div>
    </div>
  );
}

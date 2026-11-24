import { useEffect, useRef, useState } from "react";
import type { Rect } from "./layout";

/* Windows 11 style Snap Layouts: hover the maximize button to pick a zone. */
export type Zone = { x: number; y: number; w: number; h: number };
export type SnapLayout = { id: string; label: string; zones: Zone[] };

export const SNAP_LAYOUTS: SnapLayout[] = [
  { id: "halves", label: "Halves", zones: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }] },
  { id: "thirds", label: "Thirds", zones: [{ x: 0, y: 0, w: 1 / 3, h: 1 }, { x: 1 / 3, y: 0, w: 1 / 3, h: 1 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }] },
  { id: "wide-left", label: "Wide left", zones: [{ x: 0, y: 0, w: 2 / 3, h: 1 }, { x: 2 / 3, y: 0, w: 1 / 3, h: 1 }] },
  { id: "wide-right", label: "Wide right", zones: [{ x: 0, y: 0, w: 1 / 3, h: 1 }, { x: 1 / 3, y: 0, w: 2 / 3, h: 1 }] },
  { id: "quarters", label: "Quarters", zones: [{ x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }] },
  { id: "left-plus-stack", label: "Left + stack", zones: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }] },
];

/** Converts a fractional zone into pixel bounds inside `area`, leaving `gap` px between windows. */
export function zoneToBounds(zone: Zone, area: Rect, gap = 6): Rect {
  const x = area.x + zone.x * area.w, y = area.y + zone.y * area.h, w = zone.w * area.w, h = zone.h * area.h;
  const left = zone.x === 0 ? gap : gap / 2, top = zone.y === 0 ? gap : gap / 2;
  const right = zone.x + zone.w >= 0.999 ? gap : gap / 2, bottom = zone.y + zone.h >= 0.999 ? gap : gap / 2;
  return { x: Math.round(x + left), y: Math.round(y + top), w: Math.max(300, Math.round(w - left - right)), h: Math.max(200, Math.round(h - top - bottom)) };
}

function Flyout({ onSnap }: { onSnap: (zone: Zone) => void }) {
  const [hover, setHover] = useState<string | null>(null);
  return (
    <div className="glass-strong window-shadow anim-menu grid grid-cols-3 gap-2 rounded-2xl p-2.5" onPointerDown={(e) => e.stopPropagation()}>
      {SNAP_LAYOUTS.map((layout) => (
        <div key={layout.id} title={layout.label} className="relative h-12 w-[4.5rem] rounded-md bg-muted p-[3px]">
          {layout.zones.map((z, i) => {
            const id = `${layout.id}:${i}`;
            return (
              <button
                key={id}
                aria-label={`${layout.label} zone ${i + 1}`}
                onMouseEnter={() => setHover(id)}
                onMouseLeave={() => setHover(null)}
                onClick={(e) => { e.stopPropagation(); onSnap(z); }}
                className={`absolute rounded-[3px] border transition-colors ${hover === id ? "border-primary bg-primary/70" : "border-hairline-strong bg-foreground/15 hover:bg-foreground/25"}`}
                style={{ left: `calc(${z.x * 100}% + 3px)`, top: `calc(${z.y * 100}% + 3px)`, width: `calc(${z.w * 100}% - 6px)`, height: `calc(${z.h * 100}% - 6px)` }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** Maximize button that opens the snap layout picker after hovering ~450ms. */
export function SnapMaximizeButton({ onMaximize, onSnap, className = "", children }: { onMaximize: () => void; onSnap: (zone: Zone) => void; className?: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const show = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(true), 450); };
  const hide = () => { window.clearTimeout(timer.current); timer.current = window.setTimeout(() => setOpen(false), 180); };
  return (
    <div className="relative flex h-full" onMouseEnter={show} onMouseLeave={hide}>
      <button onClick={() => { setOpen(false); onMaximize(); }} className={className} aria-label="Maximize">{children}</button>
      {open && (
        <div className="absolute right-0 top-full z-[9500] pt-1" onMouseEnter={show}>
          <Flyout onSnap={(z) => { setOpen(false); onSnap(z); }} />
        </div>
      )}
    </div>
  );
}

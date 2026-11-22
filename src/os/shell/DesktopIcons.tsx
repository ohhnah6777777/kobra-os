import { useRef, useState } from "react";
import { create } from "zustand";
import { Gamepad2, Info, MonitorX, Play } from "lucide-react";
import { appById, type AppId } from "../apps";
import { useOS, type DesktopIcon } from "../store";
import { useMenu } from "./ContextMenu";
import { useProps } from "./appMenu";
import { moveDesktopIcon, placeOnDesktop, removeDesktopIcon } from "./desktopIcons";

function launch(icon: DesktopIcon) {
  const st = useOS.getState();
  if (icon.kind === "game") st.openApp("games", { gameId: icon.ref });
  else st.openApp(icon.ref as AppId);
}

function Icon({ icon }: { icon: DesktopIcon }) {
  const meta = icon.kind === "app" ? appById(icon.ref) : undefined;
  const name = meta?.name ?? icon.name ?? icon.ref;
  const src = meta?.icon ?? icon.icon;
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const start = useRef<{ sx: number; sy: number; moved: boolean } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    start.current = { sx: e.clientX, sy: e.clientY, moved: false };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    const dx = e.clientX - s.sx, dy = e.clientY - s.sy;
    if (!s.moved && Math.hypot(dx, dy) < 6) return;
    s.moved = true;
    setDrag({ x: icon.x + dx, y: icon.y + dy });
  };
  const onUp = () => {
    const s = start.current; start.current = null;
    if (s?.moved && drag) moveDesktopIcon(icon.id, drag);
    else if (s) launch(icon);
    setDrag(null);
  };
  const onContext = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    useMenu.getState().show(e.clientX + 4, e.clientY + 4, [
      { label: icon.kind === "game" ? "Play" : "Open", icon: icon.kind === "game" ? <Play /> : <Gamepad2 />, onSelect: () => launch(icon) },
      "sep",
      { label: icon.kind === "game" ? "Uninstall from desktop" : "Remove from desktop", icon: <MonitorX />, danger: icon.kind === "game", onSelect: () => removeDesktopIcon(icon.id) },
      ...(icon.kind === "app" ? ["sep" as const, { label: "Properties", icon: <Info />, onSelect: () => useProps.getState().set(icon.ref as AppId, { x: r.left + r.width / 2, y: r.top }) }] : []),
    ]);
  };
  const p = drag ?? icon;
  return (
    <button
      data-desktop-icon
      aria-label={name}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onContextMenu={onContext}
      className={`dock-icon group absolute flex w-[84px] touch-none flex-col items-center gap-1 rounded-xl p-1.5 text-center hover:bg-tint-paper/10 ${drag ? "z-[3] opacity-90" : "z-[1]"}`}
      style={{ left: p.x, top: p.y }}
    >
      {src ? <img src={src} alt="" draggable={false} className="size-[45px] rounded-[11px] object-cover" /> : <span className="grid size-[45px] place-items-center rounded-[11px] bg-tint-blue"><Gamepad2 className="size-6" /></span>}
      <span className="line-clamp-2 max-w-full text-[11px] font-medium leading-tight text-tint-paper [text-shadow:0_1px_3px_var(--blackout)]">{name}</span>
    </button>
  );
}

export function DesktopIcons() {
  const icons = useOS((s) => s.settings.desktopIcons);
  return <>{icons.map((i) => <Icon key={i.id} icon={i} />)}</>;
}

/* ---------- drag an app out of the taskbar onto the desktop ---------- */

type DockDrag = { app: AppId | null; x: number; y: number };
export const useDockDrag = create<DockDrag>(() => ({ app: null, x: 0, y: 0 }));

/** Returns pointer handlers for a taskbar icon; returns true from `consumeClick` when the press turned into a drag. */
export function useDockDragHandlers(app: AppId) {
  const start = useRef<{ sx: number; sy: number; dragging: boolean } | null>(null);
  const dragged = useRef(false);
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    dragged.current = false;
    start.current = { sx: e.clientX, sy: e.clientY, dragging: false };
    const move = (ev: PointerEvent) => {
      const s = start.current; if (!s) return;
      if (!s.dragging && Math.hypot(ev.clientX - s.sx, ev.clientY - s.sy) < 10) return;
      s.dragging = true;
      useDockDrag.setState({ app, x: ev.clientX, y: ev.clientY });
    };
    const up = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      const s = start.current; start.current = null;
      useDockDrag.setState({ app: null });
      if (!s?.dragging) return;
      dragged.current = true;
      const target = document.elementFromPoint(ev.clientX, ev.clientY);
      if (target?.closest("[data-dock],[data-window]")) return;
      const meta = appById(app);
      placeOnDesktop({ kind: "app", ref: app, name: meta?.name ?? app, icon: meta?.icon ?? "" }, { x: ev.clientX - 42, y: ev.clientY - 30 });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  const consumeClick = () => { const d = dragged.current; dragged.current = false; return d; };
  return { onPointerDown, consumeClick };
}

export function DockDragGhost() {
  const { app, x, y } = useDockDrag();
  const meta = app ? appById(app) : undefined;
  if (!meta) return null;
  return (
    <div className="pointer-events-none fixed z-[9800] flex w-[84px] flex-col items-center gap-1" style={{ left: x - 42, top: y - 30 }}>
      <img src={meta.icon} alt="" className="size-[45px] drop-shadow-2xl" />
      <span className="rounded-md bg-blackout/50 px-1.5 text-[11px] font-medium text-tint-paper">{meta.name}</span>
    </div>
  );
}

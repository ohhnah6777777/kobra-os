import { os, type DesktopIcon } from "../store";
import type { AppId } from "../apps";

export const ICON_CELL = 92;

/** Places an app or game on the desktop, snapping to a loose grid and avoiding the exact spot of another icon. */
export function placeOnDesktop(icon: Omit<DesktopIcon, "id" | "x" | "y">, at?: { x: number; y: number }) {
  const st = os();
  const existing = st.settings.desktopIcons;
  if (existing.some((d) => d.kind === icon.kind && d.ref === icon.ref)) {
    if (at) moveDesktopIcon(existing.find((d) => d.kind === icon.kind && d.ref === icon.ref)!.id, at);
    return;
  }
  let pos = at ?? { x: 24, y: 24 };
  if (!at) {
    const rows = Math.max(1, Math.floor((window.innerHeight - 120) / ICON_CELL));
    for (let i = 0; i < 200; i++) {
      const p = { x: 24 + Math.floor(i / rows) * ICON_CELL, y: 24 + (i % rows) * ICON_CELL };
      if (!existing.some((d) => Math.abs(d.x - p.x) < 40 && Math.abs(d.y - p.y) < 40)) { pos = p; break; }
    }
  }
  st.setSettings((s) => ({ desktopIcons: [...s.desktopIcons, { ...icon, id: `${icon.kind}:${icon.ref}`, ...clamp(pos) }] }));
}

export function moveDesktopIcon(id: string, at: { x: number; y: number }) {
  os().setSettings((s) => ({ desktopIcons: s.desktopIcons.map((d) => (d.id === id ? { ...d, ...clamp(at) } : d)) }));
}

export function removeDesktopIcon(id: string) {
  os().setSettings((s) => ({ desktopIcons: s.desktopIcons.filter((d) => d.id !== id) }));
}

export const isOnDesktop = (app: AppId) => os().settings.desktopIcons.some((d) => d.kind === "app" && d.ref === app);

function clamp(p: { x: number; y: number }) {
  return { x: Math.round(Math.max(4, Math.min(window.innerWidth - ICON_CELL, p.x))), y: Math.round(Math.max(4, Math.min(window.innerHeight - ICON_CELL - 40, p.y))) };
}

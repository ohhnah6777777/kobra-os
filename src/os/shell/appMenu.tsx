import { Info, Monitor, MonitorX, Pin, PinOff, SquareArrowOutUpRight } from "lucide-react";
import { create } from "zustand";
import { appById, type AppId } from "../apps";
import { os } from "../store";
import { useMenu, type MenuItem } from "./ContextMenu";
import { isOnDesktop, placeOnDesktop, removeDesktopIcon } from "./desktopIcons";

type Anchor = { x: number; y: number };
type PropsState = { app: AppId | null; anchor: Anchor | null; set: (a: AppId | null, anchor?: Anchor | null) => void };
export const useProps = create<PropsState>((set) => ({ app: null, anchor: null, set: (app, anchor = null) => set({ app, anchor }) }));

export function appMenuItems(app: AppId, anchor?: Anchor): MenuItem[] {
  const s = os().settings;
  const pinned = s.pinned.includes(app);
  const onDesk = isOnDesktop(app);
  const meta = appById(app);
  return [
    { label: "Open", icon: <SquareArrowOutUpRight />, onSelect: () => os().openApp(app) },
    "sep",
    { label: pinned ? "Unpin from taskbar" : "Pin to taskbar", icon: pinned ? <PinOff /> : <Pin />, onSelect: () => os().togglePin(app) },
    onDesk
      ? { label: "Remove from desktop", icon: <MonitorX />, onSelect: () => removeDesktopIcon(`app:${app}`) }
      : { label: "Pin to desktop", icon: <Monitor />, onSelect: () => placeOnDesktop({ kind: "app", ref: app, name: meta?.name ?? app, icon: meta?.icon ?? "" }) },
    "sep",
    { label: "Properties", icon: <Info />, onSelect: () => useProps.getState().set(app, anchor ?? null) },
  ];
}

/** Right-click handler for any app icon; the properties card anchors above the clicked icon. */
export function openAppMenu(e: React.MouseEvent, app: AppId) {
  e.preventDefault();
  e.stopPropagation();
  const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
  useMenu.getState().show(e.clientX + 4, e.clientY + 4, appMenuItems(app, { x: r.left + r.width / 2, y: r.top }));
}

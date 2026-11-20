import { Info, Pin, PinOff, SquareArrowOutUpRight } from "lucide-react";
import { create } from "zustand";
import type { AppId } from "../apps";
import { os } from "../store";
import { useMenu, type MenuItem } from "./ContextMenu";

export const useProps = create<{ app: AppId | null; set: (a: AppId | null) => void }>((set) => ({ app: null, set: (app) => set({ app }) }));

export function appMenuItems(app: AppId): MenuItem[] {
  const s = os().settings;
  const pinned = s.pinned.includes(app);
  return [
    { label: "Open", icon: <SquareArrowOutUpRight />, onSelect: () => os().openApp(app) },
    { label: pinned ? "Unpin from Taskbar" : "Pin to Taskbar", icon: pinned ? <PinOff /> : <Pin />, onSelect: () => os().togglePin(app) },
    "sep",
    { label: "Properties", icon: <Info />, onSelect: () => useProps.getState().set(app) },
  ];
}

export function openAppMenu(e: React.MouseEvent, app: AppId) {
  e.preventDefault();
  e.stopPropagation();
  useMenu.getState().show(e.clientX + 4, e.clientY + 4, appMenuItems(app));
}

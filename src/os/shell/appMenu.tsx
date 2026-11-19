import { EyeOff, Info, Pin, PinOff, SquareArrowOutUpRight } from "lucide-react";
import { create } from "zustand";
import type { AppId } from "../apps";
import { os } from "../store";
import { useMenu, type MenuItem } from "./ContextMenu";

export const useProps = create<{ app: AppId | null; set: (a: AppId | null) => void }>((set) => ({ app: null, set: (app) => set({ app }) }));

export function appMenuItems(app: AppId, opts: { onDesktop?: boolean } = {}): MenuItem[] {
  const s = os().settings;
  const pinned = s.pinned.includes(app);
  const hidden = s.hiddenDesktop.includes(app);
  return [
    { label: "Open", icon: <SquareArrowOutUpRight />, onSelect: () => os().openApp(app) },
    { label: pinned ? "Unpin from Taskbar" : "Pin to Taskbar", icon: pinned ? <PinOff /> : <Pin />, onSelect: () => os().togglePin(app) },
    { label: hidden ? "Show on Desktop" : "Hide from Desktop", icon: <EyeOff />, onSelect: () => os().toggleHidden(app) },
    "sep",
    { label: "Properties", icon: <Info />, onSelect: () => useProps.getState().set(app) },
  ].filter((x) => !(opts.onDesktop && x !== "sep" && typeof x === "object" && x.label === "Show on Desktop")) as MenuItem[];
}

export function openAppMenu(e: React.MouseEvent, app: AppId, opts?: { onDesktop?: boolean }) {
  e.preventDefault();
  e.stopPropagation();
  useMenu.getState().show(e.clientX + 4, e.clientY + 4, appMenuItems(app, opts));
}

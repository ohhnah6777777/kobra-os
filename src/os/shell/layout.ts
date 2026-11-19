import type { Win } from "../store";

export const reservedBottom = (taskbar: "dock" | "bar") => (taskbar === "dock" ? 84 : 52);

export type Rect = { x: number; y: number; w: number; h: number };

export function winRect(win: Win, vw: number, vh: number, taskbar: "dock" | "bar"): Rect {
  const bottom = reservedBottom(taskbar);
  const areaH = vh - bottom;
  if (win.maximized) return { x: 0, y: 0, w: vw, h: areaH };
  if (win.snap === "left") return { x: 0, y: 0, w: Math.round(vw / 2), h: areaH };
  if (win.snap === "right") return { x: Math.round(vw / 2), y: 0, w: vw - Math.round(vw / 2), h: areaH };
  return { x: win.x, y: win.y, w: win.w, h: win.h };
}

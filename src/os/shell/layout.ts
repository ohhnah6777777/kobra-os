import type { Settings, Win } from "../store";
import { maximizedBounds } from "./maximize";

type Bar = Pick<Settings, "taskbar" | "barPosition">;

/** Space the dock / bar takes up on each edge for floating windows. */
export function insets(bar: Bar) {
  const size = bar.taskbar === "dock" ? (bar.barPosition === "left" ? 58 : 60) : bar.barPosition === "left" ? 44 : 40;
  return bar.barPosition === "left" ? { left: size, bottom: 0 } : { left: 0, bottom: size };
}

/** Room reserved for maximized / snapped windows: a bottom dock floats over them, so it reserves nothing. */
export function tiledInsets(bar: Bar) {
  const i = insets(bar);
  return bar.taskbar === "dock" && bar.barPosition === "bottom" ? { left: 0, bottom: 0 } : i;
}

export type Rect = { x: number; y: number; w: number; h: number };

export function workArea(vw: number, vh: number, bar: Bar): Rect {
  const { left, bottom } = tiledInsets(bar);
  return maximizedBounds(vw, vh, { leftInset: left, bottomInset: bottom });
}

export function winRect(win: Win, vw: number, vh: number, bar: Bar): Rect {
  const area = workArea(vw, vh, bar);
  if (win.maximized) return area;
  if (win.snap === "left") return { x: area.x, y: 0, w: Math.round(area.w / 2), h: area.h };
  if (win.snap === "right") return { x: area.x + Math.round(area.w / 2), y: 0, w: area.w - Math.round(area.w / 2), h: area.h };
  return { x: win.x, y: win.y, w: win.w, h: win.h };
}

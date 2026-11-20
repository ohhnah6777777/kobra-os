import type { Settings, Win } from "../store";

type Bar = Pick<Settings, "taskbar" | "barPosition">;

/** Space the dock / bar takes up on each edge, so windows never sit under it. */
export function insets(bar: Bar) {
  // Dock: 36px icons + padding + 8px gap from the edge. Bar: fixed 40px (44px wide when vertical).
  const size = bar.taskbar === "dock" ? (bar.barPosition === "left" ? 58 : 60) : bar.barPosition === "left" ? 44 : 40;
  return bar.barPosition === "left" ? { left: size, bottom: 0 } : { left: 0, bottom: size };
}

export type Rect = { x: number; y: number; w: number; h: number };

export function winRect(win: Win, vw: number, vh: number, bar: Bar): Rect {
  const { left, bottom } = insets(bar);
  const areaW = vw - left;
  const areaH = vh - bottom;
  if (win.maximized) return { x: left, y: 0, w: areaW, h: areaH };
  if (win.snap === "left") return { x: left, y: 0, w: Math.round(areaW / 2), h: areaH };
  if (win.snap === "right") return { x: left + Math.round(areaW / 2), y: 0, w: areaW - Math.round(areaW / 2), h: areaH };
  return { x: win.x, y: win.y, w: win.w, h: win.h };
}

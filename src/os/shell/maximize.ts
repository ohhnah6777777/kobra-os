export type Bounds = { x: number; y: number; w: number; h: number };

/**
 * Usable screen for maximized / snapped windows. A bottom dock reserves nothing: it floats over the
 * window as a compact pill, so the window runs to the very bottom edge. Only a left dock or a full
 * Windows-style bar reserves room.
 */
export function maximizedBounds(vw: number, vh: number, opts: { topInset?: number; leftInset?: number; bottomInset?: number } = {}): Bounds {
  const top = opts.topInset ?? 0;
  const left = opts.leftInset ?? 0;
  const bottom = opts.bottomInset ?? 0;
  return { x: left, y: top, w: Math.max(0, vw - left), h: Math.max(0, vh - top - bottom) };
}

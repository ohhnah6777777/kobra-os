/** The four stock video wallpapers. First-time visitors get one of them at random (1 in 4). */
export const STOCK_WALLPAPER_IDS = ["snowy", "blackhole", "tomnook", "celestial"] as const;
export type StockWallpaperId = (typeof STOCK_WALLPAPER_IDS)[number];

export const FIRST_VISIT_KEY = "kobra.wallpaper.initialized";

type KV = Pick<Storage, "getItem" | "setItem">;

/** Unbiased-enough pick from crypto when available. Returns an index 0..n-1. */
function randomIndex(n: number): number {
  try {
    return crypto.getRandomValues(new Uint32Array(1))[0]! % n;
  } catch {
    return Math.floor(Math.random() * n);
  }
}

/**
 * Returns a random stock wallpaper the very first time this device visits, and remembers that it did.
 * Later visits return null so the caller keeps its normal default (saved settings always win anyway).
 */
export function pickFirstVisitWallpaper(storage: KV | undefined, rand: (n: number) => number = randomIndex): StockWallpaperId | null {
  try {
    if (!storage || storage.getItem(FIRST_VISIT_KEY)) return null;
    const id = STOCK_WALLPAPER_IDS[rand(STOCK_WALLPAPER_IDS.length)] ?? "snowy";
    storage.setItem(FIRST_VISIT_KEY, id);
    return id;
  } catch {
    return null;
  }
}

let cached: StockWallpaperId | undefined;
/** Default wallpaper for this page load: random on the first visit, the remembered pick afterwards. */
export function defaultWallpaper(): StockWallpaperId {
  if (cached) return cached;
  const storage = typeof window !== "undefined" ? window.localStorage : undefined;
  const fresh = pickFirstVisitWallpaper(storage);
  const remembered = storage?.getItem(FIRST_VISIT_KEY) as StockWallpaperId | null | undefined;
  cached = fresh ?? (remembered && (STOCK_WALLPAPER_IDS as readonly string[]).includes(remembered) ? remembered : "snowy");
  return cached;
}

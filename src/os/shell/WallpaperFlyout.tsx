import { useEffect } from "react";
import { create } from "zustand";
import { Check, Upload, X } from "lucide-react";
import { useOS, type Wallpaper } from "../store";
import { WALLPAPER_VIDEOS } from "./Wallpaper";

const CHOICES: { id: Wallpaper; label: string }[] = [
  { id: "snowy", label: "Snowy Campfire" },
  { id: "blackhole", label: "Black Hole" },
  { id: "tomnook", label: "Tom Nook" },
  { id: "celestial", label: "Celestial Veil" },
];

type Flyout = { open: boolean; x: number; y: number; show: (x: number, y: number) => void; hide: () => void };
export const useWallpaperFlyout = create<Flyout>((set) => ({ open: false, x: 0, y: 0, show: (x, y) => set({ open: true, x, y }), hide: () => set({ open: false }) }));

const W = 230;

/** Quick wallpaper picker that opens beside the right-click point, with a scrolling list of live previews. */
export function WallpaperFlyout() {
  const { open, x, y, hide } = useWallpaperFlyout();
  const current = useOS((s) => s.settings.wallpaper);
  const custom = useOS((s) => s.settings.customWallpaper);
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest("[data-wallpaper-flyout]")) hide(); };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && hide();
    const t = setTimeout(() => window.addEventListener("pointerdown", close), 0);
    window.addEventListener("keydown", esc);
    return () => { clearTimeout(t); window.removeEventListener("pointerdown", close); window.removeEventListener("keydown", esc); };
  }, [open, hide]);
  if (!open) return null;
  const H = Math.min(420, window.innerHeight - 24);
  const left = x + 16 + W < window.innerWidth ? x + 16 : Math.max(8, x - W - 16);
  const top = Math.max(12, Math.min(y - 40, window.innerHeight - H - 12));
  const pick = (id: Wallpaper) => useOS.getState().setSettings({ wallpaper: id });
  return (
    <div data-wallpaper-flyout className="glass-strong window-shadow animate-pop fixed z-[9100] flex flex-col rounded-2xl p-3" style={{ left, top, width: W, maxHeight: H }} onContextMenu={(e) => e.preventDefault()}>
      <div className="mb-2 flex items-center justify-between px-1">
        <span className="text-sm font-semibold">Wallpapers</span>
        <button className="rounded-full p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close wallpaper picker" onClick={hide}><X className="size-4" /></button>
      </div>
      <div className="no-scrollbar -mx-1 min-h-0 flex-1 space-y-2.5 overflow-y-auto px-1 pb-1">
        {CHOICES.map((c) => (
          <button key={c.id} onClick={() => pick(c.id)} className="block w-full text-left">
            <div className={`relative aspect-video overflow-hidden rounded-xl border-2 transition ${current === c.id ? "border-primary" : "border-transparent hover:border-hairline-strong"}`}>
              <video src={WALLPAPER_VIDEOS[c.id]} muted loop autoPlay playsInline className="size-full object-cover" />
              {current === c.id && <span className="absolute right-1.5 top-1.5 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground"><Check className="size-3" /></span>}
            </div>
            <div className="mt-1 px-0.5 text-xs text-muted-foreground">{c.label}</div>
          </button>
        ))}
        {custom && (
          <button onClick={() => pick("custom")} className="block w-full text-left">
            <div className={`relative aspect-video overflow-hidden rounded-xl border-2 ${current === "custom" ? "border-primary" : "border-transparent hover:border-hairline-strong"}`}><img src={custom} alt="" className="size-full object-cover" /></div>
            <div className="mt-1 px-0.5 text-xs text-muted-foreground">Your picture</div>
          </button>
        )}
        <button onClick={() => { hide(); useOS.getState().openApp("settings", { tab: "preferences" }); }} className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-hairline-strong py-3 text-xs text-muted-foreground hover:text-foreground">
          <Upload className="size-3.5" />Upload your own
        </button>
      </div>
    </div>
  );
}

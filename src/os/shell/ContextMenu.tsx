import { useEffect } from "react";
import { create } from "zustand";

export type MenuItem = { label: string; onSelect: () => void; danger?: boolean; icon?: React.ReactNode } | "sep";
type MenuState = { open: boolean; x: number; y: number; items: MenuItem[]; show: (x: number, y: number, items: MenuItem[]) => void; hide: () => void };

export const useMenu = create<MenuState>((set) => ({
  open: false, x: 0, y: 0, items: [],
  show: (x, y, items) => set({ open: true, x, y, items }),
  hide: () => set({ open: false }),
}));

export function ContextMenuLayer() {
  const { open, x, y, items, hide } = useMenu();
  useEffect(() => {
    if (!open) return;
    const close = () => hide();
    const t = setTimeout(() => {
      window.addEventListener("pointerdown", close);
      window.addEventListener("blur", close);
      window.addEventListener("keydown", close);
    }, 0);
    return () => {
      clearTimeout(t);
      window.removeEventListener("pointerdown", close);
      window.removeEventListener("blur", close);
      window.removeEventListener("keydown", close);
    };
  }, [open, hide]);
  if (!open) return null;
  const W = 210, H = items.length * 32;
  const left = Math.min(x, window.innerWidth - W - 8);
  const top = Math.min(y, window.innerHeight - H - 16);
  return (
    <div
      className="glass-strong window-shadow animate-pop fixed z-[9000] rounded-xl p-1 text-sm"
      style={{ left, top, width: W }}
      onPointerDown={(e) => e.stopPropagation()}
      onContextMenu={(e) => e.preventDefault()}
    >
      {items.map((it, i) =>
        it === "sep" ? (
          <div key={i} className="my-1 h-px bg-hairline" />
        ) : (
          <button
            key={i}
            onClick={() => { hide(); it.onSelect(); }}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left hover:bg-primary hover:text-primary-foreground ${it.danger ? "text-destructive" : ""}`}
          >
            {it.icon && <span className="size-4 opacity-80 [&>svg]:size-4">{it.icon}</span>}
            {it.label}
          </button>
        ),
      )}
    </div>
  );
}

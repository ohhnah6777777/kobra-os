import { useEffect, useRef } from "react";
import { useOS, type CursorEffect } from "../store";

const CELL = 46;

function readColor(name: string, fallback: string) {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return v || fallback;
}

/** Abstract art wallpapers drawn with SVG so they follow the accent color. */
function Art({ kind }: { kind: string }) {
  if (kind === "wave")
    return (
      <svg className="absolute inset-0 size-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="wv1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="var(--primary)" stopOpacity=".85" /><stop offset="1" stopColor="var(--chart-4)" stopOpacity=".3" /></linearGradient>
          <linearGradient id="wv2" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--chart-2)" stopOpacity=".55" /><stop offset="1" stopColor="var(--primary)" stopOpacity=".15" /></linearGradient>
          <filter id="wvb"><feGaussianBlur stdDeviation="22" /></filter>
        </defs>
        <rect width="1600" height="1000" fill="var(--obsidian)" />
        <g filter="url(#wvb)">
          <path d="M-100 620 C 250 420 520 820 860 600 S 1400 380 1750 560 L1750 1100 L-100 1100Z" fill="url(#wv1)" />
          <path d="M-100 760 C 300 600 640 940 980 760 S 1500 600 1750 720 L1750 1100 L-100 1100Z" fill="url(#wv2)" />
          <path d="M-100 380 C 260 260 600 520 900 360 S 1450 200 1750 320 L1750 420 C 1450 300 1200 520 900 470 S 300 360 -100 500Z" fill="var(--primary)" opacity=".18" />
        </g>
      </svg>
    );
  if (kind === "aurora")
    return (
      <div className="absolute inset-0 bg-obsidian">
        <div className="absolute -left-1/4 top-[-20%] h-[80%] w-[80%] rounded-full bg-primary/35 blur-[120px]" />
        <div className="absolute right-[-15%] top-[10%] h-[70%] w-[60%] rounded-full bg-chart-2/25 blur-[130px]" />
        <div className="absolute bottom-[-30%] left-[20%] h-[70%] w-[70%] rounded-full bg-chart-4/25 blur-[140px]" />
      </div>
    );
  if (kind === "dunes")
    return (
      <svg className="absolute inset-0 size-full" viewBox="0 0 1600 1000" preserveAspectRatio="xMidYMid slice" aria-hidden>
        <defs>
          <linearGradient id="dn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--obsidian)" /><stop offset="1" stopColor="var(--primary)" stopOpacity=".35" /></linearGradient>
        </defs>
        <rect width="1600" height="1000" fill="url(#dn)" />
        {[0, 1, 2, 3].map((i) => (
          <path key={i} d={`M-50 ${560 + i * 110} Q 400 ${430 + i * 120} 800 ${560 + i * 100} T 1650 ${520 + i * 115} L1650 1100 L-50 1100Z`} fill="var(--primary)" opacity={0.08 + i * 0.07} />
        ))}
      </svg>
    );
  return null;
}

export function Wallpaper() {
  const wallpaper = useOS((s) => s.settings.wallpaper);
  const custom = useOS((s) => s.settings.customWallpaper);
  const effect = useOS((s) => s.settings.cursorEffect);
  const accent = useOS((s) => s.settings.accent);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectRef = useRef<CursorEffect>(effect);
  effectRef.current = effect;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1, raf = 0;
    const mouse = { x: -9999, y: -9999, sx: -9999, sy: -9999, active: false };
    let heights = new Float32Array(0);
    let cols = 0, rows = 0;
    // strings: spring displacement per vertical line
    let strDisp = new Float32Array(0), strVel = new Float32Array(0);
    let accentColor = readColor("--primary", "oklch(0.68 0.17 250)");

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth; h = window.innerHeight;
      canvas.width = w * dpr; canvas.height = h * dpr;
      canvas.style.width = w + "px"; canvas.style.height = h + "px";
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / CELL) + 1; rows = Math.ceil(h / CELL) + 1;
      heights = new Float32Array(cols * rows);
      strDisp = new Float32Array(cols); strVel = new Float32Array(cols);
    };
    resize();

    const onMove = (e: PointerEvent) => { mouse.x = e.clientX; mouse.y = e.clientY; mouse.active = true; };
    const onLeave = () => { mouse.active = false; mouse.x = -9999; mouse.y = -9999; };
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    const colorTimer = setInterval(() => { accentColor = readColor("--primary", accentColor); }, 1000);

    const gridLine = "rgba(255,255,255,0.055)";

    const drawStaticGrid = () => {
      ctx.strokeStyle = gridLine; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= w; x += CELL) { ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, h); }
      for (let y = 0; y <= h; y += CELL) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
    };

    const frame = () => {
      raf = requestAnimationFrame(frame);
      if (document.hidden) return;
      const fx = effectRef.current;
      mouse.sx += (mouse.x - mouse.sx) * 0.18;
      mouse.sy += (mouse.y - mouse.sy) * 0.18;
      if (Math.abs(mouse.sx) > 5000) { mouse.sx = mouse.x; mouse.sy = mouse.y; }
      ctx.clearRect(0, 0, w, h);

      if (fx === "off") { drawStaticGrid(); return; }

      if (fx === "cubes") {
        drawStaticGrid();
        const R = 170;
        for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          const cx = c * CELL + CELL / 2, cy = r * CELL + CELL / 2;
          const d = Math.hypot(cx - mouse.sx, cy - mouse.sy);
          const target = mouse.active && d < R ? Math.pow(1 - d / R, 1.6) : 0;
          heights[i]! += (target - heights[i]!) * 0.12;
          const t = heights[i]!;
          if (t < 0.01) continue;
          const lift = t * 9;
          const x = c * CELL, y = r * CELL;
          // side faces
          ctx.globalAlpha = 0.5 * t;
          ctx.fillStyle = "rgba(0,0,0,0.9)";
          ctx.beginPath(); ctx.moveTo(x, y + CELL); ctx.lineTo(x + lift * 0.4, y + CELL - lift); ctx.lineTo(x + CELL + lift * 0.4, y + CELL - lift); ctx.lineTo(x + CELL, y + CELL); ctx.closePath(); ctx.fill();
          // top face
          ctx.globalAlpha = 0.07 + 0.22 * t;
          ctx.fillStyle = accentColor;
          ctx.fillRect(x + lift * 0.4 + 1, y - lift + 1, CELL - 2, CELL - 2);
          ctx.globalAlpha = 0.25 + 0.55 * t;
          ctx.strokeStyle = accentColor; ctx.lineWidth = 1;
          ctx.strokeRect(x + lift * 0.4 + 0.5, y - lift + 0.5, CELL - 1, CELL - 1);
          ctx.globalAlpha = 1;
        }
        if (mouse.active) {
          const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, 260);
          g.addColorStop(0, "rgba(255,255,255,0.06)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.fillRect(mouse.sx - 260, mouse.sy - 260, 520, 520);
        }
        return;
      }

      if (fx === "liquid") {
        const R2 = 220 * 220, strength = mouse.active ? 0.45 : 0;
        const warp = (px: number, py: number): [number, number] => {
          const dx = mouse.sx - px, dy = mouse.sy - py;
          const f = strength * Math.exp(-(dx * dx + dy * dy) / R2);
          return [px + dx * f, py + dy * f];
        };
        const step = 12;
        ctx.lineWidth = 1;
        for (let x = 0; x <= w + CELL; x += CELL) {
          ctx.beginPath();
          for (let y = -step; y <= h + step; y += step) { const [a, b] = warp(x, y); if (y === -step) ctx.moveTo(a, b); else ctx.lineTo(a, b); }
          const near = Math.abs(x - mouse.sx) < 240 && mouse.active;
          ctx.strokeStyle = near ? accentColor : gridLine; ctx.globalAlpha = near ? 0.35 : 1; ctx.stroke(); ctx.globalAlpha = 1;
        }
        for (let y = 0; y <= h + CELL; y += CELL) {
          ctx.beginPath();
          for (let x = -step; x <= w + step; x += step) { const [a, b] = warp(x, y); if (x === -step) ctx.moveTo(a, b); else ctx.lineTo(a, b); }
          const near = Math.abs(y - mouse.sy) < 240 && mouse.active;
          ctx.strokeStyle = near ? accentColor : gridLine; ctx.globalAlpha = near ? 0.35 : 1; ctx.stroke(); ctx.globalAlpha = 1;
        }
        if (mouse.active) {
          const g = ctx.createRadialGradient(mouse.sx, mouse.sy, 0, mouse.sx, mouse.sy, 200);
          g.addColorStop(0, "rgba(255,255,255,0.05)"); g.addColorStop(1, "rgba(255,255,255,0)");
          ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
        }
        return;
      }

      // strings
      ctx.strokeStyle = gridLine; ctx.lineWidth = 1; ctx.beginPath();
      for (let y = 0; y <= h; y += CELL) { ctx.moveTo(0, y + 0.5); ctx.lineTo(w, y + 0.5); }
      ctx.stroke();
      for (let c = 0; c < cols; c++) {
        const x = c * CELL;
        const dx = mouse.sx - x;
        const pull = mouse.active && Math.abs(dx) < 150 ? dx * (1 - Math.abs(dx) / 150) * 0.9 : 0;
        // spring toward pull target
        strVel[c]! += (pull - strDisp[c]!) * 0.08;
        strVel[c]! *= 0.86;
        strDisp[c]! += strVel[c]!;
        const disp = strDisp[c]!;
        const energy = Math.min(1, Math.abs(disp) / 40);
        const cy = mouse.active ? mouse.sy : h / 2;
        ctx.beginPath();
        ctx.moveTo(x + 0.5, 0);
        ctx.bezierCurveTo(x, cy - 160, x + disp * 1.25, cy - 60, x + disp, cy);
        ctx.bezierCurveTo(x + disp * 1.25, cy + 60, x, cy + 160, x + 0.5, h);
        ctx.strokeStyle = `rgba(255,255,255,${0.07 + energy * 0.55})`;
        ctx.lineWidth = 1 + energy * 0.6;
        ctx.shadowColor = "rgba(255,255,255,0.8)";
        ctx.shadowBlur = energy * 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      clearInterval(colorTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [accent]);

  return (
    <div className="fixed inset-0 overflow-hidden bg-obsidian" aria-hidden>
      {wallpaper === "custom" && custom ? (
        <img src={custom} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <Art kind={wallpaper} />
      )}
      {wallpaper === "grid" && (
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 50% 45%, color-mix(in oklab, var(--primary) 9%, transparent), transparent 60%)" }} />
      )}
      <canvas ref={canvasRef} className="absolute inset-0" style={{ opacity: wallpaper === "grid" ? 1 : 0.55 }} />
      <div className="pointer-events-none absolute inset-0 grid place-items-center">
        <span className="select-none text-[clamp(5rem,16vw,14rem)] font-bold lowercase tracking-[-0.06em] text-foreground/[0.035]">kobra</span>
      </div>
    </div>
  );
}

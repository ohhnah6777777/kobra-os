import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { GripHorizontal, Pencil, Eye } from "lucide-react";
import { useOS } from "../store";
import { describeCode, useWeather } from "../lib/weather";
import { useNow } from "./useClock";

function Draggable({ id, def, children, className = "" }: { id: string; def: { x: number; y: number }; children: React.ReactNode; className?: string }) {
  const pos = useOS((s) => s.data.widgetPos[id]);
  const [local, setLocal] = useState<{ x: number; y: number } | null>(null);
  const [vw, setVw] = useState(1280);
  useEffect(() => setVw(window.innerWidth), []);
  const p = local ?? pos ?? { x: vw - def.x, y: def.y };
  const start = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("textarea,button,input,a")) return;
    start.current = { sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    setLocal({ x: Math.max(0, Math.min(window.innerWidth - 120, s.ox + e.clientX - s.sx)), y: Math.max(0, Math.min(window.innerHeight - 140, s.oy + e.clientY - s.sy)) });
  };
  const onUp = () => {
    if (start.current && local) useOS.getState().setData((d) => ({ widgetPos: { ...d.widgetPos, [id]: local } }));
    start.current = null;
    setLocal(null);
  };
  return (
    <div onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} className={`glass window-shadow group absolute z-[2] cursor-grab touch-none select-none rounded-2xl active:cursor-grabbing ${className}`} style={{ left: p.x, top: p.y }}>
      <GripHorizontal className="absolute right-2 top-1.5 size-3.5 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
      {children}
    </div>
  );
}

function ClockWidget() {
  const now = useNow(1000);
  const h24 = useOS((s) => s.settings.clock.h24);
  const [analog, setAnalog] = useState(false);
  if (!now) return null;
  const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours() % 12;
  return (
    <Draggable id="clock" def={{ x: 260, y: 24 }} className="w-[220px] p-4">
      <button className="block w-full text-left" onDoubleClick={() => setAnalog((a) => !a)} title="Double-click to switch style">
        {analog ? (
          <svg viewBox="0 0 100 100" className="mx-auto size-32">
            <circle cx="50" cy="50" r="46" fill="none" stroke="var(--hairline-strong)" strokeWidth="1.5" />
            {Array.from({ length: 12 }, (_, i) => <line key={i} x1="50" y1="8" x2="50" y2={i % 3 ? 12 : 15} stroke="var(--muted-foreground)" strokeWidth={i % 3 ? 1 : 2} transform={`rotate(${i * 30} 50 50)`} />)}
            <line x1="50" y1="50" x2="50" y2="27" stroke="var(--foreground)" strokeWidth="3" strokeLinecap="round" transform={`rotate(${(h + m / 60) * 30} 50 50)`} />
            <line x1="50" y1="50" x2="50" y2="17" stroke="var(--foreground)" strokeWidth="2" strokeLinecap="round" transform={`rotate(${(m + s / 60) * 6} 50 50)`} />
            <line x1="50" y1="56" x2="50" y2="14" stroke="var(--primary)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${s * 6} 50 50)`} />
            <circle cx="50" cy="50" r="2.5" fill="var(--primary)" />
          </svg>
        ) : (
          <>
            <div className="font-mono text-[11px] uppercase tracking-[0.3em] text-primary">{now.toLocaleDateString([], { weekday: "long" })}</div>
            <div className="mt-1 text-4xl font-semibold tabular-nums tracking-tight">{now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: !h24 })}</div>
            <div className="mt-1 text-xs text-muted-foreground">{now.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" })}</div>
          </>
        )}
      </button>
    </Draggable>
  );
}

function WeatherWidget() {
  const { data, isLoading } = useWeather();
  const city = useOS((s) => s.settings.weatherCity);
  const d = data ? describeCode(data.current.code) : null;
  const Icon = d?.icon;
  return (
    <Draggable id="weather" def={{ x: 260, y: 180 }} className="w-[220px] p-4">
      <button className="block w-full text-left" onDoubleClick={() => useOS.getState().openApp("weather")}>
        <div className="text-xs text-muted-foreground">{city.name}</div>
        {isLoading || !data ? (
          <div className="mt-2 h-12 animate-pulse rounded-lg bg-muted" />
        ) : (
          <div className="mt-1 flex items-center justify-between">
            <div>
              <div className="text-4xl font-semibold tabular-nums">{Math.round(data.current.temp)}°</div>
              <div className="text-xs text-muted-foreground">{d?.label} · H {Math.round(data.daily[0]?.max ?? 0)}° L {Math.round(data.daily[0]?.min ?? 0)}°</div>
            </div>
            {Icon && <Icon className="size-10 text-primary" strokeWidth={1.5} />}
          </div>
        )}
      </button>
    </Draggable>
  );
}

function StickyWidget() {
  const text = useOS((s) => s.data.sticky);
  const [edit, setEdit] = useState(false);
  return (
    <Draggable id="sticky" def={{ x: 260, y: 312 }} className="w-[220px] overflow-hidden border-warning/30 bg-warning/10">
      <div className="flex items-center justify-between px-3 pt-2">
        <span className="os-label text-warning">sticky</span>
        <button className="mr-4 rounded p-1 text-muted-foreground hover:text-foreground" onClick={() => setEdit((e) => !e)} aria-label={edit ? "Preview" : "Edit"}>
          {edit ? <Eye className="size-3.5" /> : <Pencil className="size-3.5" />}
        </button>
      </div>
      {edit ? (
        <textarea
          autoFocus
          value={text}
          onChange={(e) => useOS.getState().setData({ sticky: e.target.value })}
          className="h-40 w-full resize-none bg-transparent px-3 pb-3 pt-1 font-mono text-xs outline-none"
        />
      ) : (
        <div
          onDoubleClick={() => setEdit(true)}
          className="prose-sticky h-40 overflow-auto px-3 pb-3 pt-1 text-sm [&_h1]:text-base [&_h1]:font-semibold [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-semibold [&_strong]:text-warning"
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(text, { async: false }) as string) }}
        />
      )}
    </Draggable>
  );
}

export function Widgets() {
  const w = useOS((s) => s.settings.widgets);
  return (
    <>
      {w.clock && <ClockWidget />}
      {w.weather && <WeatherWidget />}
      {w.sticky && <StickyWidget />}
    </>
  );
}

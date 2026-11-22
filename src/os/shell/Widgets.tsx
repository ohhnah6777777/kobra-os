import { useEffect, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { marked } from "marked";
import { BatteryCharging, Lock, LockOpen, Maximize2, NotebookPen, Pause, Play, RectangleHorizontal, RotateCcw, Square, StickyNote, Trash2 } from "lucide-react";
import { useOS, type WidgetId, type WidgetSize } from "../store";
import { describeCode, useWeather } from "../lib/weather";
import { APPS, appById, type AppId } from "../apps";
import { useNow } from "./useClock";
import { useMenu, type MenuItem } from "./ContextMenu";

const BOX: Record<WidgetSize, string> = { sm: "h-[104px] w-[104px]", wide: "h-[104px] w-[220px]", lg: "h-[220px] w-[220px]" };
const NEXT: Record<WidgetSize, WidgetSize> = { lg: "wide", wide: "sm", sm: "lg" };
const DEFAULT_POS: Record<WidgetId, { x: number; y: number }> = {
  clock: { x: 250, y: 56 }, weather: { x: 250, y: 290 }, sticky: { x: 250, y: 524 },
  calendar: { x: 490, y: 56 }, battery: { x: 490, y: 290 }, focus: { x: 490, y: 524 }, launcher: { x: 730, y: 56 },
};
export const WIDGET_LABELS: Record<WidgetId, string> = { clock: "Clock", weather: "Weather", sticky: "Sticky note", calendar: "Calendar", battery: "Battery", focus: "Focus timer", launcher: "Quick launch" };

function useSize(id: WidgetId): WidgetSize { return useOS((s) => s.settings.widgetSizes[id] ?? "lg"); }
function setSize(id: WidgetId, size: WidgetSize) { useOS.getState().setSettings((s) => ({ widgetSizes: { ...s.widgetSizes, [id]: size } })); }

/** iOS-style widget shell: draggable, cycles size, right-click menu. */
function Widget({ id, size, className, extra = [], children }: { id: WidgetId; size: WidgetSize; className: string; extra?: MenuItem[]; children: React.ReactNode }) {
  const pos = useOS((s) => s.data.widgetPos[id]);
  const locked = useOS((s) => s.settings.widgetLocked.includes(id));
  const [local, setLocal] = useState<{ x: number; y: number } | null>(null);
  const [vw, setVw] = useState(1280);
  useEffect(() => setVw(window.innerWidth), []);
  const def = DEFAULT_POS[id];
  const p = local ?? pos ?? { x: Math.max(8, vw - def.x), y: def.y };
  const start = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (locked || e.button !== 0 || (e.target as HTMLElement).closest("textarea,button,input,a")) return;
    start.current = { sx: e.clientX, sy: e.clientY, ox: p.x, oy: p.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current; if (!s) return;
    setLocal({ x: Math.max(0, Math.min(window.innerWidth - 104, s.ox + e.clientX - s.sx)), y: Math.max(0, Math.min(window.innerHeight - 104, s.oy + e.clientY - s.sy)) });
  };
  const onUp = () => {
    if (start.current && local) useOS.getState().setData((d) => ({ widgetPos: { ...d.widgetPos, [id]: local } }));
    start.current = null; setLocal(null);
  };
  const onContext = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    const st = useOS.getState();
    useMenu.getState().show(e.clientX, e.clientY, [
      { label: "Large square", icon: <Maximize2 />, onSelect: () => setSize(id, "lg") },
      { label: "Rectangle", icon: <RectangleHorizontal />, onSelect: () => setSize(id, "wide") },
      { label: "Small square", icon: <Square />, onSelect: () => setSize(id, "sm") },
      ...(extra.length ? ["sep" as const, ...extra] : []),
      "sep",
      { label: locked ? "Unlock position" : "Lock position", icon: locked ? <LockOpen /> : <Lock />, onSelect: () => st.setSettings((s) => ({ widgetLocked: locked ? s.widgetLocked.filter((w) => w !== id) : [...s.widgetLocked, id] })) },
      { label: "Remove widget", icon: <Trash2 />, danger: true, onSelect: () => st.setSettings((s) => ({ widgets: { ...s.widgets, [id]: false } })) },
    ]);
  };
  return (
    <div
      data-widget={id}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onContextMenu={onContext}
      className={`group absolute z-[2] touch-none select-none overflow-hidden rounded-[26px] shadow-[0_18px_40px_-12px_oklch(0_0_0/60%)] ring-1 ring-hairline-strong transition-[width,height] duration-300 ${locked ? "" : "cursor-grab active:cursor-grabbing"} ${BOX[size]} ${className}`}
      style={{ left: p.x, top: p.y }}
    >
      {children}
      <button aria-label="Change widget size" title="Change size" onClick={() => setSize(id, NEXT[size])} className="absolute bottom-1.5 right-1.5 grid size-5 place-items-center rounded-full bg-blackout/35 opacity-0 backdrop-blur transition-opacity group-hover:opacity-100">
        <RectangleHorizontal className="size-3" />
      </button>
    </div>
  );
}

function ClockWidget() {
  const size = useSize("clock");
  const now = useNow(1000);
  const h24 = useOS((s) => s.settings.clock.h24);
  if (!now) return null;
  const s = now.getSeconds(), m = now.getMinutes(), h = now.getHours() % 12;
  const time = now.toLocaleTimeString([], { hour: h24 ? "2-digit" : "numeric", minute: "2-digit", hour12: !h24 });
  return (
    <Widget id="clock" size={size} className="bg-gradient-to-br from-tint-ink to-tint-slate text-tint-paper">
      {size === "lg" ? (
        <svg viewBox="0 0 100 100" className="size-full p-3">
          <circle cx="50" cy="50" r="47" fill="var(--tint-paper)" />
          {Array.from({ length: 60 }, (_, i) => <line key={i} x1="50" y1="5" x2="50" y2={i % 5 ? 7 : 10} stroke="var(--tint-ink)" strokeOpacity={i % 5 ? 0.35 : 0.9} strokeWidth={i % 5 ? 0.6 : 1.4} transform={`rotate(${i * 6} 50 50)`} />)}
          <line x1="50" y1="50" x2="50" y2="26" stroke="var(--tint-ink)" strokeWidth="3.4" strokeLinecap="round" transform={`rotate(${(h + m / 60) * 30} 50 50)`} />
          <line x1="50" y1="50" x2="50" y2="14" stroke="var(--tint-ink)" strokeWidth="2.2" strokeLinecap="round" transform={`rotate(${(m + s / 60) * 6} 50 50)`} />
          <line x1="50" y1="58" x2="50" y2="11" stroke="var(--tint-orange)" strokeWidth="1" strokeLinecap="round" transform={`rotate(${s * 6} 50 50)`} />
          <circle cx="50" cy="50" r="2.4" fill="var(--tint-orange)" />
        </svg>
      ) : size === "wide" ? (
        <div className="flex h-full flex-col justify-center px-5">
          <div className="text-[11px] font-semibold uppercase tracking-widest text-tint-orange">{now.toLocaleDateString([], { weekday: "long" })}</div>
          <div className="text-4xl font-semibold tabular-nums tracking-tight">{time}</div>
          <div className="text-xs text-tint-gray">{now.toLocaleDateString([], { month: "long", day: "numeric" })}</div>
        </div>
      ) : (
        <div className="grid h-full place-items-center text-2xl font-semibold tabular-nums">{time.replace(/\s?[AP]M/i, "")}</div>
      )}
    </Widget>
  );
}

function WeatherWidget() {
  const size = useSize("weather");
  const { data } = useWeather();
  const city = useOS((s) => s.settings.weatherCity);
  const d = data ? describeCode(data.current.code) : null;
  const Icon = d?.icon;
  const temp = data ? `${Math.round(data.current.temp)}°` : "--";
  return (
    <Widget id="weather" size={size} className="bg-gradient-to-b from-tint-blue to-tint-cyan text-tint-paper"
      extra={[{ label: "Open Weather", icon: <Maximize2 />, onSelect: () => useOS.getState().openApp("weather") }]}>
      {size === "sm" ? (
        <div className="flex h-full flex-col items-center justify-center gap-1">{Icon && <Icon className="size-8 text-tint-yellow" />}<span className="text-2xl font-semibold">{temp}</span></div>
      ) : (
        <div className="flex h-full flex-col p-4">
          <div className="flex items-start justify-between">
            <div><div className="text-sm font-semibold">{city.name}</div><div className="text-4xl font-light leading-tight">{temp}</div></div>
            {Icon && <Icon className="size-8 text-tint-yellow drop-shadow" />}
          </div>
          <div className="text-xs font-medium">{d?.label ?? "Loading…"}{data && ` · H:${Math.round(data.daily[0]?.max ?? 0)}° L:${Math.round(data.daily[0]?.min ?? 0)}°`}</div>
          {size === "lg" && data && (
            <div className="mt-auto grid grid-cols-4 gap-1 border-t border-tint-paper/25 pt-2 text-center text-[11px]">
              {data.daily.slice(1, 5).map((day) => { const DI = describeCode(day.code).icon; return <div key={day.date} className="flex flex-col items-center gap-0.5"><span className="opacity-80">{new Date(day.date + "T12:00").toLocaleDateString([], { weekday: "short" })}</span><DI className="size-4 text-tint-yellow" /><span className="font-semibold">{Math.round(day.max)}°</span></div>; })}
            </div>
          )}
        </div>
      )}
    </Widget>
  );
}

function StickyWidget() {
  const size = useSize("sticky");
  const text = useOS((s) => s.data.sticky);
  const [edit, setEdit] = useState(false);
  return (
    <Widget id="sticky" size={size} className="bg-gradient-to-br from-tint-yellow to-tint-orange text-tint-ink"
      extra={[{ label: edit ? "Preview note" : "Edit note", icon: <NotebookPen />, onSelect: () => setEdit((v) => !v) }, { label: "Clear note", icon: <Trash2 />, onSelect: () => useOS.getState().setData({ sticky: "" }) }]}>
      {size === "sm" ? (
        <div className="flex h-full flex-col items-center justify-center gap-1"><StickyNote className="size-9" /><span className="text-[11px] font-semibold">{text.trim() ? `${text.trim().split(/\s+/).length} words` : "Empty"}</span></div>
      ) : edit && size === "lg" ? (
        <textarea autoFocus value={text} onChange={(e) => useOS.getState().setData({ sticky: e.target.value })} onBlur={() => setEdit(false)} className="size-full resize-none bg-transparent p-4 font-mono text-xs outline-none" />
      ) : (
        <div onDoubleClick={() => size === "lg" && setEdit(true)} className={`size-full overflow-hidden p-4 text-sm [&_h1]:text-base [&_h1]:font-bold [&_li]:ml-4 [&_li]:list-disc [&_strong]:font-bold ${size === "wide" ? "line-clamp-4" : ""}`}
          dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(marked.parse(text || "*Double-click to write a note*", { async: false }) as string) }} />
      )}
    </Widget>
  );
}

function CalendarWidget() {
  const size = useSize("calendar");
  const now = useNow(60000);
  if (!now) return null;
  const year = now.getFullYear(), month = now.getMonth(), today = now.getDate();
  const first = new Date(year, month, 1).getDay(), days = new Date(year, month + 1, 0).getDate();
  const cells = [...Array<null>(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const weekday = now.toLocaleDateString([], { weekday: size === "sm" ? "short" : "long" }).toUpperCase();
  return (
    <Widget id="calendar" size={size} className="bg-tint-paper text-tint-ink">
      {size === "lg" ? (
        <div className="flex h-full flex-col p-3.5">
          <div className="mb-1 text-xs font-bold uppercase text-tint-red">{now.toLocaleDateString([], { month: "long" })}</div>
          <div className="grid grid-cols-7 gap-y-0.5 text-center text-[10px]">
            {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i} className="font-semibold text-tint-gray">{d}</span>)}
            {cells.map((d, i) => <span key={i} className={`mx-auto grid size-5 place-items-center rounded-full font-medium ${d === today ? "bg-tint-red text-tint-paper" : ""}`}>{d ?? ""}</span>)}
          </div>
        </div>
      ) : size === "wide" ? (
        <div className="flex h-full items-center gap-4 px-5">
          <div><div className="text-[11px] font-bold text-tint-red">{weekday}</div><div className="text-5xl font-light leading-none">{today}</div></div>
          <div className="text-xs text-tint-gray">{now.toLocaleDateString([], { month: "long", year: "numeric" })}<br />No events today</div>
        </div>
      ) : (
        <div className="flex h-full flex-col items-center justify-center"><div className="text-[11px] font-bold text-tint-red">{weekday}</div><div className="text-4xl font-light">{today}</div></div>
      )}
    </Widget>
  );
}

type BatteryLike = { level: number; charging: boolean; addEventListener: (t: string, f: () => void) => void; removeEventListener: (t: string, f: () => void) => void };
function BatteryWidget() {
  const size = useSize("battery");
  const [b, setB] = useState<{ level: number; charging: boolean } | null>(null);
  useEffect(() => {
    const nav = navigator as Navigator & { getBattery?: () => Promise<BatteryLike> };
    let bat: BatteryLike | null = null;
    const read = () => bat && setB({ level: bat.level, charging: bat.charging });
    void nav.getBattery?.().then((x) => { bat = x; read(); x.addEventListener("levelchange", read); x.addEventListener("chargingchange", read); });
    return () => { bat?.removeEventListener("levelchange", read); bat?.removeEventListener("chargingchange", read); };
  }, []);
  const pct = b ? Math.round(b.level * 100) : null;
  const ring = (r: number) => (
    <svg viewBox="0 0 44 44" className="size-full -rotate-90">
      <circle cx="22" cy="22" r={r} fill="none" stroke="var(--tint-slate)" strokeWidth="4" />
      <circle cx="22" cy="22" r={r} fill="none" stroke={pct !== null && pct <= 20 ? "var(--tint-red)" : "var(--tint-green)"} strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * r} strokeDashoffset={2 * Math.PI * r * (1 - (pct ?? 0) / 100)} />
    </svg>
  );
  return (
    <Widget id="battery" size={size} className="bg-tint-ink text-tint-paper">
      {size === "sm" ? (
        <div className="relative size-full p-4">{ring(18)}<BatteryCharging className="absolute inset-0 m-auto size-6 text-tint-green" /></div>
      ) : (
        <div className={`flex h-full ${size === "lg" ? "flex-col justify-between p-5" : "items-center gap-4 px-5"}`}>
          <div className={`relative ${size === "lg" ? "size-24" : "size-16"}`}>{ring(18)}<BatteryCharging className="absolute inset-0 m-auto size-7 text-tint-green" /></div>
          <div><div className="text-3xl font-semibold tabular-nums">{pct === null ? "—" : `${pct}%`}</div><div className="text-xs text-tint-gray">{pct === null ? "Battery info unavailable" : b?.charging ? "Charging · This device" : "On battery · This device"}</div></div>
        </div>
      )}
    </Widget>
  );
}

function FocusWidget() {
  const size = useSize("focus");
  const [mode, setMode] = useState<25 | 5 | 15>(25);
  const [left, setLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setLeft((v) => { if (v <= 1) { setRunning(false); return 0; } return v - 1; }), 1000);
    return () => clearInterval(t);
  }, [running]);
  const pick = (m: 25 | 5 | 15) => { setMode(m); setLeft(m * 60); setRunning(false); };
  const mmss = `${String(Math.floor(left / 60)).padStart(2, "0")}:${String(left % 60).padStart(2, "0")}`;
  const toggle = <button aria-label={running ? "Pause timer" : "Start timer"} onClick={() => setRunning((r) => !r)} className="grid size-10 place-items-center rounded-full bg-tint-paper text-tint-red shadow-lg">{running ? <Pause className="size-5" /> : <Play className="size-5" />}</button>;
  return (
    <Widget id="focus" size={size} className="bg-gradient-to-br from-tint-red to-tint-orange text-tint-paper"
      extra={[{ label: "Reset timer", icon: <RotateCcw />, onSelect: () => pick(mode) }]}>
      {size === "sm" ? (
        <button className="flex size-full flex-col items-center justify-center" onClick={() => setRunning((r) => !r)}><span className="text-xl font-bold tabular-nums">{mmss}</span><span className="text-[10px] uppercase tracking-wider">{running ? "Focusing" : "Tap to start"}</span></button>
      ) : size === "wide" ? (
        <div className="flex h-full items-center justify-between px-5"><div><div className="text-[11px] font-semibold uppercase tracking-wider">{mode === 25 ? "Focus" : "Break"}</div><div className="text-4xl font-bold tabular-nums">{mmss}</div></div>{toggle}</div>
      ) : (
        <div className="flex h-full flex-col items-center justify-between p-4">
          <div className="flex gap-1">{([25, 5, 15] as const).map((m) => <button key={m} onClick={() => pick(m)} className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${mode === m ? "bg-tint-paper text-tint-red" : "bg-tint-paper/20"}`}>{m === 25 ? "Work" : m === 5 ? "Short" : "Long"}</button>)}</div>
          <div className="text-5xl font-bold tabular-nums">{mmss}</div>
          <div className="flex gap-2">{toggle}<button aria-label="Reset timer" onClick={() => pick(mode)} className="grid size-10 place-items-center rounded-full bg-tint-paper/20"><RotateCcw className="size-4" /></button></div>
        </div>
      )}
    </Widget>
  );
}

const QUICK: AppId[] = ["assistant", "browser", "movies", "messages", "games", "notes", "code", "files", "settings"];
function LauncherWidget() {
  const size = useSize("launcher");
  const list = size === "lg" ? QUICK.slice(0, 9) : size === "wide" ? QUICK.slice(0, 4) : QUICK.slice(0, 1);
  return (
    <Widget id="launcher" size={size} className="bg-gradient-to-br from-tint-indigo to-tint-purple text-tint-paper">
      <div className={`grid size-full place-items-center p-3 ${size === "lg" ? "grid-cols-3" : size === "wide" ? "grid-cols-4" : "grid-cols-1"}`}>
        {list.map((a) => { const meta = appById(a) ?? APPS[0]!; return <button key={a} title={meta.name} aria-label={`Open ${meta.name}`} onClick={() => useOS.getState().openApp(a)} className="transition-transform hover:scale-110"><img src={meta.icon} alt="" draggable={false} className={size === "sm" ? "size-14" : "size-11"} /></button>; })}
      </div>
    </Widget>
  );
}

export function Widgets() {
  const w = useOS((s) => s.settings.widgets);
  return (
    <>
      {w.clock && <ClockWidget />}
      {w.weather && <WeatherWidget />}
      {w.sticky && <StickyWidget />}
      {w.calendar && <CalendarWidget />}
      {w.battery && <BatteryWidget />}
      {w.focus && <FocusWidget />}
      {w.launcher && <LauncherWidget />}
    </>
  );
}

import { appById, type AppId } from "../apps";
import { useOS } from "../store";
import { openAppMenu } from "./appMenu";
import { SixDots } from "./SixDots";
import { useClockText } from "./useClock";

function useTaskbarApps() {
  const pinned = useOS((s) => s.settings.pinned);
  const windows = useOS((s) => s.windows);
  const running = Array.from(new Set(windows.map((w) => w.app)));
  const extra = running.filter((a) => !pinned.includes(a));
  return { pinned, extra, running };
}

function activate(app: AppId) {
  const st = useOS.getState();
  const wins = st.windows.filter((w) => w.app === app);
  if (!wins.length) {
    st.openApp(app);
    return;
  }
  const top = wins.reduce((a, b) => (a.z > b.z ? a : b));
  if (top.minimized) { st.updateWin(top.id, { minimized: false }); st.focusWin(top.id); }
  else if (top.z === st.zTop) st.minimizeWin(top.id);
  else st.focusWin(top.id);
}

function Clock({ big }: { big?: boolean }) {
  const { time, date, showDate } = useClockText();
  return (
    <div className="flex select-none flex-col items-center justify-center px-3 leading-tight" suppressHydrationWarning>
      <span className={`font-semibold tabular-nums ${big ? "text-sm" : "text-xs"}`}>{time}</span>
      {showDate && <span className="text-[10px] text-muted-foreground">{date}</span>}
    </div>
  );
}

function LauncherButton({ compact }: { compact?: boolean }) {
  const open = useOS((s) => s.launcherOpen);
  return (
    <button
      data-launcher-toggle
      aria-label="Open launcher"
      onClick={() => useOS.getState().setLauncher(!open)}
      className={`grid shrink-0 place-items-center rounded-[10px] transition-colors ${compact ? "size-8" : "size-9"} ${open ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent"}`}
    >
      <SixDots className={compact ? "size-4" : "size-[18px]"} />
    </button>
  );
}

function DockIcon({ app, running, vertical }: { app: AppId; running: boolean; vertical: boolean }) {
  const meta = appById(app)!;
  const animations = useOS((s) => s.settings.animations);
  return (
    <button
      onClick={() => activate(app)}
      onContextMenu={(e) => openAppMenu(e, app)}
      className={`group relative flex shrink-0 items-center ${vertical ? "flex-row" : "flex-col"}`}
      aria-label={meta.name}
    >
      <span className={`glass-strong pointer-events-none absolute whitespace-nowrap rounded-md px-2 py-0.5 text-xs opacity-0 group-hover:opacity-100 ${vertical ? "left-12" : "-top-8"}`}>{meta.name}</span>
      <img src={meta.icon} alt="" draggable={false} className={`size-9 ${animations ? (vertical ? "transition-transform duration-200 ease-out group-hover:translate-x-1.5 group-hover:scale-[1.15]" : "transition-transform duration-200 ease-out group-hover:-translate-y-1.5 group-hover:scale-[1.15]") : ""}`} />
      <span className={`size-1 shrink-0 rounded-full ${vertical ? "order-first mr-0.5" : "mt-0.5"} ${running ? "bg-primary" : "opacity-0"}`} />
    </button>
  );
}

function Sep({ vertical }: { vertical: boolean }) {
  return <div className={`shrink-0 bg-hairline ${vertical ? "my-0.5 h-px w-7" : "mx-0.5 mb-1.5 h-7 w-px"}`} />;
}

export function Dock() {
  const { pinned, extra, running } = useTaskbarApps();
  const center = useOS((s) => s.settings.clock.center);
  const vertical = useOS((s) => s.settings.barPosition === "left");
  return (
    <div className={`fixed z-[5000] ${vertical ? "left-2 top-1/2 -translate-y-1/2" : "bottom-2 left-1/2 -translate-x-1/2"}`}>
      <div className={`glass window-shadow no-scrollbar flex gap-1.5 rounded-[18px] ${vertical ? "max-h-[calc(100vh-16px)] flex-col items-center overflow-y-auto px-1 py-2" : "max-w-[calc(100vw-16px)] items-end overflow-x-auto px-2 pb-0.5 pt-1.5"}`}>
        <div className={vertical ? "" : "pb-1"}><LauncherButton /></div>
        <Sep vertical={vertical} />
        {pinned.map((a) => <DockIcon key={a} app={a} running={running.includes(a)} vertical={vertical} />)}
        {extra.length > 0 && <Sep vertical={vertical} />}
        {extra.map((a) => <DockIcon key={a} app={a} running vertical={vertical} />)}
        {!vertical && center && <div className="hidden items-end sm:flex"><Sep vertical={false} /><div className="pb-1.5"><Clock /></div></div>}
      </div>
    </div>
  );
}

export function WindowsBar() {
  const { pinned, extra } = useTaskbarApps();
  const windows = useOS((s) => s.windows);
  const zTop = useOS((s) => s.zTop);
  const center = useOS((s) => s.settings.clock.center);
  const vertical = useOS((s) => s.settings.barPosition === "left");
  const apps = [...pinned, ...extra];
  return (
    <div className={`glass fixed z-[5000] flex items-center gap-1 ${vertical ? "inset-y-0 left-0 w-[44px] flex-col border-y-0 border-l-0 py-2" : "inset-x-0 bottom-0 h-[40px] border-x-0 border-b-0 px-2"}`}>
      <LauncherButton compact />
      <div className={`no-scrollbar flex min-h-0 min-w-0 items-center gap-1 ${vertical ? "flex-col overflow-y-auto" : "overflow-x-auto"}`}>
        {apps.map((a) => {
          const meta = appById(a)!;
          const wins = windows.filter((w) => w.app === a);
          const active = wins.some((w) => w.z === zTop && !w.minimized);
          return (
            <button
              key={a}
              aria-label={meta.name}
              onClick={() => activate(a)}
              onContextMenu={(e) => openAppMenu(e, a)}
              className={`relative flex h-8 shrink-0 items-center gap-2 rounded-md px-1.5 text-xs transition-colors ${active ? "bg-accent" : "hover:bg-muted"}`}
            >
              <img src={meta.icon} alt="" className="size-5" draggable={false} />
              {!vertical && wins.length > 0 && <span className="hidden max-w-28 truncate md:inline">{meta.name}</span>}
              {wins.length > 0 && <span className={`absolute rounded-full bg-primary ${vertical ? "left-0 top-1/2 w-[3px] -translate-y-1/2" : "bottom-0 left-1/2 h-[3px] -translate-x-1/2"} ${vertical ? (active ? "h-4" : "h-2 opacity-60") : active ? "w-4" : "w-2 opacity-60"}`} />}
            </button>
          );
        })}
      </div>
      {!vertical && <div className={`hidden sm:block ${center ? "absolute left-1/2 -translate-x-1/2" : "ml-auto"}`}><Clock /></div>}
    </div>
  );
}

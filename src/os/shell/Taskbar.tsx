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
  if (!wins.length) return st.openApp(app);
  const top = wins.reduce((a, b) => (a.z > b.z ? a : b));
  if (top.minimized) { st.updateWin(top.id, { minimized: false }); st.focusWin(top.id); }
  else if (top.z === st.zTop) st.minimizeWin(top.id);
  else st.focusWin(top.id);
}

function Clock({ big }: { big?: boolean }) {
  const { time, date, showDate } = useClockText();
  return (
    <div className="flex select-none flex-col items-center justify-center px-3 leading-tight" suppressHydrationWarning>
      <span className={`font-semibold tabular-nums ${big ? "text-base" : "text-sm"}`}>{time}</span>
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
      className={`grid place-items-center rounded-xl transition-colors ${compact ? "size-10" : "size-12"} ${open ? "bg-primary text-primary-foreground glow" : "bg-muted hover:bg-accent text-foreground"}`}
    >
      <SixDots className={compact ? "size-5" : "size-6"} />
    </button>
  );
}

function DockIcon({ app, running }: { app: AppId; running: boolean }) {
  const meta = appById(app)!;
  return (
    <button
      onClick={() => activate(app)}
      onContextMenu={(e) => openAppMenu(e, app)}
      className="group relative flex flex-col items-center"
      aria-label={meta.name}
    >
      <span className="glass-strong pointer-events-none absolute -top-9 whitespace-nowrap rounded-md px-2 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100">{meta.name}</span>
      <img src={meta.icon} alt="" draggable={false} className="size-12 transition-transform duration-200 ease-out group-hover:-translate-y-2 group-hover:scale-[1.18] group-active:scale-95" />
      <span className={`mt-1 size-1 rounded-full transition-opacity ${running ? "bg-primary opacity-100 glow" : "opacity-0"}`} />
    </button>
  );
}

export function Dock() {
  const { pinned, extra, running } = useTaskbarApps();
  const center = useOS((s) => s.settings.clock.center);
  return (
    <div className="fixed bottom-3 left-1/2 z-[5000] -translate-x-1/2">
      <div className="glass window-shadow flex items-end gap-2 rounded-[22px] px-2.5 pb-1 pt-2">
        <div className="pb-1.5"><LauncherButton /></div>
        <div className="mx-0.5 mb-2 h-9 w-px bg-hairline" />
        {pinned.map((a) => <DockIcon key={a} app={a} running={running.includes(a)} />)}
        {center && <><div className="mx-0.5 mb-2 h-9 w-px bg-hairline" /><div className="pb-2"><Clock big /></div></>}
        {extra.length > 0 && <div className="mx-0.5 mb-2 h-9 w-px bg-hairline" />}
        {extra.map((a) => <DockIcon key={a} app={a} running />)}
        {!center && <><div className="mx-0.5 mb-2 h-9 w-px bg-hairline" /><div className="pb-2"><Clock /></div></>}
      </div>
    </div>
  );
}

export function WindowsBar() {
  const { pinned, extra } = useTaskbarApps();
  const windows = useOS((s) => s.windows);
  const zTop = useOS((s) => s.zTop);
  const center = useOS((s) => s.settings.clock.center);
  const apps = [...pinned, ...extra];
  return (
    <div className="glass fixed inset-x-0 bottom-0 z-[5000] flex h-[52px] items-center gap-1 border-x-0 border-b-0 px-2">
      <LauncherButton compact />
      <div className="flex min-w-0 items-center gap-1 overflow-x-auto">
        {apps.map((a) => {
          const meta = appById(a)!;
          const wins = windows.filter((w) => w.app === a);
          const active = wins.some((w) => w.z === zTop && !w.minimized);
          return (
            <button
              key={a}
              onClick={() => activate(a)}
              onContextMenu={(e) => openAppMenu(e, a)}
              className={`relative flex h-10 items-center gap-2 rounded-lg px-2.5 text-xs transition-colors ${active ? "bg-accent" : "hover:bg-muted"}`}
            >
              <img src={meta.icon} alt="" className="size-6" draggable={false} />
              {wins.length > 0 && <span className="hidden max-w-28 truncate md:inline">{meta.name}</span>}
              {wins.length > 0 && <span className={`absolute bottom-0.5 left-1/2 h-[3px] -translate-x-1/2 rounded-full bg-primary transition-all ${active ? "w-5" : "w-2 opacity-60"}`} />}
            </button>
          );
        })}
      </div>
      <div className={center ? "absolute left-1/2 -translate-x-1/2" : "ml-auto"}><Clock /></div>
      <button aria-label="Show desktop" title="Show desktop" onClick={() => useOS.getState().minimizeAll()} className="ml-auto h-full w-2 border-l border-hairline hover:bg-muted" />
    </div>
  );
}

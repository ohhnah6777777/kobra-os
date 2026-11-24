import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { appById } from "../apps";
import { useOS, type Win } from "../store";

export default function TaskManagerApp({ win }: { win: Win }) {
  const wins = useOS((s) => s.windows).filter((w) => w.id !== win.id);
  const { focusWin, closeWin, updateWin } = useOS.getState();
  const [mem, setMem] = useState<number | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  useEffect(() => {
    const read = () => {
      const m = (performance as unknown as { memory?: { usedJSHeapSize: number } }).memory;
      setMem(m ? Math.round(m.usedJSHeapSize / 1048576) : null);
    };
    read();
    const t = setInterval(read, 2000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="flex h-full flex-col bg-background text-foreground">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3 text-sm">
        <span className="font-semibold">Task Manager</span>
        <span className="font-mono text-xs text-tm-graph">{wins.length} running{mem != null && ` · ${mem} MB memory`}</span>
      </div>
      <div className="flex-1 overflow-y-auto">
        {wins.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">No other apps running</p>}
        {wins.map((w) => (
          <div key={w.id} onClick={() => setSel(w.id)} onDoubleClick={() => { updateWin(w.id, { minimized: false }); focusWin(w.id); }}
            className={`flex cursor-default items-center gap-3 border-b border-hairline px-4 py-2.5 text-sm ${sel === w.id ? "bg-accent" : "os-row-hover"}`}>
            {appById(w.app) && <img src={appById(w.app)!.icon} alt="" className="app-icon size-6" />}
            <div className="min-w-0 flex-1"><div className="truncate">{w.title}</div></div>
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${w.minimized ? "bg-warning/20 text-warning" : "bg-success/20 text-success"}`}>{w.minimized ? "Minimized" : "Active"}</span>
            <button onClick={(e) => { e.stopPropagation(); closeWin(w.id); }} className="rounded-full p-1 text-muted-foreground hover:bg-destructive/30 hover:text-destructive" title="End task"><X className="size-4" /></button>
          </div>
        ))}
      </div>
      <div className="flex justify-end gap-2 border-t border-hairline p-3">
        {sel && <button onClick={() => { closeWin(sel); setSel(null); }} className="os-btn os-btn-danger">End task</button>}
        {wins.length > 1 && <button onClick={() => wins.forEach((w) => closeWin(w.id))} className="os-btn">End all</button>}
      </div>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import { os, useOS, type Win } from "../store";
import { APPS } from "../apps";
import { OS_VERSION } from "../config";

const commands = ["help", "neofetch", "clear", "echo", "apps", "open", "reboot", "settings", "matrix", "date"];
const logo = `██╗  ██╗ ██████╗ ██████╗ ██████╗  █████╗
██║ ██╔╝██╔═══██╗██╔══██╗██╔══██╗██╔══██╗
█████╔╝ ██║   ██║██████╔╝██████╔╝███████║
██╔═██╗ ██║   ██║██╔══██╗██╔══██╗██╔══██║
██║  ██╗╚██████╔╝██████╔╝██║  ██║██║  ██║
╚═╝  ╚═╝ ╚═════╝ ╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═╝`;
type Entry = { command: string; output: string; neo?: boolean };
function Matrix({ exit }: { exit: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current!;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const color = getComputedStyle(canvas).color;
    let drops: number[] = [];
    const resize = () => { canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight; drops = Array.from({ length: Math.ceil(canvas.width / 16) }, () => -Math.random() * 40); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    const timer = setInterval(() => {
      ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.font = '15px "JetBrains Mono", monospace'; ctx.fillStyle = color;
      drops.forEach((y, x) => { for (let j = 0; j < 18; j++) { ctx.globalAlpha = 1 - j / 18; ctx.fillText(String.fromCharCode(0x30a0 + Math.random() * 90), x * 16, (y - j) * 18); } drops[x] = y * 18 > canvas.height + 324 ? -Math.random() * 20 : y + 1; }); ctx.globalAlpha = 1;
    }, 55);
    return () => { clearInterval(timer); observer.disconnect(); };
  }, []);
  return <div className="absolute inset-0 bg-terminal" onClick={exit}><canvas ref={ref} className="h-full w-full text-primary" /><span className="absolute bottom-4 left-4 text-xs text-muted-foreground">Any key or click to exit</span></div>;
}
export default function TerminalApp({ win }: { win: Win }) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [input, setInput] = useState(""); const [history, setHistory] = useState<string[]>([]); const [index, setIndex] = useState(0); const [matrix, setMatrix] = useState(false);
  const field = useRef<HTMLInputElement>(null); const end = useRef<HTMLDivElement>(null);
  const focused = useOS(s => s.zTop === s.windows.find(w => w.id === win.id)?.z);
  useEffect(() => { if (focused) field.current?.focus(); }, [focused, matrix]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest" }); }, [entries]);
  function run(raw: string) {
    const [cmd = "", ...args] = raw.trim().split(/\s+/); let output = ""; let neo = false;
    if (!cmd) return;
    const next = [...history, raw]; setHistory(next); setIndex(next.length); setInput("");
    switch (cmd.toLowerCase()) {
      case "clear": setEntries([]); return;
      case "help": output = "ksh · available commands\n" + commands.join("  ") + "\n\nopen <app> · launch an app\n↑ ↓ history · Tab complete · Ctrl+L clear"; break;
      case "echo": output = args.join(" "); break;
      case "date": output = new Date().toLocaleString(); break;
      case "apps": output = APPS.map(a => `${a.id.padEnd(12)} ${a.name}`).join("\n"); break;
      case "open": { const name = args.join(" ").toLowerCase(); const app = APPS.find(a => a.id === name || a.name.toLowerCase() === name); if (app) { os().openApp(app.id); output = `Opened ${app.name}`; } else output = "App not found. Use apps to list installed apps."; break; }
      case "settings": os().openApp("settings"); output = "Opened Settings"; break;
      case "reboot": os().setPhase("restarting"); output = "Restarting…"; break;
      case "matrix": setMatrix(true); break;
      case "neofetch": { neo = true; const minutes = Math.max(0, Math.floor((Date.now() - os().bootedAt) / 60000)); output = `OS: kobra os v${OS_VERSION}\nShell: ksh\nTheme: Dark Glass\nAccent: ${os().settings.accent}\nUptime: ${minutes} ${minutes === 1 ? "min" : "mins"}`; break; }
      default: output = `ksh: command not found: ${cmd}. Try help.`;
    }
    setEntries(e => [...e, { command: raw, output, neo }]);
  }
  return <div className="relative flex h-full flex-col bg-terminal p-5 font-mono text-sm text-terminal-foreground" tabIndex={0} onClick={() => field.current?.focus()} onKeyDown={e => { if (matrix) { e.preventDefault(); setMatrix(false); return; } if (e.ctrlKey && e.key.toLowerCase() === "l") { e.preventDefault(); setEntries([]); } }}>
    <div className="min-h-0 flex-1 overflow-auto"><p className="mb-5 text-xs text-muted-foreground">kobra os / ksh — type help to explore</p>{entries.map((entry, i) => <div key={i} className="mb-4"><div><span className="text-primary">kobra@os:~$</span> {entry.command}</div>{entry.neo && <pre className="my-3 text-primary text-[10px] leading-tight sm:text-xs">{logo}</pre>}<pre className="whitespace-pre-wrap break-words font-mono leading-relaxed">{entry.output}</pre></div>)}<form className="flex items-center gap-2" onSubmit={e => { e.preventDefault(); run(input); }}><label htmlFor={`shell-${win.id}`} className="shrink-0 text-primary">kobra@os:~$</label><input id={`shell-${win.id}`} ref={field} value={input} autoComplete="off" spellCheck={false} className="min-w-0 flex-1 bg-transparent outline-none" onChange={e => setInput(e.target.value)} onKeyDown={e => { if (e.key === "ArrowUp" || e.key === "ArrowDown") { e.preventDefault(); const n = Math.max(0, Math.min(history.length, index + (e.key === "ArrowUp" ? -1 : 1))); setIndex(n); setInput(history[n] ?? ""); } if (e.key === "Tab") { e.preventDefault(); const candidates = input.startsWith("open ") ? APPS.map(a => `open ${a.id}`) : commands; const matches = candidates.filter(c => c.startsWith(input)); if (matches.length === 1) setInput(matches[0]!); else if (matches.length) setEntries(v => [...v, { command: input, output: matches.join("  ") }]); } }} /></form><div ref={end} /></div>{matrix && <Matrix exit={() => setMatrix(false)} />}
  </div>;
}

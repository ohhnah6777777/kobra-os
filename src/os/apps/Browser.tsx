import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Plus, X, ExternalLink, Globe, Star, History, Lock, EllipsisVertical, Pencil, ChevronDown, Info, Trash2 } from "lucide-react";
import type { Win } from "../store";
import { useOS } from "../store";
import { proxify, ensureScramjet } from "../lib/proxy";

type Tab = { id: number; history: string[]; index: number };
type Shortcut = { name: string; url: string };
const LOGO = [["k", "text-tint-blue"], ["o", "text-tint-red"], ["b", "text-tint-yellow"], ["r", "text-tint-blue"], ["a", "text-tint-green"]] as const;

function destination(input: string): string {
  const value = input.trim();
  if (!value) return "";
  try { const u = new URL(value.includes("://") ? value : `https://${value}`); if (["http:", "https:"].includes(u.protocol) && !/\s/.test(value) && (u.hostname.includes(".") || u.hostname === "localhost")) return u.href; } catch { /* Search instead. */ }
  return `https://www.google.com/search?igu=1&q=${encodeURIComponent(value)}`;
}
function hostname(url: string) { try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "New Tab"; } }
const favicon = (url: string) => `https://www.google.com/s2/favicons?domain=${hostname(url)}&sz=64`;
function load<T>(key: string, fallback: T, ok: (v: unknown) => v is T): T { try { const v: unknown = JSON.parse(localStorage.getItem(key) ?? "null"); return ok(v) ? v : fallback; } catch { return fallback; } }
const isStrings = (v: unknown): v is string[] => Array.isArray(v) && v.every((x) => typeof x === "string");
const isShortcuts = (v: unknown): v is Shortcut[] => Array.isArray(v) && v.every((x) => typeof x?.name === "string" && typeof x?.url === "string");
const isVisits = (v: unknown): v is { url: string; time: number }[] => Array.isArray(v) && v.every((x) => typeof x?.url === "string" && typeof x?.time === "number");

export default function BrowserApp({ win }: { win: Win }) {
  const user = useOS((s) => s.user);
  const initial = user?.kind === "account" ? user.name.slice(0, 1).toUpperCase() : "G";
  const [tabs, setTabs] = useState<Tab[]>([{ id: 0, history: [""], index: 0 }]);
  const [active, setActive] = useState(0);
  const [input, setInput] = useState("");
  const [menu, setMenu] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [visited, setVisited] = useState<{ url: string; time: number }[]>([]);
  const [adding, setAdding] = useState<{ name: string; url: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [version, setVersion] = useState(0);
  const seq = useRef(1);

  useEffect(() => {
    setBookmarks(load("kobra:browser:bookmarks", [], isStrings).filter((x) => /^https?:\/\//.test(x)));
    setShortcuts(load("kobra:browser:shortcuts", [], isShortcuts));
    setVisited(load("kobra:browser:history", [], isVisits).slice(0, 300));
    setReady(true);
  }, []);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem("kobra:browser:bookmarks", JSON.stringify(bookmarks));
      localStorage.setItem("kobra:browser:shortcuts", JSON.stringify(shortcuts));
      localStorage.setItem("kobra:browser:history", JSON.stringify(visited));
    } catch { /* Storage may be disabled. */ }
  }, [ready, bookmarks, shortcuts, visited]);

  const tab = tabs.find((t) => t.id === active) ?? tabs[0]!;
  const url = tab.history[tab.index] ?? "";
  useEffect(() => { setInput(url); }, [url, active]);
  function navigate(value: string) { const next = destination(value); setTabs((ts) => ts.map((t) => (t.id === active ? { ...t, history: [...t.history.slice(0, t.index + 1), next], index: t.index + 1 } : t))); }
  useEffect(() => { const u = win.props?.["url"]; if (typeof u === "string") navigate(u); }, [win.props?.["url"]]);
  useEffect(() => {
    if (!url) { setSrc(""); setLoading(false); setFallback(false); return; }
    let cancelled = false;
    setLoading(true); setFallback(false); setSrc("");
    void (async () => {
      try { await ensureScramjet(); } catch { /* proxify handles an unavailable engine */ }
      if (!cancelled) setSrc(proxify(url, "scramjet"));
    })();
    return () => { cancelled = true; };
  }, [url, version, active]);
  useEffect(() => { if (url && ready) setVisited((v) => [{ url, time: Date.now() }, ...v].slice(0, 300)); }, [url, active, ready]);
  useEffect(() => { if (!loading) return; const t = setTimeout(() => setLoading(false), 12000); return () => clearTimeout(t); }, [loading]);
  function step(delta: number) { setTabs((ts) => ts.map((t) => (t.id === active ? { ...t, index: Math.max(0, Math.min(t.history.length - 1, t.index + delta)) } : t))); }
  function newTab() { const id = seq.current++; setTabs((ts) => [...ts, { id, history: [""], index: 0 }]); setActive(id); }
  function close(id: number) {
    if (tabs.length === 1) { setTabs([{ id, history: [""], index: 0 }]); return; }
    const rest = tabs.filter((t) => t.id !== id); setTabs(rest);
    if (active === id) setActive(rest[Math.max(0, tabs.findIndex((t) => t.id === id) - 1)]!.id);
  }
  const starred = !!url && bookmarks.includes(url);
  const iconBtn = "grid size-8 shrink-0 place-items-center rounded-full text-chrome-dim hover:bg-chrome-hover hover:text-chrome-text disabled:opacity-35 disabled:hover:bg-transparent";

  return (
    <div className="relative flex h-full flex-col bg-chrome-frame text-chrome-text">
      {/* tab strip */}
      <div className="flex h-10 shrink-0 items-end gap-0 px-2 pt-1.5" role="tablist" aria-label="Browser tabs">
        <button className={`${iconBtn} mb-1 mr-1 size-7`} aria-label="Search tabs"><ChevronDown className="size-4" /></button>
        <div className="no-scrollbar flex min-w-0 items-end overflow-x-auto pl-2">
          {tabs.map((t, i) => {
            const on = t.id === active; const u = t.history[t.index] ?? "";
            const next = tabs[i + 1];
            return (
              <div key={t.id} data-active={on} className={`chrome-tab relative flex h-[34px] w-[220px] min-w-[72px] shrink items-center rounded-t-[10px] ${on ? "z-[1] bg-chrome-toolbar" : "hover:bg-chrome-hover/50"}`}>
                <button role="tab" aria-selected={on} onClick={() => setActive(t.id)} className="flex min-w-0 flex-1 items-center gap-2 pl-3 text-xs">
                  {u ? <img src={favicon(u)} alt="" className="size-4 rounded-sm" /> : <Globe className="size-4 text-chrome-dim" />}
                  <span className="truncate">{u ? hostname(u) : "New Tab"}</span>
                </button>
                <button aria-label="Close tab" onClick={() => close(t.id)} className="mr-2 grid size-5 place-items-center rounded-full text-chrome-dim hover:bg-chrome-hover hover:text-chrome-text"><X className="size-3" /></button>
                {!on && next && next.id !== active && <span className="absolute right-0 top-2 h-4 w-px bg-chrome-hover" />}
              </div>
            );
          })}
        </div>
        <button className={`${iconBtn} mb-1 ml-1 size-7`} aria-label="New tab" onClick={newTab}><Plus className="size-4" /></button>
      </div>

      {/* toolbar */}
      <div className="flex h-11 shrink-0 items-center gap-1 bg-chrome-toolbar px-2">
        <button className={iconBtn} aria-label="Back" disabled={tab.index === 0} onClick={() => step(-1)}><ArrowLeft className="size-[18px]" /></button>
        <button className={iconBtn} aria-label="Forward" disabled={tab.index >= tab.history.length - 1} onClick={() => step(1)}><ArrowRight className="size-[18px]" /></button>
        <button className={iconBtn} aria-label="Reload" onClick={() => setVersion((v) => v + 1)}><RotateCw className="size-4" /></button>
        <form className="mx-1 flex h-8 min-w-0 flex-1 items-center gap-2 rounded-full bg-chrome-frame px-3 focus-within:ring-2 focus-within:ring-tint-blue" onSubmit={(e) => { e.preventDefault(); navigate(input); }}>
          {url ? (url.startsWith("https:") ? <Lock className="size-3.5 shrink-0 text-chrome-dim" /> : <Info className="size-3.5 shrink-0 text-chrome-dim" />) : <span className="grid size-4 shrink-0 place-items-center rounded-full bg-tint-paper text-[10px] font-bold text-tint-blue">G</span>}
          <input className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-chrome-dim" aria-label="Address and search bar" placeholder="Ask Google or type a URL" value={input} onFocus={(e) => e.currentTarget.select()} onChange={(e) => setInput(e.target.value)} />
          {url && <button type="button" aria-label={starred ? "Remove bookmark" : "Bookmark this tab"} onClick={() => setBookmarks((b) => (starred ? b.filter((x) => x !== url) : [...b, url]))} className="grid size-6 place-items-center rounded-full text-chrome-dim hover:bg-chrome-hover"><Star className={`size-4 ${starred ? "fill-tint-blue text-tint-blue" : ""}`} /></button>}
        </form>
        <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tint-orange text-xs font-semibold text-tint-paper" aria-label="Profile">{initial}</span>
        <div className="relative">
          <button className={iconBtn} aria-label="Customize and control" aria-expanded={menu} onClick={() => setMenu((m) => !m)}><EllipsisVertical className="size-[18px]" /></button>
          {menu && (
            <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-lg bg-chrome-toolbar py-2 text-sm shadow-2xl ring-1 ring-chrome-hover" onMouseLeave={() => setMenu(false)}>
              <button className="flex w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-chrome-hover" onClick={() => { newTab(); setMenu(false); }}><Plus className="size-4" />New tab</button>
              <button className="flex w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-chrome-hover" onClick={() => { setHistoryOpen(true); setMenu(false); }}><History className="size-4" />History</button>
              {url && <button className="flex w-full items-center gap-3 px-4 py-1.5 text-left hover:bg-chrome-hover" onClick={() => { window.open(url, "_blank", "noopener,noreferrer"); setMenu(false); }}><ExternalLink className="size-4" />Open in real window</button>}
            </div>
          )}
        </div>
      </div>

      {/* bookmarks bar: only pages the user starred */}
      {bookmarks.length > 0 && (
        <div className="no-scrollbar flex h-8 shrink-0 items-center gap-1 overflow-x-auto border-b border-chrome-frame bg-chrome-toolbar px-2 text-xs">
          {bookmarks.map((b) => (
            <button key={b} onClick={() => navigate(b)} onContextMenu={(e) => { e.preventDefault(); setBookmarks((x) => x.filter((y) => y !== b)); }} title={`${b} (right-click to remove)`} className="flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 hover:bg-chrome-hover"><img src={favicon(b)} alt="" className="size-3.5" />{hostname(b)}</button>
          ))}
        </div>
      )}
      {loading && <div role="progressbar" aria-label="Loading page" className="h-0.5 shrink-0 overflow-hidden bg-chrome-toolbar"><div className="h-full w-2/3 animate-pulse bg-tint-blue" /></div>}

      {historyOpen && (
        <aside className="absolute bottom-0 right-0 top-[84px] z-20 w-72 overflow-auto bg-chrome-toolbar p-4 shadow-2xl">
          <div className="mb-3 flex items-center justify-between"><h2 className="font-semibold">History</h2><div className="flex gap-1"><button className={iconBtn} aria-label="Clear history" onClick={() => setVisited([])}><Trash2 className="size-4" /></button><button className={iconBtn} aria-label="Close history" onClick={() => setHistoryOpen(false)}><X className="size-4" /></button></div></div>
          {visited.length ? visited.map((v, i) => (
            <button key={`${v.time}:${i}`} className="mb-1 flex w-full items-center gap-2 rounded-lg p-2 text-left hover:bg-chrome-hover" onClick={() => { navigate(v.url); setHistoryOpen(false); }}>
              <img src={favicon(v.url)} alt="" className="size-4" /><span className="min-w-0 flex-1"><span className="block truncate text-sm">{hostname(v.url)}</span><span className="text-[11px] text-chrome-dim">{new Date(v.time).toLocaleString()}</span></span>
            </button>
          )) : <p className="text-sm text-chrome-dim">Pages you visit will show up here.</p>}
        </aside>
      )}

      {url ? (
        fallback ? (
          <div className="grid flex-1 place-content-center gap-4 bg-chrome-frame p-8 text-center">
            <Globe size={40} className="mx-auto text-chrome-dim" />
            <h2 className="text-xl font-semibold">This site can't be shown here</h2>
            <p className="text-sm text-chrome-dim">The site may block being opened inside another page.</p>
            <div className="flex justify-center gap-2"><button className="rounded-full bg-tint-blue px-4 py-2 text-sm font-medium text-tint-paper" onClick={() => setVersion((v) => v + 1)}>Try again</button><button className="rounded-full px-4 py-2 text-sm text-tint-blue ring-1 ring-chrome-hover" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Open in real window</button></div>
          </div>
        ) : (
          <div className="relative min-h-0 flex-1">
            {src && <iframe key={`${tab.id}:${version}:${src}`} src={src} title={hostname(url)} onLoad={() => setLoading(false)} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" className="size-full border-0 bg-tint-paper" />}
            <button onClick={() => setFallback(true)} className="absolute bottom-2 right-2 rounded-full bg-chrome-toolbar/90 px-3 py-1 text-[11px] text-chrome-dim opacity-60 hover:opacity-100">Page not loading?</button>
          </div>
        )
      ) : (
        <div className="relative flex min-h-0 flex-1 flex-col items-center overflow-auto bg-chrome-toolbar px-6 pt-[12vh]">
          <h1 className="select-none text-[64px] font-medium leading-none tracking-tight" aria-label="kobra">{LOGO.map(([c, cls], i) => <span key={i} className={cls}>{c}</span>)}</h1>
          <form className="mt-8 flex h-12 w-full max-w-[580px] items-center gap-3 rounded-full bg-tint-paper px-4 text-tint-ink shadow-lg" onSubmit={(e) => { e.preventDefault(); navigate(input); }}>
            <Plus className="size-5 text-tint-slate" />
            <input className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-tint-gray" aria-label="Search Google or type a URL" placeholder="Ask Google" value={input} onChange={(e) => setInput(e.target.value)} />
          </form>
          <div className="mt-10 flex flex-wrap justify-center gap-2">
            {shortcuts.map((s) => (
              <div key={s.url} className="group relative">
                <button onClick={() => navigate(s.url)} className="flex w-[104px] flex-col items-center gap-2.5 rounded-lg py-3 hover:bg-chrome-hover/60">
                  <span className="grid size-12 place-items-center rounded-full bg-chrome-frame"><img src={favicon(s.url)} alt="" className="size-6" /></span>
                  <span className="max-w-[90px] truncate text-xs">{s.name}</span>
                </button>
                <button aria-label={`Remove ${s.name}`} onClick={() => setShortcuts((x) => x.filter((y) => y.url !== s.url))} className="absolute right-1 top-1 hidden size-6 place-items-center rounded-full hover:bg-chrome-hover group-hover:grid"><X className="size-3.5" /></button>
              </div>
            ))}
            {shortcuts.length < 10 && (
              <button onClick={() => setAdding({ name: "", url: "" })} className="flex w-[104px] flex-col items-center gap-2.5 rounded-lg py-3 hover:bg-chrome-hover/60">
                <span className="grid size-12 place-items-center rounded-full bg-chrome-frame"><Plus className="size-5" /></span>
                <span className="text-xs">Add shortcut</span>
              </button>
            )}
          </div>
          <button className="absolute bottom-4 right-4 flex items-center gap-2 rounded-full bg-chrome-frame px-4 py-2 text-xs text-tint-cyan hover:bg-chrome-hover" onClick={() => setAdding({ name: "", url: "" })}><Pencil className="size-3.5" />Customize kobra</button>
          {adding && (
            <form className="absolute left-1/2 top-1/3 z-10 w-80 -translate-x-1/2 rounded-xl bg-chrome-frame p-5 shadow-2xl ring-1 ring-chrome-hover" onSubmit={(e) => { e.preventDefault(); const u = destination(adding.url); if (!u || u.includes("google.com/search")) return; setShortcuts((x) => [...x.filter((y) => y.url !== u), { name: adding.name.trim() || hostname(u), url: u }]); setAdding(null); }}>
              <h2 className="mb-4 font-medium">Add shortcut</h2>
              <label className="mb-3 block text-xs text-chrome-dim">Name<input autoFocus className="mt-1 w-full rounded-md bg-chrome-toolbar px-3 py-2 text-sm text-chrome-text outline-none focus:ring-2 focus:ring-tint-blue" value={adding.name} onChange={(e) => setAdding({ ...adding, name: e.target.value })} /></label>
              <label className="block text-xs text-chrome-dim">URL<input className="mt-1 w-full rounded-md bg-chrome-toolbar px-3 py-2 text-sm text-chrome-text outline-none focus:ring-2 focus:ring-tint-blue" placeholder="example.com" value={adding.url} onChange={(e) => setAdding({ ...adding, url: e.target.value })} /></label>
              <div className="mt-5 flex justify-end gap-2"><button type="button" className="rounded-full px-4 py-1.5 text-sm text-tint-blue hover:bg-chrome-hover" onClick={() => setAdding(null)}>Cancel</button><button className="rounded-full bg-tint-blue px-4 py-1.5 text-sm font-medium text-tint-paper disabled:opacity-40" disabled={!adding.url.trim()}>Done</button></div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}

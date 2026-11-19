import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, RotateCw, Home, Plus, X, Search, ExternalLink, Globe, Shield, Star, Settings, History, Lock, Unlock } from "lucide-react";
import type { Win } from "../store";
import { proxify, ensureScramjet, type ProxyEngine } from "../lib/proxy";
import { toast } from "sonner";
type Tab = { id: number; history: string[]; index: number };
const dials = [["Google", "https://www.google.com/webhp?igu=1"], ["Wikipedia", "https://en.wikipedia.org"], ["Bing", "https://www.bing.com"], ["Internet Archive", "https://archive.org"], ["Scratch", "https://scratch.mit.edu"], ["Desmos", "https://desmos.com/calculator"]] as const;
function destination(input: string, provider = "google"): string {
  const value = input.trim();
  if (!value) return "";
  try { const u = new URL(value.includes("://") ? value : `https://${value}`); if (["http:", "https:"].includes(u.protocol) && !/\s/.test(value) && (u.hostname.includes(".") || u.hostname === "localhost")) return u.href; } catch { /* Search instead. */ }
  return `${provider === "duckduckgo" ? "https://duckduckgo.com/?q=" : "https://www.google.com/search?igu=1&q="}${encodeURIComponent(value)}`;
}
function hostname(url: string) { try { return new URL(url).hostname; } catch { return "New tab"; } }
export default function BrowserApp({ win }: { win: Win }) {
  const [tabs, setTabs] = useState<Tab[]>([{ id: 0, history: [""], index: 0 }]);
  const [active, setActive] = useState(0);
  const [input, setInput] = useState("");
  const [engine, setEngine] = useState<ProxyEngine>("off");
  const [provider, setProvider] = useState("google");
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [visited, setVisited] = useState<{url: string; time: number}[]>([]);
  const [ready, setReady] = useState(false);
  const [src, setSrc] = useState("");
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    try {
      const p = JSON.parse(localStorage.getItem("kobra:browser:prefs") || "{}");
      if (["off", "scramjet", "simple"].includes(p.engine)) setEngine(p.engine);
      if (["google", "duckduckgo"].includes(p.provider)) setProvider(p.provider);
      const b: unknown = JSON.parse(localStorage.getItem("kobra:browser:bookmarks") || "[]");
      if (Array.isArray(b)) setBookmarks(b.filter((x): x is string => typeof x === "string" && /^https?:\/\//.test(x)));
      const h: unknown = JSON.parse(localStorage.getItem("kobra:browser:history") || "[]");
      if (Array.isArray(h)) setVisited(h.filter(x => typeof x?.url === "string" && typeof x?.time === "number").slice(0, 300));
    } catch { /* Corrupt or restricted storage uses defaults. */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { localStorage.setItem("kobra:browser:prefs", JSON.stringify({engine, provider})); localStorage.setItem("kobra:browser:bookmarks", JSON.stringify(bookmarks)); localStorage.setItem("kobra:browser:history", JSON.stringify(visited)); } catch { /* Storage may be disabled. */ } } }, [ready, engine, provider, bookmarks, visited]);
  const [hint, setHint] = useState(true);
  const [version, setVersion] = useState(0);
  const seq = useRef(1);
  const tab = tabs.find(t => t.id === active) ?? tabs[0]!;
  const url = tab.history[tab.index] ?? "";
  useEffect(() => { setInput(url); }, [url, active]);
  function navigate(value: string) { const next = destination(value, provider); setTabs(ts => ts.map(t => t.id === active ? { ...t, history: [...t.history.slice(0, t.index + 1), next], index: t.index + 1 } : t)); setHint(true); }
  useEffect(() => { const initial = win.props?.['url']; if (typeof initial === "string") navigate(initial); }, [win.props?.['url']]);
  useEffect(() => {
    if (!url) { setSrc(""); setLoading(false); setFallback(false); return; }
    let cancelled = false;
    setLoading(true); setFallback(false); setSrc("");
    void (async () => {
      let next = engine;
      if (engine === "scramjet") {
        let available = false;
        try { available = await ensureScramjet(); } catch { /* fall back */ }
        if (cancelled) return;
        if (!available) { toast("Scramjet unavailable, using simple proxy"); next = "simple"; setEngine("simple"); }
      }
      if (!cancelled) setSrc(proxify(url, next));
    })();
    return () => { cancelled = true; };
  }, [url, engine, version, active]);
  useEffect(() => { if (url && ready) setVisited(v => [{url, time: Date.now()}, ...v].slice(0, 300)); }, [url, active, ready]);
  useEffect(() => { if (!loading) return; const t = setTimeout(() => {setFallback(true); setLoading(false);}, 8000); return () => clearTimeout(t); }, [loading]);
  function step(delta: number) { setTabs(ts => ts.map(t => t.id === active ? { ...t, index: Math.max(0, Math.min(t.history.length - 1, t.index + delta)) } : t)); }
  function close(id: number) { if (tabs.length === 1) { setTabs([{ id, history: [""], index: 0 }]); return; } const rest = tabs.filter(t => t.id !== id); setTabs(rest); if (active === id) setActive(rest[Math.max(0, tabs.findIndex(t => t.id === id) - 1)]!.id); }
  return <div className="relative flex h-full flex-col bg-background/60"><div className="flex shrink-0 items-center gap-1 overflow-x-auto border-b border-hairline p-2" role="tablist" aria-label="Browser tabs">{tabs.map(t => <div key={t.id} className={`flex max-w-48 shrink-0 items-center rounded-lg ${t.id === active ? "bg-muted" : "hover:bg-muted/50"}`}><button role="tab" aria-selected={active === t.id} className="flex min-w-0 items-center gap-2 px-3 py-2 text-xs" onClick={() => setActive(t.id)}><Globe size={12}/><span className="truncate">{hostname(t.history[t.index] || "")}</span></button><button title="Close tab" className="p-2 text-muted-foreground hover:text-foreground" onClick={() => close(t.id)}><X size={12}/></button></div>)}<button title="New tab" className="os-btn shrink-0" onClick={() => { const id = seq.current++; setTabs(ts => [...ts, { id, history: [""], index: 0 }]); setActive(id); }}><Plus size={16}/></button></div><div className="flex flex-wrap items-center gap-1 border-b border-hairline p-2"><button title="Back" className="os-btn disabled:opacity-30" disabled={tab.index === 0} onClick={() => step(-1)}><ArrowLeft size={16}/></button><button title="Forward" className="os-btn disabled:opacity-30" disabled={tab.index >= tab.history.length - 1} onClick={() => step(1)}><ArrowRight size={16}/></button><button title="Reload" className="os-btn" onClick={() => setVersion(v => v + 1)}><RotateCw size={16}/></button><button title="Home" className="os-btn" onClick={() => navigate("")}><Home size={16}/></button><span className="text-muted-foreground">{url.startsWith("https:") ? <Lock size={14}/> : <Unlock size={14}/>}</span><form className="min-w-32 flex-1" onSubmit={e => { e.preventDefault(); navigate(input); }}><input className="os-input w-full" aria-label="Address or search" placeholder="Search or enter a website" value={input} onChange={e => setInput(e.target.value)}/></form><button title="Bookmark page" className="os-btn" disabled={!url} onClick={() => setBookmarks(b => b.includes(url) ? b.filter(x => x !== url) : [...b, url])}><Star size={15} fill={bookmarks.includes(url) ? "currentColor" : "none"}/></button><select aria-label="Proxy engine" className="os-input max-w-32" value={engine} onChange={e => setEngine(e.target.value as ProxyEngine)}><option value="off">Off</option><option value="scramjet">Scramjet</option><option value="simple">Simple proxy</option></select><button className="os-btn" title="History" onClick={() => setHistoryOpen(v => !v)}><History size={16}/></button><div className="relative"><button title="Browser preferences" className="os-btn" onClick={() => setPrefsOpen(v => !v)}><Settings size={16}/></button>{prefsOpen && <div className="absolute right-0 top-full z-30 w-52 rounded-xl border border-hairline bg-popover p-4 shadow-xl"><label className="text-xs">Search provider<select className="os-input mt-2 w-full" value={provider} onChange={e => setProvider(e.target.value)}><option value="google">Google</option><option value="duckduckgo">DuckDuckGo</option></select></label></div>}</div></div>{loading && <div role="progressbar" aria-label="Loading page" className="h-0.5 shrink-0 overflow-hidden bg-muted"><div className="h-full w-4/5 animate-pulse bg-primary"/></div>}<div className="flex shrink-0 gap-3 overflow-x-auto border-b border-hairline px-3 py-2 text-xs">{[["Wikipedia", "https://en.wikipedia.org"], ["GitHub", "https://github.com"], ["Search", provider === "google" ? "https://www.google.com/webhp?igu=1" : "https://duckduckgo.com"], ["Docs", "https://docs.google.com"], ...bookmarks.map(u => [hostname(u), u])].map(([label, href]) => <button className="shrink-0 text-muted-foreground hover:text-primary" key={href} onClick={() => navigate(href!)}>{label}</button>)}</div>{historyOpen && <aside className="absolute bottom-0 right-0 top-32 z-20 w-72 overflow-auto border-l border-hairline bg-popover p-4 shadow-xl"><div className="mb-4 flex justify-between"><h2 className="font-semibold">History</h2><button className="text-xs text-primary" onClick={() => setVisited([])}>Clear history</button><button title="Close history" onClick={() => setHistoryOpen(false)}><X size={14}/></button></div>{visited.length ? visited.map((v, i) => <button key={`${v.time}:${i}`} className="os-row-hover mb-2 block w-full rounded-lg p-2 text-left" onClick={() => {navigate(v.url); setHistoryOpen(false);}}><p className="truncate text-sm">{hostname(v.url)}</p><p className="text-xs text-muted-foreground">{new Date(v.time).toLocaleString()}</p></button>) : <p className="text-sm text-muted-foreground">Your browsing history will appear here.</p>}</aside>}{url ? <><div className="flex items-center gap-2 px-3 py-1 text-xs text-muted-foreground"><span className="flex-1 truncate">{hostname(url)}</span><button onClick={() => setFallback(true)}>Page not loading?</button></div>{fallback ? <div className="grid flex-1 place-content-center gap-4 p-8 text-center"><Globe size={40} className="mx-auto text-primary"/><h2 className="text-xl font-semibold">This site refuses to be shown inside a window</h2><p className="text-sm text-muted-foreground">Embedding may be blocked, or the site may be taking too long to respond.</p><div className="flex justify-center gap-3"><button className="os-btn" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>Open in new window <ExternalLink size={14}/></button><button className="os-btn-primary" onClick={() => {setEngine("simple"); setVersion(v => v + 1);}}>Try through proxy</button></div></div> : src && <iframe key={`${tab.id}:${version}:${src}`} src={src} title={hostname(url)} onLoad={() => {setLoading(false);}} sandbox="allow-scripts allow-same-origin allow-forms allow-popups" className="min-h-0 w-full flex-1 border-0 bg-background"/>}</> : <div className="flex flex-1 flex-col items-center justify-center overflow-auto p-8 animate-fade"><Globe size={40} className="mb-5 text-primary"/><h1 className="text-3xl font-semibold tracking-tight">A little curiosity goes a long way.</h1><p className="mb-7 mt-2 text-sm text-muted-foreground">Where would you like to go?</p><form className="flex w-full max-w-lg items-center gap-3 rounded-2xl border border-hairline bg-card p-3 shadow-lg" onSubmit={e => { e.preventDefault(); navigate(input); }}><Search size={20} className="text-primary"/><input className="min-w-0 flex-1 bg-transparent p-2 outline-none" aria-label="Search the web" placeholder="Search the web or enter a URL" value={input} onChange={e => setInput(e.target.value)}/><button title="Go" className="os-btn"><ArrowRight size={18}/></button></form><div className="mt-9 grid w-full max-w-lg grid-cols-3 gap-4">{dials.map(([name, href]) => <button key={name} onClick={() => navigate(href)} className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-card/50 p-4 transition hover:-translate-y-1 hover:bg-muted"><img loading="lazy" alt="" className="h-8 w-8" src={`https://www.google.com/s2/favicons?domain=${new URL(href).hostname}&sz=64`}/><span className="text-xs">{name}</span></button>)}</div></div>}</div>;
}

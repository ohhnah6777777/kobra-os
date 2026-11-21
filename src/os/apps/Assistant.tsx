import { useEffect, useRef, useState } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";
import { z } from "zod";
import { ArrowUp, Check, Sparkles, Square, Trash2 } from "lucide-react";
import { os, type Win } from "../store";
import { APPS, type AppId } from "../apps";
const appId = z.custom<AppId>((v: unknown) => typeof v === "string" && APPS.some(a => a.id === v));
const actionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("open_app"), app: appId }), z.object({ type: z.literal("close_app"), app: appId }),
  z.object({ type: z.literal("set_wallpaper"), wallpaper: z.enum(["snowy", "blackhole"]) }),
  z.object({ type: z.literal("set_accent"), accent: z.enum(["blue", "violet", "emerald", "amber", "rose"]) }),
  z.object({ type: z.literal("set_cursor_effect"), effect: z.enum(["cubes", "liquid", "strings", "off"]) }),
  z.object({ type: z.literal("toggle_widget"), widget: z.enum(["clock", "weather", "sticky"]), on: z.boolean() }),
  z.object({ type: z.literal("set_taskbar"), style: z.enum(["dock", "bar"]) }), z.object({ type: z.literal("pin_app"), app: appId, pinned: z.boolean() }),
]);
type Chat = { role: "user" | "assistant"; content: string; actions?: string[] | undefined };
const chatSchema = z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string(), actions: z.array(z.string()).optional() }));
function visible(text: string) { const i = text.search(/(?:^|\n)\s*ACTIONS:/); if (i >= 0) return text.slice(0, i).trimEnd(); return text.replace(/\n\s*A(?:C(?:T(?:I(?:O(?:N(?:S)?)?)?)?)?)?\s*$/, ""); }
function execute(action: z.infer<typeof actionSchema>): string {
  const store = os(); const name = "app" in action ? APPS.find(a => a.id === action.app)!.name : "";
  switch (action.type) {
    case "open_app": store.openApp(action.app); return `Opened ${name}`;
    case "close_app": store.windows.filter(w => w.app === action.app).forEach(w => store.closeWin(w.id)); return `Closed ${name}`;
    case "set_accent": store.setSettings({ accent: action.accent }); return `Accent: ${action.accent}`;
    case "set_wallpaper": store.setSettings({ wallpaper: action.wallpaper }); return `Wallpaper: ${action.wallpaper}`;
    case "set_cursor_effect": store.setSettings({ cursorEffect: action.effect }); return `Cursor: ${action.effect}`;
    case "set_taskbar": store.setSettings({ taskbar: action.style }); return `Taskbar: ${action.style}`;
    case "toggle_widget": store.setSettings({ widgets: { ...store.settings.widgets, [action.widget]: action.on } }); return `${action.on ? "Enabled" : "Disabled"} ${action.widget}`;
    case "pin_app": if (store.settings.pinned.includes(action.app) !== action.pinned) store.togglePin(action.app); return `${action.pinned ? "Pinned" : "Unpinned"} ${name}`;
  }
}
function Markdown({ text }: { text: string }) {
  const [html, setHtml] = useState("");
  useEffect(() => { setHtml(DOMPurify.sanitize(marked.parse(text, { async: false }), { FORBID_TAGS: ["img"], FORBID_ATTR: ["style"] })); }, [text]);
  return <div className="break-words text-sm leading-relaxed [&_p]:my-2 [&_pre]:overflow-auto [&_pre]:rounded-lg [&_pre]:bg-background/60 [&_pre]:p-3 [&_code]:font-mono [&_a]:text-primary [&_ul]:list-inside [&_ul]:list-disc [&_ol]:list-inside [&_ol]:list-decimal" dangerouslySetInnerHTML={{ __html: html }} />;
}
export default function AssistantApp({ win }: { win: Win }) {
  const [chats, setChats] = useState<Chat[]>([]); const [draft, setDraft] = useState(""); const [stream, setStream] = useState<string | null>(null); const [error, setError] = useState(""); const [ready, setReady] = useState(false);
  const abort = useRef<AbortController | null>(null); const bottom = useRef<HTMLDivElement>(null); const mounted = useRef(true);
  useEffect(() => { mounted.current = true; try { const saved = chatSchema.safeParse(JSON.parse(localStorage.getItem("kobra:assistant") ?? "[]")); if (saved.success) setChats(saved.data.slice(-60)); } catch {} setReady(true); return () => { mounted.current = false; abort.current?.abort(); }; }, []);
  useEffect(() => { if (ready) try { localStorage.setItem("kobra:assistant", JSON.stringify(chats.slice(-60))); } catch {} }, [chats, ready]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [stream, chats]);
  async function send(text: string) {
    if (!text.trim() || abort.current) return;
    const conversation: Chat[] = [...chats, { role: "user" as const, content: text.trim() }].slice(-59); setChats(conversation); setDraft(""); setError(""); setStream("");
    const controller = new AbortController(); abort.current = controller; let full = ""; let completed = false;
    try {
      const state = os(); const response = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, signal: controller.signal, body: JSON.stringify({ messages: conversation.map(({ role, content }) => ({ role, content })), context: { accent: state.settings.accent, wallpaper: state.settings.wallpaper, openApps: state.windows.map(w => w.app) } }) });
      if (!response.ok) { const fallback = response.status === 402 ? "AI credits exhausted" : response.status === 429 ? "AI is busy, try again" : "Assistant unavailable. Please try again."; const body = await response.json().catch(() => null) as { error?: string } | null; throw new Error(body?.error ?? fallback); }
      if (!response.body) throw new Error("No response received.");
      const reader = response.body.getReader(); const decoder = new TextDecoder(); let buffer = "";
      while (true) { const { value, done } = await reader.read(); if (done) break; buffer += decoder.decode(value, { stream: true }); let newline: number; while ((newline = buffer.indexOf("\n")) >= 0) { const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1); if (!line.trim()) continue; const part = JSON.parse(line) as { text?: string; error?: string; done?: boolean }; if (part.error) throw new Error(part.error); if (part.text) { full += part.text; if (mounted.current) setStream(full); } if (part.done) completed = true; } }
      if (!completed) throw new Error("Response interrupted. You can try again.");
      if (controller.signal.aborted) return;
      const match = full.match(/(?:^|\n)\s*ACTIONS:\s*(\[[\s\S]*\])\s*$/); const labels: string[] = [];
      if (match) { const parsed = z.array(actionSchema).max(8).safeParse(JSON.parse(match[1]!)); if (!parsed.success) throw new Error("The requested desktop action was invalid; nothing was changed."); for (const action of parsed.data) labels.push(execute(action)); }
      if (mounted.current) setChats(v => [...v, { role: "assistant", content: visible(full), actions: labels }]); full = "";
    } catch (e) { if (mounted.current && !controller.signal.aborted) setError(e instanceof Error ? e.message : "Unable to connect."); }
    finally { if (mounted.current) { if (full && visible(full).trim()) setChats(v => [...v, { role: "assistant", content: visible(full) }]); setStream(null); } abort.current = null; }
  }
  return <div className="flex h-full flex-col bg-background/45"><header className="flex items-center gap-3 border-b border-hairline p-4"><div className="rounded-xl bg-primary/15 p-2 text-primary"><Sparkles size={19} /></div><div><h1 className="text-sm font-semibold">Assistant (AI)</h1><p className="text-xs text-muted-foreground">A little help, right on your desktop</p></div><button className="os-btn ml-auto" aria-label="Clear conversation" disabled={stream !== null} onClick={() => { setChats([]); setError(""); }}><Trash2 size={15} /></button></header>
    <div className="min-h-0 flex-1 space-y-5 overflow-auto p-5">{!chats.length && <div className="flex min-h-56 flex-col justify-center gap-4"><Sparkles className="text-primary" size={32} /><h2 className="text-2xl font-medium">Make yourself at home.</h2><p className="text-sm text-muted-foreground">Open apps, shape your workspace, or ask a question. Powered by Lovable AI.</p><div className="flex flex-wrap gap-2">{["open notes", "make it emerald", "turn on sticky notes", "switch to windows bar"].map(s => <button key={s} className="os-chip" onClick={() => void send(s)} disabled={stream !== null}>{s}</button>)}</div></div>}{chats.map((c, i) => <div key={i} className={`flex flex-col ${c.role === "user" ? "items-end" : "items-start"}`}><div className={`max-w-[95%] rounded-2xl px-4 py-2 ${c.role === "user" ? "bg-primary/15" : "border border-hairline bg-card/50"}`}><Markdown text={c.content} /></div>{!!c.actions?.length && <div className="mt-2 flex flex-wrap gap-1">{c.actions.map((label, j) => <span key={j} className="os-chip flex items-center gap-1 text-xs text-success"><Check size={12} />{label}</span>)}</div>}</div>)}{stream !== null && <div className="animate-fade rounded-2xl border border-hairline bg-card/50 px-4 py-2"><Markdown text={visible(stream) || "Thinking…"} /><span className="animate-pulse text-primary">▍</span></div>}{error && <div role="alert" className="rounded-xl border border-destructive/25 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}<div ref={bottom} /></div>
    <form className="border-t border-hairline p-3" onSubmit={e => { e.preventDefault(); void send(draft); }}><div className="flex items-end gap-2 rounded-2xl border border-hairline bg-background/50 p-2"><textarea aria-label="Ask Assistant" className="max-h-32 min-h-10 flex-1 resize-none bg-transparent p-2 text-sm outline-none" rows={2} placeholder="Ask anything, or change your workspace…" value={draft} maxLength={16000} onChange={e => setDraft(e.target.value)} onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(draft); } }} />{stream !== null ? <button type="button" className="os-btn" aria-label="Stop response" onClick={() => abort.current?.abort()}><Square size={16} /></button> : <button className="os-btn-primary" disabled={!draft.trim() || !ready} aria-label="Send"><ArrowUp size={18} /></button>}</div><p className="mt-2 text-center text-[10px] text-muted-foreground">AI can make mistakes. Desktop actions are shown below each reply.</p></form></div>;
}

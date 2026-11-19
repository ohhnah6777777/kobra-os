import { useEffect, useRef, useState } from "react";
import { Hash, LockKeyhole, Send, MessageCircle, Plus, Globe, Bell, BellOff, ShieldCheck, ArrowLeft, Users, Search, Settings, Compass, X } from "lucide-react";
import { useOS, os, type Win } from "../store";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
type Room = Tables<"rooms">;
type Message = Tables<"messages">;
const encode = (a: Uint8Array) => btoa(Array.from(a, n => String.fromCharCode(n)).join(""));
const decode = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0));
async function derive(pass: string, salt: string) {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt: decode(salt), iterations: 310000, hash: "SHA-256" }, material, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}
async function encrypt(text: string, key: CryptoKey) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(text)));
  const data = new Uint8Array(iv.length + ct.length); data.set(iv); data.set(ct, iv.length); return encode(data);
}
async function decrypt(text: string, key: CryptoKey) {
  const data = decode(text); return new TextDecoder().decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: data.slice(0, 12) }, key, data.slice(12)));
}
const palette = ["bg-chart-1/20 text-chart-1", "bg-chart-2/20 text-chart-2", "bg-chart-3/20 text-chart-3", "bg-chart-4/20 text-chart-4", "bg-chart-5/20 text-chart-5"];
const color = (name: string) => palette[Array.from(name).reduce((n, c) => n + c.charCodeAt(0), 0) % 5];
const initials = (name: string) => /^general(\d*)$/i.test(name) ? (name.slice(7) ? `G${name.slice(7)}` : "GN") : name.replace(/[^a-z0-9 ]/gi, "").split(/\s+/).map(s => s[0]).join("").slice(0, 2).toUpperCase() || "#";
const handle = (name: string) => name.toLowerCase().replace(/\s+/g, "_");
type Member = { id: string; name: string };
function Avatar({ name, small = false }: { name: string; small?: boolean }) {
  return <span className={`inline-flex shrink-0 items-center justify-center rounded-full border border-hairline-strong font-semibold ${small ? "h-8 w-8 text-xs" : "h-10 w-10 text-sm"} ${color(name)}`}>{initials(name)}</span>;
}
export default function MessagesApp({ win }: { win: Win }) {
  const user = useOS(s => s.user); const account = user?.kind === "account";
  const [tab, setTab] = useState<"Global" | "Rooms">("Global"); const [rooms, setRooms] = useState<Room[]>([]); const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<Message[]>([]); const [draft, setDraft] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false); const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"public" | "private" | "join" | null>(null); const [name, setName] = useState(""); const [pass, setPass] = useState(""); const [remembered, setRemembered] = useState<string[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  const wide = width === null ? win.maximized && !win.snap : width >= 960;
  const [notifications, setNotifications] = useState(true);
  const notificationsRef = useRef(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMembers, setShowMembers] = useState(true);
  const [search, setSearch] = useState("");
  const [unread, setUnread] = useState<Set<string>>(new Set());
  const selectedRef = useRef<string | null>(null);
  const displayName = account ? user.name : "Guest";
  useEffect(() => { notificationsRef.current = notifications; }, [notifications]);
  useEffect(() => {
    const node = root.current; if (!node) return;
    const measure = () => setWidth(node.getBoundingClientRect().width);
    measure(); const observer = new ResizeObserver(measure); observer.observe(node);
    return () => observer.disconnect();
  }, [win.maximized, win.snap]);
  useEffect(() => {
    selectedRef.current = room?.id ?? null; setSearch("");
    if (room) setUnread(previous => { const next = new Set(previous); next.delete(room.id); return next; });
  }, [room?.id]);
  useEffect(() => {
    setMembers([]); if (!room || !account) return;
    let alive = true;
    const channel = supabase.channel(`presence:room:${room.id}`, { config: { presence: { key: user.id } } });
    channel.on("presence", { event: "sync" }, () => {
      if (!alive) return;
      const unique = new Map<string, Member>();
      for (const entries of Object.values(channel.presenceState<{ id: string; name: string }>())) {
        for (const entry of entries) if (typeof entry.id === "string" && typeof entry.name === "string") unique.set(entry.id, { id: entry.id, name: entry.name });
      }
      setMembers([...unique.values()]);
    }).subscribe(status => { if (status === "SUBSCRIBED" && alive) void channel.track({ id: user.id, name: user.name }); });
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [room?.id, account, account ? user.id : null, account ? user.name : null]);
  useEffect(() => {
    if (!account) return;
    const channel = supabase.channel(`room-unread-${win.id}-${crypto.randomUUID()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, payload => {
      const message = payload.new as Message;
      if (notificationsRef.current && message.room_id !== selectedRef.current && message.user_id !== user.id) setUnread(previous => new Set(previous).add(message.room_id));
    }).subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [account, account ? user.id : null, win.id]);
  const keys = useRef(new Map<string, CryptoKey>()); const bottom = useRef<HTMLDivElement>(null); const request = useRef(0);
  useEffect(() => { try { const saved: unknown = JSON.parse(localStorage.getItem("kobra:rooms") ?? "[]"); if (Array.isArray(saved)) setRemembered(saved.filter((v): v is string => typeof v === "string")); } catch {} }, []);
  useEffect(() => {
    let alive = true; keys.current.clear(); setRoom(null); setMessages([]); setRooms([]);
    if (account) void supabase.from("rooms").select("*").eq("is_private", false).order("name").then(({ data, error }) => { if (alive) { setRooms(data ?? []); if (error) setError(error.message); } });
    return () => { alive = false; keys.current.clear(); };
  }, [user?.kind, account ? user.id : null]);
  useEffect(() => {
    if (!room || !account) return;
    let alive = true; const selected = room; const generation = ++request.current; const pending = new Map<string, Message>(); let hydrated = false; let chain = Promise.resolve();
    setLoading(true); setMessages([]); setError("");
    async function readable(row: Message) { if (!row.encrypted) return row; const key = keys.current.get(selected.id); try { return { ...row, content: key ? await decrypt(row.content, key) : "[Room locked]" }; } catch { return { ...row, content: "[Unable to decrypt message]" }; } }
    const channel = supabase.channel(`chat-${win.id}-${selected.id}-${crypto.randomUUID()}`).on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${selected.id}` }, payload => {
      const row = payload.new as Message;
      if (!hydrated) { pending.set(row.id, row); return; }
      chain = chain.then(async () => { const msg = await readable(row); if (alive) setMessages(v => [...v.filter(m => m.id !== msg.id), msg].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-100)); });
    }).subscribe();
    void (async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("room_id", selected.id).order("created_at", { ascending: false }).limit(100);
      if (!alive || generation !== request.current) return;
      if (error) { setError(error.message); setLoading(false); return; }
      const combined = new Map((data ?? []).map(m => [m.id, m])); pending.forEach((v, k) => combined.set(k, v));
      const result = await Promise.all([...combined.values()].map(readable));
      // Drain events that arrived while decryption was in flight.
      for (const [id, row] of pending) if (!combined.has(id)) result.push(await readable(row));
      hydrated = true;
      if (alive) { setMessages(result.sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-100)); setLoading(false); }
    })();
    return () => { alive = false; void supabase.removeChannel(channel); };
  }, [room?.id, account, win.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: "nearest", behavior: "smooth" }); }, [messages]);
  async function submitRoom() {
    if (!account || !name.trim() || (mode !== "public" && !pass)) return;
    setBusy(true); setError("");
    try {
      let selected: Room; let key: CryptoKey | undefined;
      if (mode === "join") {
        const { data, error } = await supabase.from("rooms").select("*").eq("name", name.trim()).eq("is_private", true).single(); if (error || !data) throw new Error("Private room not found or unavailable.");
        selected = data; if (!data.salt || !data.verifier) throw new Error("This room has no encryption verifier."); key = await derive(pass, data.salt);
        try { if (await decrypt(data.verifier, key) !== "kobra-ok") throw new Error(); } catch { throw new Error("Wrong passkey. Please try again."); }
      } else {
        const isPrivate = mode === "private"; const salt = isPrivate ? encode(crypto.getRandomValues(new Uint8Array(16))) : null; key = salt ? await derive(pass, salt) : undefined;
        const { data, error } = await supabase.from("rooms").insert({ name: name.trim(), is_private: isPrivate, created_by: user.id, salt, verifier: key ? await encrypt("kobra-ok", key) : null }).select().single(); if (error) throw error; selected = data;
      }
      if (key) { keys.current.set(selected.id, key); const names = Array.from(new Set([...remembered, selected.name])); setRemembered(names); try { localStorage.setItem("kobra:rooms", JSON.stringify(names)); } catch {} }
      setRooms(v => [...v.filter(r => r.id !== selected.id), selected]); setRoom(selected); setTab(selected.is_private ? "Rooms" : "Global"); setMode(null); setPass(""); setName("");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to open room."); } finally { setBusy(false); }
  }
  async function send() {
    if (!account || !room || !draft.trim() || busy) return;
    const content = draft.trim(); setBusy(true); setError("");
    try { const key = keys.current.get(room.id); if (room.is_private && !key) throw new Error("Unlock this room first."); const { data, error } = await supabase.from("messages").insert({ room_id: room.id, user_id: user.id, username: user.name, content: key ? await encrypt(content, key) : content, encrypted: !!key }).select().single(); if (error) throw error; setMessages(v => [...v.filter(m => m.id !== data.id), { ...data, content }].sort((a, b) => a.created_at.localeCompare(b.created_at)).slice(-100)); setDraft(""); } catch (e) { setError(e instanceof Error ? e.message : "Message not sent."); } finally { setBusy(false); }
  }
  const publicRooms = rooms.filter(r => !r.is_private);
  const privateRooms = rooms.filter(r => r.is_private && keys.current.has(r.id));
  const lockedNames = remembered.filter(n => !privateRooms.some(r => r.name === n));
  const guestRooms = [{ id: "guest-general", name: "general" }, { id: "guest-general2", name: "general2" }];
  const listed = tab === "Global" ? account ? publicRooms : guestRooms : privateRooms;
  const signIn = () => { useOS.getState().setAuthRequested(true); useOS.getState().setPhase("lock"); };
  const select = (id: string) => { const next = rooms.find(r => r.id === id); if (next && account) { setRoom(next); setTab(next.is_private ? "Rooms" : "Global"); } };
  const create = (next: "public" | "private" | "join") => { setError(""); setMode(next); setPass(""); };
  const notice = !account && <div className="m-4 rounded-2xl border border-hairline-strong bg-card p-4 text-sm"><p>Account required to chat in public rooms</p><button className="os-btn-primary mt-3" onClick={signIn}>Sign in</button></div>;
  const actions = <div className="flex flex-wrap items-center gap-2">
    <button aria-label={notifications ? "Mute notifications" : "Enable notifications"} aria-pressed={notifications} title="Unread notifications" onClick={() => setNotifications(v => !v)} className={`flex h-10 w-10 items-center justify-center rounded-full border border-hairline-strong ${notifications ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{notifications ? <Bell size={17} /> : <BellOff size={17} />}</button>
    <button disabled={!account} onClick={() => create("join")} className="os-btn rounded-full text-xs">Join</button>
    <button disabled={!account} onClick={() => create("public")} className="os-btn rounded-full text-xs"><Plus size={15} />New</button>
    <button disabled={!account} onClick={() => create("private")} className="os-btn rounded-full text-xs text-success"><LockKeyhole size={15} />Private</button>
  </div>;
  const empty = <div className="flex min-h-48 flex-1 flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"><MessageCircle size={38} strokeWidth={1.3} /><h2 className="text-lg font-semibold text-chat-foreground">{room ? "Start the conversation" : "A little space to connect."}</h2><p className="max-w-xs text-sm">{room ? "Be the first to say hello." : "Choose a room or create a private, encrypted space."}</p></div>;
  const chat = <main className="flex min-h-0 min-w-0 flex-1 flex-col bg-chat">
    <header className="flex min-h-16 shrink-0 items-center gap-3 border-b border-hairline bg-card/40 px-4">
      {!wide && <button className="os-btn h-9 w-9 shrink-0 p-0" aria-label="Back to rooms" onClick={() => setRoom(null)}><ArrowLeft size={18} /></button>}
      {wide ? room?.is_private ? <LockKeyhole size={22} className="shrink-0 text-muted-foreground" /> : <Hash size={24} className="shrink-0 text-muted-foreground" /> : <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-hairline-strong font-semibold ${color(room?.name ?? "Global")}`}>{initials(room?.name ?? "Global")}</span>}
      <div className="min-w-0"><h2 className="truncate font-semibold">{room?.name ?? "Global"}</h2>{!wide && <p className="text-xs text-success">{members.length} online</p>}</div>
      {wide && <><span className="h-6 border-l border-hairline-strong" /><p className="min-w-0 flex-1 truncate text-xs text-muted-foreground">{room?.is_private ? "End-to-end encrypted" : "General discussion"}</p><button className={`os-btn shrink-0 p-2 ${showMembers ? "text-primary" : ""}`} aria-label="Toggle member list" aria-pressed={showMembers} onClick={() => setShowMembers(v => !v)}><Users size={19} /></button><label className="flex w-36 items-center gap-2 rounded-lg border border-hairline bg-background/50 px-2"><Search size={14} className="shrink-0 text-muted-foreground" /><input aria-label="Search messages" className="h-8 w-full min-w-0 bg-transparent text-xs outline-none" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} /></label></>}
    </header>
    {notice}
    <div className="flex min-h-0 flex-1">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div role="log" aria-label="Conversation" aria-live="polite" aria-busy={loading} className={`min-h-0 flex-1 overflow-y-auto ${wide ? "py-5" : "space-y-5 p-5"}`}>
          {loading ? <p className="animate-pulse p-5 text-sm text-muted-foreground">Loading conversation…</p> : !room || !messages.length ? empty : (() => {
            const filtered = messages.filter(m => `${m.username} ${m.content}`.toLowerCase().includes(search.toLowerCase()));
            if (!filtered.length) return <p className="p-6 text-center text-sm text-muted-foreground">No messages match your search.</p>;
            return filtered.map((m, i) => {
              const previous = filtered[i - 1];
              const date = new Date(m.created_at); const day = date.toDateString();
              const divider = !previous || new Date(previous.created_at).toDateString() !== day;
              const grouped = wide && !divider && previous?.user_id === m.user_id && date.getTime() - new Date(previous.created_at).getTime() < 300000;
              const time = date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
              return <div key={m.id}>
                {wide && divider && <div className="mx-5 my-5 flex items-center gap-3 text-[10px] font-semibold text-muted-foreground"><span className="flex-1 border-t border-hairline-strong" />{day === new Date().toDateString() ? "Today" : date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}<span className="flex-1 border-t border-hairline-strong" /></div>}
                <article className={`group flex gap-3 ${wide ? `px-5 py-1 hover:bg-muted/50 ${grouped ? "" : "mt-4"}` : ""}`}>
                  {grouped ? <span className="w-10 shrink-0 pt-1 text-center text-[9px] text-muted-foreground opacity-0 group-hover:opacity-100">{time}</span> : <Avatar name={m.username} />}
                  <div className="min-w-0 flex-1">
                    {!grouped && (wide ? <div className="mb-0.5 flex flex-wrap items-baseline gap-2"><span className={`bg-transparent text-sm font-semibold ${color(m.username)?.split(" ")[1]}`}>{m.username}</span><time className="text-[10px] text-muted-foreground" dateTime={m.created_at}>{time}</time></div> : <><time dateTime={m.created_at} className="block text-[11px] text-muted-foreground">{time}</time><p className="mb-2 mt-1 text-sm font-semibold">@{handle(m.username)}</p></>)}
                    <p className={`whitespace-pre-wrap break-words text-sm leading-relaxed ${wide ? "" : "inline-block max-w-full rounded-full border border-hairline-strong bg-background/25 px-5 py-3"}`}>{m.content}</p>
                  </div>
                </article>
              </div>;
            });
          })()}
          <div ref={bottom} />
        </div>
        <form className={`flex shrink-0 items-center gap-3 ${wide ? "p-4 pt-2" : "border-t border-hairline bg-card/40 p-4"}`} onSubmit={e => { e.preventDefault(); void send(); }}>
          <div className={`flex min-w-0 flex-1 items-center gap-3 border border-hairline-strong bg-muted/60 px-4 ${wide ? "rounded-xl" : "rounded-full"}`}>
            {wide && <button type="button" className="text-muted-foreground hover:text-primary disabled:opacity-40" disabled={!account} title="Create a room" aria-label="Create a room" onClick={() => create("public")}><Plus size={20} /></button>}
            <input className="h-12 min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50" aria-label="Message" placeholder={room ? `Message #${room.name}${wide ? "" : "..."}` : "Choose a room to chat"} disabled={!account || !room} maxLength={8000} value={draft} onChange={e => setDraft(e.target.value)} />
          </div>
          <button className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-hairline-strong bg-primary/15 text-primary transition hover:bg-primary hover:text-primary-foreground disabled:opacity-30" aria-label="Send message" disabled={!account || !room || !draft.trim() || busy}><Send size={19} /></button>
        </form>
      </div>
      {wide && showMembers && <aside className="w-60 shrink-0 overflow-y-auto border-l border-hairline bg-card/60 p-4"><h3 className="mb-4 text-[10px] font-semibold tracking-widest text-muted-foreground">ONLINE — {members.length}</h3>{members.map(member => <div key={member.id} className="os-row-hover mb-1 flex items-center gap-3 rounded-lg p-2"><span className="relative"><Avatar name={member.name} small /><span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" /></span><span className="truncate text-sm">{member.name}</span></div>)}{!members.length && <p className="text-xs text-muted-foreground">{room ? "Connecting to presence…" : "Select a channel to see who's here."}</p>}</aside>}
    </div>
  </main>;
  return <div ref={root} className="relative flex h-full w-full min-w-0 overflow-hidden bg-background/60 text-chat-foreground [&_button]:transition-colors [&_button]:disabled:cursor-not-allowed [&_button]:disabled:opacity-40 [&_button]:focus-visible:outline-2 [&_button]:focus-visible:outline-primary">
    {wide ? <>
      <nav aria-label="Servers" className="flex w-[72px] shrink-0 flex-col items-center gap-3 overflow-y-auto border-r border-hairline bg-background/80 py-4">
        {[{ id: "global", name: "kobra · Global" }, ...privateRooms].map(server => { const active = server.id === "global" ? tab === "Global" : room?.id === server.id; return <div className="relative flex w-full justify-center" key={server.id}><span className={`absolute left-0 top-3 w-1 rounded-r-full bg-primary transition-all ${active ? "h-6" : "h-0"}`} /><button title={server.name} aria-label={server.name} aria-pressed={active} onClick={() => { if (server.id === "global") { setTab("Global"); setRoom(publicRooms[0] ?? null); } else select(server.id); }} className={`flex h-12 w-12 items-center justify-center font-semibold transition-all hover:rounded-2xl hover:bg-primary hover:text-primary-foreground ${active ? "rounded-2xl bg-primary text-primary-foreground" : "rounded-full bg-card text-muted-foreground"}`}>{server.id === "global" ? <Globe size={24} /> : initials(server.name)}</button></div>; })}
        <div className="h-px w-8 bg-muted" />
        <button title="Create private room" aria-label="Create private room" disabled={!account} onClick={() => create("private")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-success hover:rounded-2xl hover:bg-success/20"><Plus size={24} /></button>
        <button title="Join private room" aria-label="Join private room" disabled={!account} onClick={() => create("join")} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-card text-success hover:rounded-2xl hover:bg-success/20"><Compass size={24} /></button>
      </nav>
      <aside className="flex w-60 shrink-0 flex-col border-r border-hairline bg-card/75">
        <header className="flex min-h-16 items-center gap-2 border-b border-hairline px-4 font-semibold">{tab === "Rooms" && <LockKeyhole size={17} />}<span className="min-w-0 flex-1 truncate">{tab === "Global" ? "Global" : room?.name ?? "Private rooms"}</span><button className="text-muted-foreground hover:text-primary" disabled={!account} aria-label="Create channel" onClick={() => create(tab === "Global" ? "public" : "private")}><Plus size={18} /></button></header>
        <div className="min-h-0 flex-1 overflow-y-auto p-3"><h3 className="mb-3 mt-3 px-2 text-[10px] font-semibold tracking-widest text-muted-foreground">TEXT CHANNELS</h3>
          {(tab === "Rooms" && room ? [room] : listed).map(r => <button key={r.id} disabled={!account} onClick={() => select(r.id)} className={`os-row-hover mb-1 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm ${room?.id === r.id ? "bg-muted text-chat-foreground" : "text-muted-foreground"} ${!account ? "line-through" : ""}`}><Hash size={19} className="shrink-0" /><span className="truncate">{r.name}</span>{unread.has(r.id) && <span aria-label="Unread messages" className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}</button>)}
          {!listed.length && <p className="px-2 text-xs text-muted-foreground">No rooms yet. Create one to get started.</p>}
          {lockedNames.map(n => <button disabled={!account} key={n} className="os-row-hover mt-2 flex w-full items-center gap-2 rounded-lg p-2 text-left text-xs text-muted-foreground" onClick={() => { setName(n); create("join"); }}><LockKeyhole size={14} />{n} · unlock</button>)}
        </div>
        <div className="border-t border-hairline p-3">{actions}</div>
        <footer className="flex items-center gap-2 border-t border-hairline bg-background/40 p-3"><span className="relative"><Avatar name={displayName} small /><span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-semibold">{displayName}</p><p className="truncate text-[10px] text-muted-foreground">@{handle(displayName)}</p></div><button aria-label="Open settings" className="os-row-hover rounded-lg p-2 text-muted-foreground" onClick={() => os().openApp("settings")}><Settings size={17} /></button></footer>
      </aside>
      {chat}
    </> : room ? chat : <section className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-hairline bg-card/40 p-5"><div className="flex min-w-0 items-center gap-3"><Avatar name={displayName} /><div className="min-w-0"><p className="truncate font-semibold">{displayName}</p><p className="flex items-center gap-1.5 text-xs text-muted-foreground">@{handle(displayName)}{account && <ShieldCheck size={14} className="text-success" />}</p></div></div>{actions}</header>
      <div role="tablist" aria-label="Room sections" className="flex border-b border-hairline bg-card/30">{(["Global", "Rooms"] as const).map(t => <button role="tab" aria-selected={tab === t} key={t} onClick={() => setTab(t)} className={`relative flex flex-1 items-center justify-center gap-2 py-5 text-base font-semibold ${tab === t ? "bg-muted/50 text-chat-foreground after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:bg-primary after:shadow-sm" : "text-muted-foreground hover:bg-muted/30"}`}>{t === "Global" ? <Globe size={19} /> : <Hash size={20} />}{t}</button>)}</div>
      {notice}
      <div className="min-h-0 flex-1 overflow-y-auto p-5"><h2 className="mb-4 text-[11px] font-semibold tracking-widest text-muted-foreground">{tab === "Global" ? "PUBLIC ROOMS" : "PRIVATE ROOMS"}</h2>
        <div className="space-y-3">{listed.map(r => <button key={r.id} disabled={!account} onClick={() => select(r.id)} className="group flex w-full items-center gap-4 rounded-2xl border border-hairline-strong bg-card/70 p-4 text-left shadow-sm backdrop-blur-xl transition hover:border-primary/40 hover:bg-muted/70"><span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-hairline-strong text-xl font-semibold ${color(r.name)}`}>{initials(r.name)}</span><span className="min-w-0 flex-1"><span className={`block truncate font-semibold ${!account ? "line-through" : ""}`}>{r.name}</span><span className="mt-1 block text-xs text-muted-foreground">{tab === "Global" ? "General discussion" : "End-to-end encrypted"}</span></span>{tab === "Global" ? <Globe size={22} className="shrink-0 text-muted-foreground" /> : <LockKeyhole size={21} className="shrink-0 text-success" />}</button>)}
        {tab === "Rooms" && lockedNames.map(n => <button disabled={!account} key={n} className="os-row-hover flex w-full items-center gap-3 rounded-2xl border border-hairline p-4 text-left text-sm text-muted-foreground" onClick={() => { setName(n); create("join"); }}><LockKeyhole size={20} /><span className="flex-1 truncate">{n}</span><span className="text-xs">Unlock</span></button>)}
        {!listed.length && !(tab === "Rooms" && lockedNames.length) && empty}</div>
      </div>
    </section>}
    {error && !mode && <div role="alert" className="absolute inset-x-4 top-20 z-10 flex items-center gap-3 rounded-xl border border-destructive/30 bg-popover p-3 text-sm text-destructive"><span className="flex-1">{error}</span><button aria-label="Dismiss error" onClick={() => setError("")}><X size={16} /></button></div>}
    {mode && account && <div className="absolute inset-0 z-20 flex items-center justify-center overflow-y-auto bg-background/80 p-5 backdrop-blur-md"><form aria-label={mode === "join" ? "Join private room" : "Create room"} className="my-auto flex w-full max-w-sm flex-col gap-4 rounded-3xl border border-hairline-strong bg-popover p-6 shadow-xl" onSubmit={e => { e.preventDefault(); void submitRoom(); }}><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{mode === "join" ? "Join private room" : mode === "private" ? "Private encrypted room" : "New public room"}</h2><button disabled={busy} type="button" aria-label="Close dialog" onClick={() => { setMode(null); setPass(""); setError(""); }}><X size={18} /></button></div><label className="space-y-2 text-xs text-muted-foreground"><span>Room name</span><input autoFocus className="os-input w-full" placeholder="Room name" maxLength={64} required value={name} onChange={e => setName(e.target.value)} /></label>{mode !== "public" && <><label className="space-y-2 text-xs text-muted-foreground"><span>Passkey</span><input className="os-input w-full" type="password" placeholder="Passkey" required value={pass} onChange={e => setPass(e.target.value)} /></label><p className="text-xs leading-relaxed text-muted-foreground">Your passkey never leaves this device. AES-GCM keys are held in memory only; unlock again after closing.</p></>}{error && <p role="alert" className="text-sm text-destructive">{error}</p>}<button className="os-btn-primary justify-center" disabled={busy}>{busy ? "Opening…" : mode === "join" ? "Unlock room" : "Create room"}</button><button disabled={busy} type="button" className="os-btn justify-center" onClick={() => { setMode(null); setPass(""); setError(""); }}>Cancel</button></form></div>}
  </div>;
}

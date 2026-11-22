import { WIDGET_LABELS } from "../shell/Widgets";
import { WALLPAPER_VIDEOS } from "../shell/Wallpaper";
import { useRef, useState } from "react";
import { Check, Cloud, CloudOff, ExternalLink, GraduationCap, LogIn, LogOut, Palette, RefreshCw, ShieldAlert, Sparkles, Upload, UserRound } from "lucide-react";
import { toast } from "sonner";
import { APPS } from "../apps";
import { ACCENTS, CHANGELOG, OS_VERSION } from "../config";
import { signOut } from "../session";
import { CLOAKS, launchAboutBlank } from "../stealth";
import { WIDGET_IDS, useOS, type CursorEffect, type Wallpaper, type Win } from "../store";

type Tab = "preferences" | "school" | "account" | "updates";

const TABS: { id: Tab; label: string; icon: typeof Palette }[] = [
  { id: "preferences", label: "Preferences", icon: Palette },
  { id: "school", label: "School Tools", icon: GraduationCap },
  { id: "account", label: "Account", icon: UserRound },
  { id: "updates", label: "Updates", icon: Sparkles },
];

const WALLPAPERS: { id: Wallpaper; label: string }[] = [
  { id: "snowy", label: "Snowy Campfire" },
  { id: "blackhole", label: "Black Hole" },
];

const EFFECTS: { id: CursorEffect; label: string; hint: string }[] = [
  { id: "cubes", label: "Cubes lift", hint: "Tiles rise toward the cursor" },
  { id: "liquid", label: "Liquid pull", hint: "The grid bends inward" },
  { id: "strings", label: "Strings", hint: "Glowing strings follow you" },
  { id: "off", label: "Off", hint: "Clean static grid" },
];

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-hairline bg-card/60 p-5">
      <h3 className="text-sm font-semibold">{title}</h3>
      {desc && <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Toggle({ on, onChange, label }: { on: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button onClick={() => onChange(!on)} className="flex w-full items-center justify-between rounded-lg px-1 py-1.5 text-sm hover:bg-muted/40" role="switch" aria-checked={on}>
      <span>{label}</span>
      <span className={`relative h-5 w-9 rounded-full transition-colors ${on ? "bg-primary" : "bg-muted"}`}>
        <span className={`absolute top-0.5 size-4 rounded-full bg-foreground transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </button>
  );
}

function Preferences() {
  const s = useOS((st) => st.settings);
  const set = useOS((st) => st.setSettings);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Choose an image file");
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(1, 1920 / img.width);
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      c.getContext("2d")?.drawImage(img, 0, 0, c.width, c.height);
      set({ wallpaper: "custom", customWallpaper: c.toDataURL("image/jpeg", 0.85) });
      URL.revokeObjectURL(url);
      toast.success("Wallpaper set");
    };
    img.src = url;
  };

  return (
    <div className="space-y-4">
      <Section title="Wallpaper" desc="Pick a live wallpaper, upload your own, or draw one in Canvas.">
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {WALLPAPERS.map((w) => (
            <button key={w.id} onClick={() => set({ wallpaper: w.id })} className="group text-left">
              <div className={`relative aspect-video overflow-hidden rounded-lg border-2 transition ${s.wallpaper === w.id ? "border-primary glow" : "border-hairline group-hover:border-hairline-strong"}`}>
                <video src={WALLPAPER_VIDEOS[w.id]} muted loop autoPlay playsInline className="absolute inset-0 size-full object-cover" />
                {s.wallpaper === w.id && <Check className="absolute right-1 top-1 size-3.5 text-primary" />}
              </div>
              <div className="mt-1 text-[11px] text-muted-foreground">{w.label}</div>
            </button>
          ))}
          <button onClick={() => (s.customWallpaper ? set({ wallpaper: "custom" }) : fileRef.current?.click())} className="group text-left">
            <div className={`relative grid aspect-video place-items-center overflow-hidden rounded-lg border-2 border-dashed bg-muted/40 ${s.wallpaper === "custom" ? "border-primary" : "border-hairline-strong"}`}>
              {s.customWallpaper ? <img src={s.customWallpaper} alt="" className="absolute inset-0 size-full object-cover" /> : <Upload className="size-4 text-muted-foreground" />}
            </div>
            <div className="mt-1 text-[11px] text-muted-foreground">Custom art</div>
          </button>
          <button onClick={() => useOS.getState().openApp("paint")} className="group text-left">
            <div className="grid aspect-video place-items-center rounded-lg border-2 border-dashed border-hairline-strong bg-muted/40"><img src="/icons/paint.png" alt="" className="size-7" /></div>
            <div className="mt-1 text-[11px] text-muted-foreground">Draw in Canvas</div>
          </button>
        </div>
        <div className="mt-3 flex gap-2">
          <button className="os-btn" onClick={() => fileRef.current?.click()}><Upload className="size-4" />Upload image</button>
          {s.customWallpaper && <button className="os-btn" onClick={() => set({ customWallpaper: null, wallpaper: s.wallpaper === "custom" ? "snowy" : s.wallpaper })}>Remove custom</button>}
        </div>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
      </Section>

      <Section title="Grid cursor effect">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {EFFECTS.map((e) => (
            <button key={e.id} onClick={() => set({ cursorEffect: e.id })} className={`rounded-xl border p-3 text-left transition ${s.cursorEffect === e.id ? "border-primary bg-primary/10" : "border-hairline hover:bg-muted/40"}`}>
              <div className="text-sm font-medium">{e.label}</div>
              <div className="mt-0.5 text-[11px] text-muted-foreground">{e.hint}</div>
            </button>
          ))}
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Section title="Accent color">
          <div className="flex gap-3">
            {ACCENTS.map((a) => (
              <button key={a} data-accent={a} onClick={() => set({ accent: a })} aria-label={a} title={a} className={`grid size-9 place-items-center rounded-full bg-primary transition ${s.accent === a ? "ring-2 ring-foreground ring-offset-2 ring-offset-background" : "opacity-80 hover:opacity-100"}`}>
                {s.accent === a && <Check className="size-4 text-primary-foreground" />}
              </button>
            ))}
          </div>
        </Section>
        <Section title="Taskbar style">
          <div className="grid grid-cols-2 gap-2">
            {(["dock", "bar"] as const).map((t) => (
              <button key={t} onClick={() => set({ taskbar: t })} className={`rounded-xl border p-3 text-left ${s.taskbar === t ? "border-primary bg-primary/10" : "border-hairline hover:bg-muted/40"}`}>
                <div className="mb-2 flex h-8 items-end justify-center rounded-md bg-muted/60 p-1">
                  {t === "dock" ? <div className="h-2.5 w-2/3 rounded-full bg-foreground/40" /> : <div className="h-2.5 w-full rounded-sm bg-foreground/40" />}
                </div>
                <div className="text-sm font-medium">{t === "dock" ? "Modern Dock" : "Windows Bar"}</div>
              </button>
            ))}
          </div>
        </Section>
        <Section title="Clock">
          <Toggle label="24-hour time" on={s.clock.h24} onChange={(v) => set({ clock: { ...s.clock, h24: v } })} />
          <Toggle label="Show seconds" on={s.clock.seconds} onChange={(v) => set({ clock: { ...s.clock, seconds: v } })} />
          <Toggle label="Show date" on={s.clock.date} onChange={(v) => set({ clock: { ...s.clock, date: v } })} />
          <Toggle label="Center clock in taskbar" on={s.clock.center} onChange={(v) => set({ clock: { ...s.clock, center: v } })} />
        </Section>
        <Section title="Desktop widgets">
          {WIDGET_IDS.map((id) => <Toggle key={id} label={WIDGET_LABELS[id]} on={!!s.widgets[id]} onChange={(v) => set({ widgets: { ...s.widgets, [id]: v } })} />)}
        </Section>
        <Section title="Window title bar">
          <div className="flex gap-2">
            {([["windows", "Windows (stock)"], ["mac", "macOS lights"]] as const).map(([id, label]) => <button key={id} className="os-chip" data-active={s.titleBar === id} onClick={() => set({ titleBar: id })}>{label}</button>)}
          </div>
        </Section>
      </div>

      <Section title="Taskbar apps" desc="Pinned apps appear in the dock. Everything else is in the 6-dots menu.">
        <div className="flex flex-wrap gap-2">
          {APPS.map((a) => (
            <button key={a.id} data-active={s.pinned.includes(a.id)} className="os-chip" onClick={() => useOS.getState().togglePin(a.id)}>
              <img src={a.icon} alt="" className="size-4" />{a.name}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

function School() {
  const s = useOS((st) => st.settings);
  const set = useOS((st) => st.setSettings);
  const [listening, setListening] = useState(false);
  return (
    <div className="space-y-4">
      <Section title="Tab cloaker" desc="Disguise this tab's title and icon.">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <button onClick={() => set({ cloak: "none" })} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${s.cloak === "none" ? "border-primary bg-primary/10" : "border-hairline hover:bg-muted/40"}`}>
            <img src="/favicon.png" alt="" className="size-5" />Off
          </button>
          {(Object.keys(CLOAKS) as (keyof typeof CLOAKS)[]).map((k) => (
            <button key={k} onClick={() => set({ cloak: k })} className={`flex items-center gap-2 rounded-xl border p-3 text-sm ${s.cloak === k ? "border-primary bg-primary/10" : "border-hairline hover:bg-muted/40"}`}>
              <img src={CLOAKS[k].icon} alt="" className="size-5" />{CLOAKS[k].label}
            </button>
          ))}
        </div>
      </Section>
      <Section title="about:blank launcher" desc="Opens kobra os inside a clean about:blank tab so it doesn't show up in your history.">
        <button className="os-btn os-btn-primary" onClick={() => { if (!launchAboutBlank()) toast.error("Pop-up blocked — allow pop-ups for this site"); }}>
          <ExternalLink className="size-4" />Launch in about:blank
        </button>
      </Section>
      <Section title="Panic key" desc="One key press hides everything instantly.">
        <Toggle label="Enable panic key" on={s.panic.enabled} onChange={(v) => set({ panic: { ...s.panic, enabled: v } })} />
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <div>
            <div className="os-label mb-1.5">Key</div>
            <button
              className={`os-input text-left font-mono ${listening ? "border-primary" : ""}`}
              onClick={() => setListening(true)}
              onKeyDown={(e) => { if (!listening) return; e.preventDefault(); e.stopPropagation(); set({ panic: { ...s.panic, key: e.key } }); setListening(false); }}
              onBlur={() => setListening(false)}
            >
              {listening ? "Press any key…" : s.panic.key === " " ? "Space" : s.panic.key}
            </button>
          </div>
          <div>
            <div className="os-label mb-1.5">Action</div>
            <div className="flex gap-2">
              <button className="os-chip" data-active={s.panic.action === "minimize"} onClick={() => set({ panic: { ...s.panic, action: "minimize" } })}>Minimize all</button>
              <button className="os-chip" data-active={s.panic.action === "redirect"} onClick={() => set({ panic: { ...s.panic, action: "redirect" } })}>Go to a site</button>
            </div>
          </div>
        </div>
        {s.panic.action === "redirect" && (
          <div className="mt-3">
            <div className="os-label mb-1.5">Redirect to</div>
            <input className="os-input" value={s.panic.url} onChange={(e) => set({ panic: { ...s.panic, url: e.target.value } })} placeholder="https://classroom.google.com" />
          </div>
        )}
        <p className="mt-3 flex items-center gap-1.5 text-[11px] text-muted-foreground"><ShieldAlert className="size-3.5" />Single-character keys are ignored while you're typing in a text box.</p>
      </Section>
    </div>
  );
}

function Account() {
  const user = useOS((s) => s.user);
  const sync = useOS((s) => s.syncStatus);
  const signIn = () => { useOS.getState().setAuthRequested(true); useOS.getState().setPhase("lock"); };
  const switchGuest = async () => { await signOut(); };
  return (
    <div className="space-y-4">
      <Section title="Signed in as">
        <div className="flex items-center gap-4">
          <div className="grid size-14 place-items-center rounded-full bg-primary text-xl font-bold text-primary-foreground glow">{user?.kind === "account" ? user.name[0]?.toUpperCase() : "G"}</div>
          <div className="flex-1">
            <div className="font-medium">{user?.kind === "account" ? user.name : "Guest"}</div>
            <div className="text-xs text-muted-foreground">{user?.kind === "account" ? user.email : "Saved on this device only"}</div>
          </div>
          {user?.kind === "account" ? (
            <span className={`os-chip ${sync === "error" ? "text-destructive" : "text-success"}`}>
              {sync === "error" ? <CloudOff className="size-3.5" /> : sync === "syncing" ? <RefreshCw className="size-3.5 animate-spin" /> : <Cloud className="size-3.5" />}
              {sync === "error" ? "Sync paused" : sync === "syncing" ? "Syncing" : "Synced"}
            </span>
          ) : (
            <span className="os-chip"><CloudOff className="size-3.5" />Local only</span>
          )}
        </div>
      </Section>
      <Section title={user?.kind === "account" ? "Cloud sync" : "Get an account"} desc={user?.kind === "account" ? "Settings, window layout, files, notes, code and your movie list follow you to every device." : "Accounts sync everything across devices and unlock public chat rooms."}>
        <div className="flex flex-wrap gap-2">
          {user?.kind === "account" ? (
            <>
              <button className="os-btn" onClick={() => void switchGuest()}><UserRound className="size-4" />Switch to Guest</button>
              <button className="os-btn os-btn-danger" onClick={() => void signOut()}><LogOut className="size-4" />Sign out</button>
            </>
          ) : (
            <button className="os-btn os-btn-primary" onClick={signIn}><LogIn className="size-4" />Sign in or create account</button>
          )}
        </div>
      </Section>
    </div>
  );
}

function Updates() {
  const [checking, setChecking] = useState(false);
  return (
    <div className="space-y-4">
      <Section title="kobra os">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-3xl font-semibold tracking-tight">v{OS_VERSION}</div>
            <div className="text-xs text-muted-foreground">You're up to date. Updates install automatically.</div>
          </div>
          <button className="os-btn" disabled={checking} onClick={() => { setChecking(true); setTimeout(() => { setChecking(false); toast.success("kobra os is up to date"); }, 1200); }}>
            <RefreshCw className={`size-4 ${checking ? "animate-spin" : ""}`} />Check for updates
          </button>
        </div>
      </Section>
      <Section title="Changelog">
        <div className="space-y-5">
          {CHANGELOG.map((c) => (
            <div key={c.version}>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold">v{c.version}</span>
                <span className="os-chip">{c.kind}</span>
                <span className="text-xs text-muted-foreground">{c.date}</span>
              </div>
              <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                {c.notes.map((n) => <li key={n} className="flex gap-2"><span className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{n}</li>)}
              </ul>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

export default function SettingsApp({ win }: { win: Win }) {
  const [tab, setTab] = useState<Tab>((win.props?.["tab"] as Tab) ?? "preferences");
  return (
    <div className="flex h-full">
      <nav className="w-52 shrink-0 border-r border-hairline bg-sidebar p-3">
        <div className="mb-3 px-2 pt-1 text-xs font-medium text-muted-foreground">Settings</div>
        {TABS.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)} className={`mb-0.5 flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors ${tab === t.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}>
            <t.icon className="size-4" />{t.label}
          </button>
        ))}
      </nav>
      <div className="min-w-0 flex-1 overflow-y-auto p-5">
        <h2 className="mb-4 text-xl font-semibold">{TABS.find((t) => t.id === tab)?.label}</h2>
        {tab === "preferences" && <Preferences />}
        {tab === "school" && <School />}
        {tab === "account" && <Account />}
        {tab === "updates" && <Updates />}
      </div>
    </div>
  );
}

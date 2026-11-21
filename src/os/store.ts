import { create } from "zustand";
import { APPS, DEFAULT_PINNED, appById, type AppId } from "./apps";
import { OS_VERSION, type Accent } from "./config";

/* ---------- types ---------- */

export type Wallpaper = "snowy" | "blackhole" | "custom";
export type CursorEffect = "cubes" | "liquid" | "strings" | "off";
export type Cloak = "none" | "drive" | "classroom" | "canvas";

export type Settings = {
  wallpaper: Wallpaper;
  customWallpaper: string | null; // data URL
  cursorEffect: CursorEffect;
  accent: Accent;
  taskbar: "dock" | "bar";
  /** Where the dock / bar sits. */
  barPosition: "bottom" | "left";
  /** Screen animations (cursor effects, window motion). Off unless the user turns them on. */
  animations: boolean;
  clock: { h24: boolean; seconds: boolean; date: boolean; center: boolean };
  widgets: { clock: boolean; weather: boolean; sticky: boolean };
  /** Each widget cycles large square -> rectangle -> small square. */
  widgetSizes: Record<string, WidgetSize>;
  pinned: AppId[];
  hiddenDesktop: AppId[];
  cloak: Cloak;
  panic: { enabled: boolean; key: string; action: "minimize" | "redirect"; url: string };
  weatherCity: { name: string; lat: number; lon: number };
  lastSeenVersion: string;
  schema: number;
};

export type WidgetSize = "lg" | "wide" | "sm";
/** Bump when defaults change in a way that must override older saved settings. */
export const SETTINGS_SCHEMA = 2;

export type Win = {
  id: string;
  app: AppId;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  minimized: boolean;
  maximized: boolean;
  snap: "left" | "right" | null;
  props?: Record<string, unknown>;
};

export type FsNode = { type: "dir" | "file"; content?: string; mtime: number };
export type Fs = Record<string, FsNode>; // absolute paths, e.g. "/Documents/hello.txt"

export type MediaItem = { id: number; type: "movie" | "tv"; title: string; poster: string | null; addedAt: number };
export type MediaProgress = { id: number; type: "movie" | "tv"; title: string; poster: string | null; season?: number; episode?: number; position: number; duration: number; updatedAt: number };

export type UserData = {
  fs: Fs;
  sticky: string;
  widgetPos: Record<string, { x: number; y: number }>;
  myList: MediaItem[];
  progress: Record<string, MediaProgress>; // key `${type}:${id}`
  recentGames: string[];
  favGames: string[];
};

export type User = { kind: "guest" } | { kind: "account"; id: string; name: string; email: string | null };
export type Phase = "boot" | "lock" | "desktop" | "sleep" | "restarting" | "shutdown" | "updating";

/* ---------- defaults ---------- */

export const defaultSettings = (): Settings => ({
  wallpaper: "snowy",
  customWallpaper: null,
  cursorEffect: "off",
  accent: "white",
  taskbar: "dock",
  barPosition: "bottom",
  animations: false,
  clock: { h24: false, seconds: false, date: true, center: true },
  widgets: { clock: false, weather: false, sticky: false },
  widgetSizes: {},
  pinned: [...DEFAULT_PINNED],
  hiddenDesktop: [],
  cloak: "none",
  panic: { enabled: true, key: "`", action: "minimize", url: "https://classroom.google.com" },
  weatherCity: { name: "Edmonton", lat: 53.5461, lon: -113.4938 },
  lastSeenVersion: OS_VERSION,
  schema: SETTINGS_SCHEMA,
});

/** Applies the newer defaults the user asked for on top of settings saved by older versions. */
export function migrateSettings(saved: Partial<Settings> | undefined): Partial<Settings> | undefined {
  if (!saved || (saved.schema ?? 1) >= SETTINGS_SCHEMA) return saved;
  const d = defaultSettings();
  return { ...saved, accent: d.accent, widgets: d.widgets, wallpaper: saved.wallpaper === "custom" || saved.wallpaper === "blackhole" ? saved.wallpaper : d.wallpaper, cursorEffect: d.cursorEffect, animations: false, pinned: d.pinned, schema: SETTINGS_SCHEMA };
}

const now = () => Date.now();
export const defaultFs = (): Fs => ({
  "/": { type: "dir", mtime: now() },
  "/Desktop": { type: "dir", mtime: now() },
  "/Documents": { type: "dir", mtime: now() },
  "/Documents/welcome.md": {
    type: "file",
    mtime: now(),
    content: "# welcome to kobra os\n\nEverything here autosaves. Sign in with PIN `000` to sync across devices.",
  },
  "/Notes": { type: "dir", mtime: now() },
  "/Notes/Quick note.md": { type: "file", mtime: now(), content: "# Quick note\n\n- [ ] turn on screen animations in Settings\n- [ ] press ` to panic" },
  "/Code": { type: "dir", mtime: now() },
  "/Code/hello.js": { type: "file", mtime: now(), content: "// hello from kobra os\nfunction greet(name) {\n  return `hey ${name}`;\n}\n\nconsole.log(greet('world'));\n" },
  "/Pictures": { type: "dir", mtime: now() },
  "/Downloads": { type: "dir", mtime: now() },
});

export const defaultData = (): UserData => ({
  fs: defaultFs(),
  sticky: "**sticky note**\n\ntype anything here…",
  widgetPos: {},
  myList: [],
  progress: {},
  recentGames: [],
  favGames: [],
});

/* ---------- path helpers ---------- */

export const normPath = (p: string) => {
  const parts: string[] = [];
  for (const seg of p.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") parts.pop();
    else parts.push(seg);
  }
  return "/" + parts.join("/");
};
export const parentOf = (p: string) => normPath(p.split("/").slice(0, -1).join("/") || "/");
export const baseName = (p: string) => p.split("/").filter(Boolean).pop() ?? "/";
export const listDir = (fs: Fs, dir: string) => {
  const d = normPath(dir);
  const prefix = d === "/" ? "/" : d + "/";
  return Object.keys(fs)
    .filter((k) => k !== d && k.startsWith(prefix) && !k.slice(prefix.length).includes("/"))
    .map((path) => ({ path, name: baseName(path), ...fs[path]! }))
    .sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
};

/* ---------- store ---------- */

let winSeq = 0;
const newId = () => `w${Date.now().toString(36)}${(winSeq++).toString(36)}`;

type OSState = {
  phase: Phase;
  user: User | null;
  bootedAt: number;
  settings: Settings;
  data: UserData;
  windows: Win[];
  zTop: number;
  launcherOpen: boolean;
  authRequested: boolean;
  syncStatus: "local" | "syncing" | "synced" | "error";
  /** Local-only, never synced (camera photos can be large). */
  photos: string[];

  setPhase: (p: Phase) => void;
  setUser: (u: User | null) => void;
  setLauncher: (open: boolean) => void;
  setAuthRequested: (v: boolean) => void;
  setSyncStatus: (s: OSState["syncStatus"]) => void;
  hydrate: (s: { settings?: Partial<Settings>; data?: Partial<UserData>; windows?: Win[] }) => void;
  resetSession: () => void;

  setSettings: (patch: Partial<Settings> | ((s: Settings) => Partial<Settings>)) => void;
  setData: (patch: Partial<UserData> | ((d: UserData) => Partial<UserData>)) => void;

  openApp: (app: AppId, props?: Record<string, unknown>) => string;
  closeWin: (id: string) => void;
  closeAll: () => void;
  focusWin: (id: string) => void;
  minimizeWin: (id: string) => void;
  minimizeAll: () => void;
  toggleMax: (id: string) => void;
  updateWin: (id: string, patch: Partial<Win>) => void;

  togglePin: (app: AppId) => void;
  toggleHidden: (app: AppId) => void;

  writeFile: (path: string, content: string) => void;
  mkdir: (path: string) => void;
  removePath: (path: string) => void;
  renamePath: (from: string, to: string) => void;

  addPhoto: (dataUrl: string) => void;
  removePhoto: (i: number) => void;
};

export const useOS = create<OSState>((set, get) => ({
  phase: "boot",
  user: null,
  bootedAt: Date.now(),
  settings: defaultSettings(),
  data: defaultData(),
  windows: [],
  zTop: 10,
  launcherOpen: false,
  authRequested: false,
  syncStatus: "local",
  photos: [],

  setPhase: (phase) => set({ phase, launcherOpen: false }),
  setUser: (user) => set({ user }),
  setLauncher: (launcherOpen) => set({ launcherOpen }),
  setAuthRequested: (authRequested) => set({ authRequested }),
  setSyncStatus: (syncStatus) => set({ syncStatus }),
  hydrate: ({ settings, data, windows }) =>
    set((s) => ({
      settings: { ...defaultSettings(), ...s.settings, ...(migrateSettings(settings) ?? {}) },
      data: { ...defaultData(), ...(data ?? {}), fs: { ...defaultFs(), ...(data?.fs ?? {}) } },
      windows: (windows ?? []).filter((w) => appById(w.app)),
      zTop: Math.max(10, ...(windows ?? []).map((w) => w.z)) + 1,
    })),
  resetSession: () => set({ settings: defaultSettings(), data: defaultData(), windows: [], zTop: 10, photos: [] }),

  setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...(typeof patch === "function" ? patch(s.settings) : patch) } })),
  setData: (patch) => set((s) => ({ data: { ...s.data, ...(typeof patch === "function" ? patch(s.data) : patch) } })),

  openApp: (app, props) => {
    const meta = appById(app) ?? APPS[0]!;
    const existing = get().windows.find((w) => w.app === app && !props);
    if (existing) {
      get().focusWin(existing.id);
      if (existing.minimized) get().updateWin(existing.id, { minimized: false });
      set({ launcherOpen: false });
      return existing.id;
    }
    const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
    const vh = typeof window !== "undefined" ? window.innerHeight : 800;
    const w = Math.min(meta.w, vw - 40);
    const h = Math.min(meta.h, vh - 120);
    const n = get().windows.length;
    const id = newId();
    const z = get().zTop + 1;
    const win: Win = {
      id, app, title: meta.name, w, h, z,
      x: Math.max(10, Math.round((vw - w) / 2) + ((n * 28) % 160) - 60),
      y: Math.max(10, Math.round((vh - h) / 2.4) + ((n * 24) % 120) - 40),
      minimized: false, maximized: false, snap: null, ...(props ? { props } : {}),
    };
    set((s) => ({ windows: [...s.windows, win], zTop: z, launcherOpen: false }));
    return id;
  },
  closeWin: (id) => set((s) => ({ windows: s.windows.filter((w) => w.id !== id) })),
  closeAll: () => set({ windows: [] }),
  focusWin: (id) =>
    set((s) => {
      const w = s.windows.find((x) => x.id === id);
      if (!w || w.z === s.zTop) return {};
      const z = s.zTop + 1;
      return { zTop: z, windows: s.windows.map((x) => (x.id === id ? { ...x, z } : x)) };
    }),
  minimizeWin: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, minimized: true } : w)) })),
  minimizeAll: () => set((s) => ({ windows: s.windows.map((w) => ({ ...w, minimized: true })), launcherOpen: false })),
  toggleMax: (id) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, maximized: !w.maximized, snap: null } : w)) })),
  updateWin: (id, patch) => set((s) => ({ windows: s.windows.map((w) => (w.id === id ? { ...w, ...patch } : w)) })),

  togglePin: (app) =>
    get().setSettings((st) => ({ pinned: st.pinned.includes(app) ? st.pinned.filter((a) => a !== app) : [...st.pinned, app] })),
  toggleHidden: (app) =>
    get().setSettings((st) => ({ hiddenDesktop: st.hiddenDesktop.includes(app) ? st.hiddenDesktop.filter((a) => a !== app) : [...st.hiddenDesktop, app] })),

  writeFile: (path, content) =>
    set((s) => {
      const p = normPath(path);
      const fs = { ...s.data.fs };
      // ensure parents
      let parent = parentOf(p);
      while (parent !== "/" && !fs[parent]) { fs[parent] = { type: "dir", mtime: Date.now() }; parent = parentOf(parent); }
      fs[p] = { type: "file", content, mtime: Date.now() };
      return { data: { ...s.data, fs } };
    }),
  mkdir: (path) =>
    set((s) => {
      const p = normPath(path);
      if (s.data.fs[p]) return {};
      return { data: { ...s.data, fs: { ...s.data.fs, [p]: { type: "dir", mtime: Date.now() } } } };
    }),
  removePath: (path) =>
    set((s) => {
      const p = normPath(path);
      if (p === "/") return {};
      const fs = Object.fromEntries(Object.entries(s.data.fs).filter(([k]) => k !== p && !k.startsWith(p + "/")));
      return { data: { ...s.data, fs } };
    }),
  renamePath: (from, to) =>
    set((s) => {
      const a = normPath(from), b = normPath(to);
      if (a === "/" || s.data.fs[b]) return {};
      const fs: Fs = {};
      for (const [k, v] of Object.entries(s.data.fs)) {
        if (k === a) fs[b] = { ...v, mtime: Date.now() };
        else if (k.startsWith(a + "/")) fs[b + k.slice(a.length)] = v;
        else fs[k] = v;
      }
      return { data: { ...s.data, fs } };
    }),

  addPhoto: (dataUrl) => set((s) => ({ photos: [dataUrl, ...s.photos].slice(0, 24) })),
  removePhoto: (i) => set((s) => ({ photos: s.photos.filter((_, j) => j !== i) })),
}));

/** Non-react access for event handlers / AI actions. */
export const os = () => useOS.getState();

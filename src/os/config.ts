export const OS_NAME = "kobra os";
export const OS_VERSION = "3.1.0";

export type ChangelogEntry = { version: string; date: string; kind: "patch" | "minor" | "major"; notes: string[] };

/** Newest first. Bump rules: bug fix +0.0.1, UI/feature revamp +0.1.0, system overhaul +1.0.0. */
export const CHANGELOG: ChangelogEntry[] = [
  {
    version: "3.1.0",
    date: "2026-11-23",
    kind: "minor",
    notes: [
      "Four live wallpapers (Snowy Campfire, Black Hole, Tom Nook, Celestial Veil) — first visit picks one at random",
      "Messages looks like iPhone Messages, Movies looks like Netflix with profiles and full playback",
      "New full-screen app launcher, Snap Layouts, notifications and Task Manager",
      "Maximized windows reach the bottom edge with a compact floating dock",
      "Game Store with Play Now and Install to OS, ChatGPT-style assistant with code downloads",
      "Browser loads sites through the built-in proxy and searches with DuckDuckGo",
      "Terminal removed; drag apps out of the dock to put them on the desktop",
    ],
  },
  {
    version: "3.0.0",
    date: "2026-11-21",
    kind: "major",
    notes: [
      "New stock video wallpapers: Snowy Campfire and Black Hole",
      "Messages is now Carrot Chat and Movies is now PICKL(movies) with new icons",
      "AI assistant pinned to the dock",
    ],
  },
  {
    version: "2.4.0",
    date: "2026-11-20",
    kind: "minor",
    notes: [
      "New Windows-style lock screen and a clean desktop with a rain forest video wallpaper",
      "Smaller dock with an option to move it to the left side",
      "Movies now plays full movies, shows and anime with season and episode pickers",
      "Browser redesigned like Chrome and powered by Scramjet",
      "Messages turns into a Discord-style layout when maximized, with emoji",
      "Widgets are optional and resize from large to wide to small",
    ],
  },
  {
    version: "2.3.8",
    date: "2026-11-19",
    kind: "major",
    notes: [
      "Brand new desktop with cursor-reactive grid (cubes lift, liquid pull, strings)",
      "Terminal boot + hybrid lock screen with guest PIN 123 and account PIN 000",
      "Account sync for settings, window layout, files, notes and code",
      "Games, Movies, Messages, Assistant (AI) and 10 more apps pre-installed",
      "School tools: tab cloaker, about:blank launcher and panic key",
    ],
  },
];

export const ACCENTS = ["white", "blue", "violet", "emerald", "amber", "rose"] as const;
export type Accent = (typeof ACCENTS)[number];

export const SIMPLE_PROXY_URL = "https://simple-proxy.sweatyballslove.workers.dev/";

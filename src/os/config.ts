export const OS_NAME = "kobra os";
export const OS_VERSION = "2.4.0";

export type ChangelogEntry = { version: string; date: string; kind: "patch" | "minor" | "major"; notes: string[] };

/** Newest first. Bump rules: bug fix +0.0.1, UI/feature revamp +0.1.0, system overhaul +1.0.0. */
export const CHANGELOG: ChangelogEntry[] = [
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

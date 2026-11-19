export type AppId =
  | "games" | "camera" | "messages" | "browser" | "code" | "files" | "notes"
  | "calculator" | "paint" | "weather" | "terminal" | "settings" | "assistant" | "movies";

export type AppMeta = { id: AppId; name: string; icon: string; w: number; h: number; keywords?: string };

export const APPS: AppMeta[] = [
  { id: "games", name: "Games", icon: "/icons/games.png", w: 1040, h: 680, keywords: "play arcade" },
  { id: "camera", name: "Camera", icon: "/icons/camera.png", w: 760, h: 560, keywords: "photo webcam" },
  { id: "messages", name: "Messages", icon: "/icons/messages.png", w: 900, h: 600, keywords: "chat rooms" },
  { id: "movies", name: "Movies", icon: "/icons/movies.png", w: 1080, h: 700, keywords: "tv shows film" },
  { id: "browser", name: "Browser", icon: "/icons/chrome.png", w: 1040, h: 680, keywords: "web internet chrome" },
  { id: "code", name: "Code Editor", icon: "/icons/vscode.png", w: 960, h: 620, keywords: "vscode editor" },
  { id: "files", name: "Files", icon: "/icons/finder.png", w: 820, h: 540, keywords: "finder explorer" },
  { id: "notes", name: "Notes", icon: "/icons/notes.png", w: 780, h: 540, keywords: "markdown" },
  { id: "calculator", name: "Calculator", icon: "/icons/calculator.png", w: 320, h: 500, keywords: "math" },
  { id: "paint", name: "Canvas", icon: "/icons/paint.png", w: 900, h: 620, keywords: "paint draw" },
  { id: "weather", name: "Weather", icon: "/icons/weather.png", w: 760, h: 560, keywords: "forecast" },
  { id: "terminal", name: "Terminal", icon: "/icons/terminal.png", w: 760, h: 480, keywords: "shell ksh" },
  { id: "settings", name: "Settings", icon: "/icons/settings.png", w: 900, h: 620, keywords: "preferences" },
  { id: "assistant", name: "Assistant (AI)", icon: "/icons/assistant.png", w: 520, h: 640, keywords: "ai help" },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);

export const DEFAULT_PINNED: AppId[] = ["games", "camera", "messages"];

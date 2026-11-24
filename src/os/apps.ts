export type AppId =
  | "games" | "camera" | "messages" | "browser" | "code" | "files" | "notes"
  | "calculator" | "paint" | "weather" | "settings" | "assistant" | "movies"
  | "taskmanager" | "imageviewer";

export type AppMeta = { id: AppId; name: string; icon: string; w: number; h: number; keywords?: string; hidden?: boolean };

export const APPS: AppMeta[] = [
  { id: "assistant", name: "Assistant", icon: "/icons/assistant.svg", w: 760, h: 640, keywords: "ai assistant help chat gpt" },
  { id: "browser", name: "Chrome", icon: "/icons/chrome.png", w: 1080, h: 700, keywords: "web internet browser search" },
  { id: "movies", name: "Movies", icon: "/icons/movies.png", w: 1120, h: 720, keywords: "tv shows film anime netflix" },
  { id: "games", name: "Game Store", icon: "/icons/games.png", w: 1080, h: 700, keywords: "play arcade games store" },
  { id: "messages", name: "Messages", icon: "/icons/messages.png", w: 920, h: 620, keywords: "chat rooms imessage" },
  { id: "camera", name: "Camera", icon: "/icons/camera.png", w: 760, h: 560, keywords: "photo webcam" },
  { id: "files", name: "Files", icon: "/icons/finder.png", w: 840, h: 560, keywords: "finder explorer" },
  { id: "notes", name: "Notes", icon: "/icons/notes.png", w: 780, h: 540, keywords: "markdown" },
  { id: "code", name: "Code Editor", icon: "/icons/vscode.png", w: 980, h: 640, keywords: "vscode editor" },
  { id: "calculator", name: "Calculator", icon: "/icons/calculator.png", w: 320, h: 500, keywords: "math" },
  { id: "paint", name: "Canvas", icon: "/icons/paint.png", w: 900, h: 620, keywords: "paint draw" },
  { id: "weather", name: "Weather", icon: "/icons/weather.png", w: 760, h: 560, keywords: "forecast" },
  { id: "taskmanager", name: "Task Manager", icon: "/icons/taskmanager.svg", w: 560, h: 480, keywords: "processes memory end task" },
  { id: "imageviewer", name: "Image Viewer", icon: "/icons/imageviewer.svg", w: 820, h: 600, keywords: "pictures photos zoom" },
  { id: "settings", name: "Settings", icon: "/icons/settings.png", w: 920, h: 640, keywords: "preferences" },
];

export const appById = (id: string) => APPS.find((a) => a.id === id);
export const isAppId = (id: string): id is AppId => APPS.some((a) => a.id === id);

export const DEFAULT_PINNED: AppId[] = ["assistant", "browser", "files", "messages", "movies", "games", "settings"];

import { lazy, Suspense, type ComponentType } from "react";
import type { AppId } from "./apps";
import type { Win } from "./store";

const map: Record<AppId, ComponentType<{ win: Win }>> = {
  games: lazy(() => import("./apps/Games")),
  camera: lazy(() => import("./apps/Camera")),
  messages: lazy(() => import("./apps/Messages")),
  movies: lazy(() => import("./apps/Movies")),
  browser: lazy(() => import("./apps/Browser")),
  code: lazy(() => import("./apps/CodeEditor")),
  files: lazy(() => import("./apps/Files")),
  notes: lazy(() => import("./apps/Notes")),
  calculator: lazy(() => import("./apps/Calculator")),
  paint: lazy(() => import("./apps/Paint")),
  weather: lazy(() => import("./apps/Weather")),
  settings: lazy(() => import("./apps/Settings")),
  assistant: lazy(() => import("./apps/Assistant")),
  taskmanager: lazy(() => import("./apps/TaskManager")),
  imageviewer: lazy(() => import("./apps/ImageViewer")),
};

export function AppHost({ win }: { win: Win }) {
  const C = map[win.app];
  return (
    <Suspense fallback={<div className="grid h-full place-items-center"><div className="size-6 rounded-full border-2 border-primary border-t-transparent animate-spin-slow" /></div>}>
      <C win={win} />
    </Suspense>
  );
}

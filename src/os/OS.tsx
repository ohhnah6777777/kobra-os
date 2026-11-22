import { useCallback, useEffect, useState } from "react";
import { Image, LayoutGrid, LayoutDashboard, Minimize2, Settings2 } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { OS_VERSION } from "./config";
import { startPersistence } from "./persistence";
import { useStealth } from "./stealth";
import { useOS } from "./store";
import { Boot } from "./shell/Boot";
import { LockScreen } from "./shell/LockScreen";
import { Wallpaper } from "./shell/Wallpaper";
import { DesktopClock } from "./shell/DesktopClock";
import { Widgets } from "./shell/Widgets";
import { SnapPreview, WindowFrame } from "./shell/Window";
import { Dock, WindowsBar } from "./shell/Taskbar";
import { Launcher } from "./shell/Launcher";
import { ContextMenuLayer, useMenu } from "./shell/ContextMenu";
import { PropertiesDialog } from "./shell/Properties";
import { DesktopIcons, DockDragGhost } from "./shell/DesktopIcons";
import { WallpaperFlyout, useWallpaperFlyout } from "./shell/WallpaperFlyout";
import { ChangelogModal, RestartOverlay, ShutdownOverlay, SleepOverlay, UpdatingOverlay } from "./shell/Overlays";
import { initScramjet } from "./lib/scramjet";

function Desktop() {
  const windows = useOS((s) => s.windows);
  const taskbar = useOS((s) => s.settings.taskbar);
  const [snap, setSnap] = useState<"left" | "right" | "max" | null>(null);

  const onContext = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("[data-window],[data-widget],[data-dock],button,input,textarea")) return;
    e.preventDefault();
    const st = useOS.getState();
    useMenu.getState().show(e.clientX, e.clientY, [
      { label: "Change wallpaper", icon: <Image />, onSelect: () => useWallpaperFlyout.getState().show(e.clientX, e.clientY) },
      { label: "Add widgets", icon: <LayoutDashboard />, onSelect: () => st.openApp("settings", { tab: "preferences" }) },
      { label: "Open launcher", icon: <LayoutGrid />, onSelect: () => st.setLauncher(true) },
      { label: "Minimize all windows", icon: <Minimize2 />, onSelect: () => st.minimizeAll() },
      "sep",
      { label: "Settings", icon: <Settings2 />, onSelect: () => st.openApp("settings") },
    ]);
  };

  return (
    <div className="fixed inset-0" onContextMenu={onContext}>
      <DesktopClock />
      <DesktopIcons />
      <Widgets />
      <SnapPreview side={snap} />
      {windows.map((w) => <WindowFrame key={w.id} win={w} onSnapPreview={setSnap} />)}
      {taskbar === "dock" ? <Dock /> : <WindowsBar />}
      <Launcher />
      <DockDragGhost />
      <WallpaperFlyout />
    </div>
  );
}

export function KobraOS() {
  const phase = useOS((s) => s.phase);
  const user = useOS((s) => s.user);
  const accent = useOS((s) => s.settings.accent);
  const [changelog, setChangelog] = useState(false);
  useStealth();

  useEffect(() => startPersistence(), []);
  useEffect(() => { void initScramjet(); }, []);
  useEffect(() => {
    document.documentElement.dataset["accent"] = accent;
  }, [accent]);
  useEffect(() => {
    if ((phase === "desktop" || phase === "sleep") && !user) useOS.getState().setPhase("lock");
  }, [phase, user]);

  const toLock = useCallback(() => useOS.getState().setPhase("lock"), []);
  const afterRestart = useCallback(() => { useOS.getState().setUser(null); useOS.getState().setPhase("boot"); }, []);
  const afterUpdate = useCallback(() => {
    const st = useOS.getState();
    st.setSettings({ lastSeenVersion: OS_VERSION });
    st.setPhase("desktop");
    setChangelog(true);
  }, []);

  const showDesktop = phase === "desktop" || phase === "sleep";

  return (
    <div className="fixed inset-0 select-none overflow-hidden font-sans text-foreground [&_input]:select-text [&_textarea]:select-text">
      <Wallpaper />
      {showDesktop && <Desktop />}
      {phase === "lock" && <LockScreen />}
      {phase === "boot" && <Boot onDone={toLock} />}
      {phase === "sleep" && <SleepOverlay />}
      {phase === "restarting" && <RestartOverlay onDone={afterRestart} />}
      {phase === "shutdown" && <ShutdownOverlay onPower={() => useOS.getState().setPhase("boot")} />}
      {phase === "updating" && <UpdatingOverlay onDone={afterUpdate} />}
      {changelog && phase === "desktop" && <ChangelogModal onClose={() => setChangelog(false)} />}
      <ContextMenuLayer />
      <PropertiesDialog />
      <Toaster position="top-right" theme="dark" />
    </div>
  );
}

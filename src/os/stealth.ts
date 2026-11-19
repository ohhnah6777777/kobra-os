import { useEffect } from "react";
import { useOS, type Cloak } from "./store";

export const CLOAKS: Record<Exclude<Cloak, "none">, { title: string; icon: string; label: string }> = {
  drive: { label: "Google Drive", title: "My Drive - Google Drive", icon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
  classroom: { label: "Google Classroom", title: "Home", icon: "https://ssl.gstatic.com/classroom/favicon.png" },
  canvas: { label: "Canvas LMS", title: "Dashboard", icon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
};

function setFavicon(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = href;
}

/** Applies the tab cloak and wires the panic key. Mount once. */
export function useStealth() {
  const cloak = useOS((s) => s.settings.cloak);
  const panic = useOS((s) => s.settings.panic);

  useEffect(() => {
    if (cloak === "none") {
      document.title = "kobra os";
      setFavicon("/favicon.png");
      return;
    }
    const c = CLOAKS[cloak];
    document.title = c.title;
    setFavicon(c.icon);
    // keep title stable if something else changes it
    const t = setInterval(() => { if (document.title !== c.title) document.title = c.title; }, 1500);
    return () => clearInterval(t);
  }, [cloak]);

  useEffect(() => {
    if (!panic.enabled || !panic.key) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== panic.key) return;
      const t = e.target as HTMLElement | null;
      const typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (typing && panic.key.length === 1) return;
      e.preventDefault();
      if (panic.action === "redirect") window.location.replace(panic.url || "https://classroom.google.com");
      else useOS.getState().minimizeAll();
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [panic]);
}

/** Opens kobra os inside a clean about:blank tab so the real URL stays out of history. */
export function launchAboutBlank() {
  const w = window.open("about:blank", "_blank");
  if (!w) return false;
  const d = w.document;
  d.title = useOS.getState().settings.cloak !== "none" ? CLOAKS[useOS.getState().settings.cloak as Exclude<Cloak, "none">].title : "about:blank";
  const style = d.createElement("style");
  style.textContent = "html,body{margin:0;height:100%;background:#000;overflow:hidden}iframe{border:0;width:100%;height:100%}";
  d.head.appendChild(style);
  const f = d.createElement("iframe");
  f.src = window.location.origin + "/";
  f.allow = "camera; microphone; fullscreen; autoplay; clipboard-read; clipboard-write; gamepad";
  d.body.appendChild(f);
  return true;
}

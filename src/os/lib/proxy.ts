import { SIMPLE_PROXY_URL } from "../config";

export type ProxyEngine = "off" | "scramjet" | "simple";

/** Turns a target URL into the URL the browser iframe should load for the chosen engine. */
export function proxify(url: string, engine: ProxyEngine): string {
  if (engine === "simple") return `${SIMPLE_PROXY_URL}?destination=${encodeURIComponent(url)}`;
  if (engine === "scramjet") {
    const w = typeof window !== "undefined" ? (window as unknown as { __kobraScramjet?: { encodeUrl: (u: string) => string } }) : undefined;
    if (w?.__kobraScramjet) return w.__kobraScramjet.encodeUrl(url);
    return `${SIMPLE_PROXY_URL}?destination=${encodeURIComponent(url)}`;
  }
  return url;
}

/** Starts the Scramjet engine if available. Resolves true when ready. Implemented by the shell. */
export async function ensureScramjet(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __kobraScramjetReady?: Promise<boolean> };
  return w.__kobraScramjetReady ? w.__kobraScramjetReady : false;
}

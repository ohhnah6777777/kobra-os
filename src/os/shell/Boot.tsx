import { useEffect, useState } from "react";
import { OS_VERSION } from "../config";

const LINES = [
  "kobra os.. loading (1/4)",
  "kobra os.. loading (2/4)",
  "kobra os.. loading (3/4)",
  "kobra os.. loading (4/4)",
  `kobra os v${OS_VERSION} is ready`,
  "booting..",
];

/** Full-screen terminal boot animation. Calls onDone after the fade-out. */
export function Boot({ onDone }: { onDone: () => void }) {
  const [done, setDone] = useState<string[]>([]);
  const [cur, setCur] = useState("");
  const [fading, setFading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
    (async () => {
      for (let i = 0; i < LINES.length; i++) {
        const line = LINES[i]!;
        for (let c = 1; c <= line.length; c++) {
          if (cancelled) return;
          setCur(line.slice(0, c));
          await sleep(i < 4 && c > 15 ? 14 : 24);
        }
        await sleep(i < 4 ? 260 : 420);
        if (cancelled) return;
        setDone((d) => [...d, line]);
        setCur("");
      }
      await sleep(300);
      if (cancelled) return;
      setFading(true);
      await sleep(900);
      if (!cancelled) onDone();
    })();
    return () => {
      cancelled = true;
    };
  }, [onDone]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-blackout font-mono text-sm text-terminal-foreground transition-opacity duration-[900ms]"
      style={{ opacity: fading ? 0 : 1 }}
      onClick={() => setFading(true)}
    >
      <div className="p-8 leading-7">
        {done.map((l, i) => (
          <div key={i} className={i === 4 ? "text-primary text-glow" : undefined}>
            <span className="text-muted-foreground">$ </span>
            {l}
          </div>
        ))}
        <div>
          <span className="text-muted-foreground">$ </span>
          {cur}
          <span className="caret ml-0.5 inline-block h-4 w-2 translate-y-0.5 bg-terminal-foreground" />
        </div>
      </div>
    </div>
  );
}

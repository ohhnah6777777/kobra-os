import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Heart, Info, Maximize, RotateCw, Search, Gamepad2 } from "lucide-react";
import { useOS, type Win } from "../store";
import catalog from "../../lib/games/games.json";
import descriptions from "../../lib/games/descriptions.json";
import { CATEGORIES, TRENDING, pretty, tagsFor, gameUrl, iconSrc, type Game } from "../lib/games";

const games = catalog as Game[];
const byId = new Map(games.map(g => [g.id, g]));
function Tile({ game }: { game: Game }) {
  const [failed, setFailed] = useState(false);
  const src = iconSrc(game);
  return <div className="aspect-[4/3] overflow-hidden rounded-xl bg-accent-gradient">{src && !failed ? <img loading="lazy" src={src} alt="" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" /> : <div className="grid h-full place-items-center bg-gradient-to-br from-primary/30 to-secondary text-3xl font-bold text-primary">{pretty(game.id).split(" ").slice(0, 2).map(w => w[0]).join("")}</div>}</div>;
}
export default function GamesApp({ win }: { win: Win }) {
  const favorites = useOS(s => s.data.favGames);
  const recent = useOS(s => s.data.recentGames);
  const setData = useOS(s => s.setData);
  const [active, setActive] = useState<Game | undefined>();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [reload, setReload] = useState(0);
  const [info, setInfo] = useState(false);
  const [notice, setNotice] = useState("");
  const container = useRef<HTMLDivElement>(null);
  function play(game: Game) {
    setActive(game); setInfo(false); setNotice("");
    setData(d => ({ recentGames: [game.id, ...d.recentGames.filter(id => id !== game.id)].slice(0, 20) }));
  }
  useEffect(() => { const id = win.props?.['gameId']; if (typeof id === "string") { const game = byId.get(id); if (game) play(game); } }, [win.props?.['gameId']]);
  function favorite(id: string) { setData(d => ({ favGames: d.favGames.includes(id) ? d.favGames.filter(x => x !== id) : [...d.favGames, id] })); }
  const matches = (g: Game) => pretty(g.id).toLowerCase().includes(search.toLowerCase()) && (category === "All" || tagsFor(g.id).includes(category));
  function section(title: string, ids?: string[]) {
    const items = (ids ? ids.map(id => byId.get(id)).filter((g): g is Game => !!g) : games).filter(matches);
    return <section className="space-y-3" key={title}><div className="flex items-center justify-between"><h2 className="text-lg font-semibold">{title}</h2><span className="text-xs text-muted-foreground">{items.length} games</span></div>{items.length ? <div className="grid grid-cols-[repeat(auto-fill,minmax(135px,1fr))] gap-4">{items.map(g => <article key={g.id} className="group relative min-w-0 transition-transform duration-200 hover:-translate-y-1"><button className="w-full text-left" onClick={() => play(g)}><Tile game={g}/><div className="truncate pt-2 text-sm font-medium">{pretty(g.id)}</div><div className="text-xs text-muted-foreground">{tagsFor(g.id).slice(0, 2).join(" · ")}</div></button><button title={favorites.includes(g.id) ? "Remove favorite" : "Favorite"} aria-label={`Favorite ${pretty(g.id)}`} aria-pressed={favorites.includes(g.id)} onClick={() => favorite(g.id)} className="absolute right-2 top-2 rounded-full bg-background/80 p-2 text-primary backdrop-blur"><Heart size={14} fill={favorites.includes(g.id) ? "currentColor" : "none"}/></button></article>)}</div> : <p className="rounded-xl border border-dashed border-hairline p-5 text-sm text-muted-foreground">{title === "Favorites" ? "Save a favorite with the heart on any game." : title === "Recently played" ? "Your next favorite starts with a click. Play a game to see it here." : "No matching games. Try another category or search."}</p>}</section>;
  }
  if (active) return <div className="flex h-full flex-col bg-background/60"><div className="relative flex flex-wrap items-center gap-2 border-b border-hairline p-3"><button className="os-btn" onClick={() => setActive(undefined)} title="Back to games"><ArrowLeft size={16}/></button><strong className="min-w-0 flex-1 truncate">{pretty(active.id)}</strong><button className="os-btn" aria-pressed={favorites.includes(active.id)} title="Favorite" onClick={() => favorite(active.id)}><Heart size={16} className="text-primary" fill={favorites.includes(active.id) ? "currentColor" : "none"}/></button><button className="os-btn" title="Game information" aria-expanded={info} onClick={() => setInfo(!info)}><Info size={16}/></button><button className="os-btn" title="Reload game" onClick={() => setReload(n => n + 1)}><RotateCw size={16}/></button><button className="os-btn" title="Fullscreen" onClick={() => { void container.current?.requestFullscreen().catch(() => setNotice("Fullscreen is not available in this browser.")); }}><Maximize size={16}/></button>{info && <div className="absolute right-3 top-full z-10 mt-2 max-w-sm rounded-xl border border-hairline bg-popover p-5 shadow-xl"><p className="mb-2 font-semibold">{pretty(active.id)}</p><p className="text-sm text-muted-foreground">{(descriptions as Record<string, string>)[active.id] || `Play ${pretty(active.id)}, a ${tagsFor(active.id).join(" / ")} game.`}</p></div>}</div>{notice && <p role="status" className="px-4 py-2 text-sm text-warning">{notice}</p>}<div ref={container} className="min-h-0 flex-1 bg-background"><iframe key={`${active.id}:${reload}`} title={pretty(active.id)} src={gameUrl(active)} allow="fullscreen; autoplay; gamepad" allowFullScreen className="h-full w-full border-0"/></div></div>;
  return <div className="flex h-full flex-col bg-background/60"><header className="space-y-4 border-b border-hairline p-5"><div className="flex flex-wrap items-center gap-4"><div className="flex flex-1 items-center gap-3"><Gamepad2 className="text-primary"/><div><h1 className="text-2xl font-bold">Play something great.</h1><p className="text-xs text-muted-foreground">Your arcade, always open.</p></div></div><label className="flex items-center gap-2 rounded-xl bg-muted px-3"><Search size={16} className="text-muted-foreground"/><input aria-label="Search games" className="os-input w-44 border-0 bg-transparent" value={search} onChange={e => setSearch(e.target.value)} placeholder="Find your next game"/></label></div><div className="flex gap-2 overflow-x-auto pb-1">{["All", ...CATEGORIES.map(c => c.tag)].map(c => <button key={c} className="os-chip shrink-0" data-active={category === c} onClick={() => setCategory(c)}>{c}</button>)}</div></header><div className="flex-1 space-y-8 overflow-y-auto p-5">{section("Trending", TRENDING)}{section("Recently played", recent)}{section("Favorites", favorites)}{section("All games")}</div></div>;
}

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
const input = z.object({ path: z.string().regex(/^(trending\/all\/week|movie\/popular|tv\/popular|movie\/top_rated|search\/multi|movie\/[1-9]\d*|tv\/[1-9]\d*|tv\/[1-9]\d*\/season\/\d+)$/), query: z.string().max(200).optional() });
export const tmdb = createServerFn({ method: "GET" }).inputValidator(input).handler(async ({ data }) => {
  const key = process.env['TMDB_API_KEY'];
  if (!key) return { error: "missing_key" };
  const url = new URL(`https://api.themoviedb.org/3/${data.path}`);
  const headers: Record<string, string> = { Accept: "application/json" };
  if (key.startsWith("eyJ")) headers['Authorization'] = `Bearer ${key}`; else url.searchParams.set("api_key", key);
  if (data.path === "search/multi") url.searchParams.set("query", data.query ?? "");
  if (/^(movie|tv)\/\d+$/.test(data.path)) url.searchParams.set("append_to_response", "credits,videos,similar");
  try { const r = await fetch(url, { headers }); if (!r.ok) return { error: "request_failed" }; return await r.json(); } catch { return { error: "network_error" }; }
});

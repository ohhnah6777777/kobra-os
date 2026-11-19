/** Scramjet proxy engine bootstrap. Filled in later; resolves false until the engine is installed. */
export async function initScramjet(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { __kobraScramjetReady?: Promise<boolean> };
  w.__kobraScramjetReady ??= Promise.resolve(false);
  return w.__kobraScramjetReady;
}

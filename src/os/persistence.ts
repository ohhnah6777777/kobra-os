import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";
import { useOS, type Settings, type UserData, type Win, type User } from "./store";

type Snapshot = { settings: Settings; data: UserData; windows: Win[]; savedAt: number };

const keyFor = (u: User | null) => (u?.kind === "account" ? `kobra:state:${u.id}` : "kobra:state:guest");
const photosKey = (u: User | null) => (u?.kind === "account" ? `kobra:photos:${u.id}` : "kobra:photos:guest");

function readLocal(u: User | null): Snapshot | null {
  try {
    const raw = localStorage.getItem(keyFor(u));
    return raw ? (JSON.parse(raw) as Snapshot) : null;
  } catch {
    return null;
  }
}

function snapshot(): Snapshot {
  const s = useOS.getState();
  return { settings: s.settings, data: s.data, windows: s.windows, savedAt: Date.now() };
}

/** Loads the state for a user (local first, then cloud if newer) into the store. */
export async function loadUserState(u: User) {
  const st = useOS.getState();
  st.resetSession();
  const local = readLocal(u);
  if (local) st.hydrate(local);
  try {
    const p = localStorage.getItem(photosKey(u));
    if (p) useOS.setState({ photos: JSON.parse(p) as string[] });
  } catch {
    /* ignore */
  }
  if (u.kind !== "account") {
    st.setSyncStatus("local");
    return;
  }
  st.setSyncStatus("syncing");
  const { data, error } = await supabase.from("user_state").select("settings, session, data, updated_at").eq("user_id", u.id).maybeSingle();
  if (error) {
    st.setSyncStatus("error");
    return;
  }
  if (data) {
    const cloudAt = new Date(data.updated_at).getTime();
    if (!local || cloudAt > local.savedAt) {
      const session = (data.session ?? {}) as { windows?: Win[] };
      st.hydrate({
        settings: data.settings as Partial<Settings>,
        data: data.data as Partial<UserData>,
        windows: session.windows ?? [],
      });
    }
  }
  st.setSyncStatus("synced");
}

let localTimer: ReturnType<typeof setTimeout> | undefined;
let cloudTimer: ReturnType<typeof setTimeout> | undefined;

async function pushCloud(u: Extract<User, { kind: "account" }>) {
  const snap = snapshot();
  useOS.getState().setSyncStatus("syncing");
  const { error } = await supabase.from("user_state").upsert({
    user_id: u.id,
    settings: snap.settings as unknown as Json,
    session: { windows: snap.windows } as unknown as Json,
    data: snap.data as unknown as Json,
    updated_at: new Date(snap.savedAt).toISOString(),
  });
  useOS.getState().setSyncStatus(error ? "error" : "synced");
}

/** Call once on the client. Saves locally (and to the cloud for accounts) whenever state changes. */
export function startPersistence() {
  let ready = false;
  const unsub = useOS.subscribe((s, prev) => {
    if (!s.user || s.phase === "boot") return;
    if (s.user !== prev.user) {
      ready = false;
      return;
    }
    if (s.photos !== prev.photos) {
      try {
        localStorage.setItem(photosKey(s.user), JSON.stringify(s.photos));
      } catch {
        /* quota */
      }
    }
    if (s.settings === prev.settings && s.data === prev.data && s.windows === prev.windows) return;
    if (!ready) {
      ready = true;
    }
    const u = s.user;
    clearTimeout(localTimer);
    localTimer = setTimeout(() => {
      try {
        localStorage.setItem(keyFor(u), JSON.stringify(snapshot()));
      } catch {
        /* quota */
      }
    }, 400);
    if (u.kind === "account") {
      clearTimeout(cloudTimer);
      cloudTimer = setTimeout(() => void pushCloud(u), 1800);
    }
  });
  const flush = () => {
    const u = useOS.getState().user;
    if (!u) return;
    try {
      localStorage.setItem(keyFor(u), JSON.stringify(snapshot()));
    } catch {
      /* quota */
    }
  };
  window.addEventListener("beforeunload", flush);
  return () => {
    unsub();
    window.removeEventListener("beforeunload", flush);
  };
}

export async function flushNow() {
  const u = useOS.getState().user;
  if (!u) return;
  clearTimeout(localTimer);
  try {
    localStorage.setItem(keyFor(u), JSON.stringify(snapshot()));
  } catch {
    /* quota */
  }
  if (u.kind === "account") {
    clearTimeout(cloudTimer);
    await pushCloud(u);
  }
}

import { supabase } from "@/integrations/supabase/client";
import { OS_VERSION } from "./config";
import { flushNow, loadUserState } from "./persistence";
import { useOS, type User } from "./store";

export async function accountFromSession(): Promise<Extract<User, { kind: "account" }> | null> {
  const { data } = await supabase.auth.getSession();
  const u = data.session?.user;
  if (!u) return null;
  const { data: prof } = await supabase.from("profiles").select("username").eq("id", u.id).maybeSingle();
  const meta = u.user_metadata as Record<string, string | undefined>;
  return {
    kind: "account",
    id: u.id,
    email: u.email ?? null,
    name: prof?.username || meta["username"] || meta["full_name"] || (u.email ?? "user").split("@")[0]!,
  };
}

export async function enterDesktop(user: User) {
  const st = useOS.getState();
  st.setUser(user);
  await loadUserState(user);
  st.setAuthRequested(false);
  if (useOS.getState().settings.lastSeenVersion !== OS_VERSION) {
    st.closeAll();
    st.setPhase("updating");
  } else {
    st.setPhase("desktop");
  }
}

export async function lockScreen() {
  await flushNow();
  useOS.getState().setPhase("lock");
}

export async function signOut() {
  await flushNow();
  await supabase.auth.signOut();
  const st = useOS.getState();
  st.setUser(null);
  st.resetSession();
  st.setPhase("lock");
}

export async function powerAction(kind: "sleep" | "shutdown" | "restart") {
  const st = useOS.getState();
  if (kind === "sleep") return st.setPhase("sleep");
  await flushNow();
  st.closeAll();
  await flushNow();
  if (kind === "shutdown") {
    st.setUser(null);
    st.resetSession();
    return st.setPhase("shutdown");
  }
  st.setPhase("restarting");
}

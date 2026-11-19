import { useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { LovableMark } from "@lovable.dev/cloud-auth-js/react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { accountFromSession, enterDesktop } from "../session";

const GoogleG = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="size-[18px]" aria-hidden="true"><path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z"/><path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z"/><path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z"/><path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09c.95-2.85 3.6-4.96 6.73-4.96z"/></svg>
);

export function AuthPanel({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const finish = async () => {
    const acc = await accountFromSession();
    if (acc) await enterDesktop(acc);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { username: username.trim() || email.split("@")[0] } },
        });
        if (error) throw error;
        if (!data.session) {
          setNotice("Check your email to confirm your account, then sign in here.");
          setMode("signin");
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      await finish();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  };

  const oauth = async (provider: "google" | "lovable") => {
    const result = await lovable.auth.signInWithOAuth(provider, { redirect_uri: window.location.origin });
    if (result.error) {
      toast.error(result.error instanceof Error ? result.error.message : "Sign-in failed");
      return;
    }
    if (result.redirected) return;
    await finish();
  };

  return (
    <div className="glass-strong window-shadow animate-pop w-[min(380px,92vw)] rounded-2xl p-6">
      <div className="mb-5 flex items-center gap-2">
        <button onClick={onBack} className="os-btn size-8 p-0" aria-label="Back"><ArrowLeft className="size-4" /></button>
        <div>
          <div className="text-lg font-semibold">{mode === "signin" ? "Sign in" : "Create account"}</div>
          <div className="text-xs text-muted-foreground">Sync your desktop, files and chats everywhere.</div>
        </div>
      </div>
      <div className="grid gap-2">
        <button type="button" className="os-btn w-full" onClick={() => void oauth("google")}><GoogleG />Continue with Google</button>
        <button type="button" className="os-btn w-full" onClick={() => void oauth("lovable")}><LovableMark className="size-[18px]" />Continue with Lovable</button>
      </div>
      <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground"><div className="h-px flex-1 bg-hairline" />or<div className="h-px flex-1 bg-hairline" /></div>
      <form onSubmit={submit} className="grid gap-2.5">
        {mode === "signup" && <input className="os-input" placeholder="Username (shown in chat)" value={username} onChange={(e) => setUsername(e.target.value)} maxLength={24} />}
        <input className="os-input" type="email" required placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <input className="os-input" type="password" required minLength={6} placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        {notice && <div className="rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs">{notice}</div>}
        <button className="os-btn os-btn-primary mt-1 w-full" disabled={busy}>{busy && <Loader2 className="size-4 animate-spin" />}{mode === "signin" ? "Sign in" : "Create account"}</button>
      </form>
      <button className="mt-4 w-full text-center text-xs text-muted-foreground hover:text-foreground" onClick={() => setMode(mode === "signin" ? "signup" : "signin")}>
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}

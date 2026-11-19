import { useEffect, useRef, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { useOS } from "../store";
import { accountFromSession, enterDesktop } from "../session";
import { AuthPanel } from "./AuthPanel";
import { useNow } from "./useClock";

export function LockScreen() {
  const now = useNow(1000);
  const h24 = useOS((s) => s.settings.clock.h24);
  const authRequested = useOS((s) => s.authRequested);
  const [pin, setPin] = useState("");
  const [shake, setShake] = useState(false);
  const [auth, setAuth] = useState(authRequested);
  const [account, setAccount] = useState<Awaited<ReturnType<typeof accountFromSession>>>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void accountFromSession().then(setAccount);
  }, []);
  useEffect(() => {
    if (authRequested) setAuth(true);
  }, [authRequested]);
  useEffect(() => {
    if (!auth) inputRef.current?.focus();
  }, [auth]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === "123") void enterDesktop({ kind: "guest" });
    else if (pin === "000") {
      setAuth(true);
      setPin("");
    } else {
      setShake(true);
      setTimeout(() => setShake(false), 450);
      setPin("");
    }
  };

  return (
    <div className="animate-fade fixed inset-0 z-[90] flex flex-col items-center justify-between overflow-hidden py-[9vh]">
      <div className="pointer-events-none absolute inset-0 bg-background/40 backdrop-blur-2xl" />
      <div className="relative text-center">
        <div className="text-sm font-medium tracking-wide text-muted-foreground">
          {now?.toLocaleDateString([], { weekday: "long" })}, {now?.toLocaleDateString([], { month: "long", day: "numeric" })}
        </div>
        <div className="mt-1 text-[clamp(4.5rem,12vw,8.5rem)] font-semibold leading-none tracking-tighter text-glow">
          {now?.toLocaleTimeString([], { hour: h24 ? "2-digit" : "numeric", minute: "2-digit", hour12: !h24 }).replace(/\s?[AP]M/i, "")}
        </div>
      </div>

      <div className="relative flex flex-col items-center">
        {auth ? (
          <AuthPanel onBack={() => { setAuth(false); useOS.getState().setAuthRequested(false); }} />
        ) : (
          <>
            <div className="grid size-24 place-items-center rounded-full border border-hairline-strong bg-card glow">
              <UserRound className="size-11 text-muted-foreground" strokeWidth={1.5} />
            </div>
            <div className="mt-3 text-lg font-medium">Guest</div>
            <form onSubmit={submit} className={`mt-4 flex items-center gap-2 ${shake ? "animate-[shake_.4s]" : ""}`} style={shake ? { animation: "shake .4s" } : undefined}>
              <input
                ref={inputRef}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
                type="password"
                inputMode="numeric"
                placeholder="PIN"
                aria-label="PIN"
                className="os-input w-48 text-center font-mono tracking-[0.5em]"
              />
              <button className="os-btn os-btn-primary size-9 p-0" aria-label="Unlock"><ArrowRight className="size-4" /></button>
            </form>
            <p className="mt-3 max-w-xs text-center text-xs text-muted-foreground">type 123 to enter as guest, or 000 to create or add an account</p>
            {account && (
              <button onClick={() => void enterDesktop(account)} className="os-btn mt-5 rounded-full text-xs">
                <span className="grid size-5 place-items-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">{account.name[0]?.toUpperCase()}</span>
                Continue as {account.name}
              </button>
            )}
          </>
        )}
      </div>
      <div className="relative font-mono text-xs text-muted-foreground">kobra os</div>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-8px)}40%,80%{transform:translateX(8px)}}`}</style>
    </div>
  );
}

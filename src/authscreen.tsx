import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "./auth";

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "forgot") {
      const { error } = await resetPassword(email);
      if (error) {
        setErrorMsg(error);
      } else {
        setSuccessMsg(
          "Jelszó-visszaállítási link elküldve! Ellenőrizd az email fiókod."
        );
      }
      setLoading(false);
      return;
    }

    const action = mode === "login" ? signIn : signUp;
    const { error } = await action(email, password);

    if (error) {
      setErrorMsg(error);
    }

    setLoading(false);
  }

  function switchMode(next: "login" | "register" | "forgot") {
    setMode(next);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg text-text-1">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Háztartási költségvetés
        </h1>

        {mode !== "forgot" && (
          <div className="flex justify-center gap-2 mb-4 text-xs">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`px-3 py-1 rounded-full border text-xs transition ${
                mode === "login"
                  ? "bg-text-1 text-bg border-text-1"
                  : "border-border text-text-2 hover:border-primary/50"
              }`}
            >
              Bejelentkezés
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`px-3 py-1 rounded-full border text-xs transition ${
                mode === "register"
                  ? "bg-text-1 text-bg border-text-1"
                  : "border-border text-text-2 hover:border-primary/50"
              }`}
            >
              Regisztráció
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <p className="text-xs text-text-2 text-center mb-4">
            Add meg az email-ed, és küldünk egy visszaállítási linket.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-xs text-text-2">
            <div className="mb-1">Email</div>
            <input
              type="email"
              required
              className="w-full rounded-xl bg-surface-2 border border-border px-3 py-2 text-sm text-text-1 outline-none focus:border-primary/60 transition"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode !== "forgot" && (
            <div className="text-xs text-text-2">
              <div className="mb-1">Jelszó</div>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  required
                  minLength={6}
                  className="w-full rounded-xl bg-surface-2 border border-border px-3 py-2 pr-9 text-sm text-text-1 outline-none focus:border-primary/60 transition"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-2 transition"
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-500/10 border border-red-500/30 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl px-3 py-2">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary text-white text-sm font-medium py-2 mt-1 disabled:opacity-60 hover:opacity-90 transition"
          >
            {loading
              ? "Dolgozom..."
              : mode === "login"
              ? "Bejelentkezés"
              : mode === "register"
              ? "Regisztráció"
              : "Link küldése"}
          </button>
        </form>

        {mode === "login" && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-xs text-text-muted hover:text-text-2 underline transition"
            >
              Elfelejtett jelszó?
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <div className="mt-3 text-center">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className="text-xs text-text-muted hover:text-text-2 underline transition"
            >
              Vissza a bejelentkezéshez
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

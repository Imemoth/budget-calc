import { useState } from "react";
import { useAuth } from "./auth";

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-900/80 p-6 shadow-xl">
        <h1 className="text-xl font-semibold mb-4 text-center">
          Háztartási költségvetés
        </h1>

        {mode !== "forgot" && (
          <div className="flex justify-center gap-2 mb-4 text-xs">
            <button
              type="button"
              onClick={() => switchMode("login")}
              className={`px-3 py-1 rounded-full border text-xs ${
                mode === "login"
                  ? "bg-white text-slate-900 border-white"
                  : "border-white/20 text-white/60"
              }`}
            >
              Bejelentkezés
            </button>
            <button
              type="button"
              onClick={() => switchMode("register")}
              className={`px-3 py-1 rounded-full border text-xs ${
                mode === "register"
                  ? "bg-white text-slate-900 border-white"
                  : "border-white/20 text-white/60"
              }`}
            >
              Regisztráció
            </button>
          </div>
        )}

        {mode === "forgot" && (
          <p className="text-xs text-white/60 text-center mb-4">
            Add meg az email-ed, és küldünk egy visszaállítási linket.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="text-xs text-white/60">
            <div className="mb-1">Email</div>
            <input
              type="email"
              required
              className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/40"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {mode !== "forgot" && (
            <div className="text-xs text-white/60">
              <div className="mb-1">Jelszó</div>
              <input
                type="password"
                required
                minLength={6}
                className="w-full rounded-xl bg-slate-950/60 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/40"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          )}

          {errorMsg && (
            <div className="text-xs text-red-400 bg-red-950/40 border border-red-500/40 rounded-xl px-3 py-2">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="text-xs text-green-400 bg-green-950/40 border border-green-500/40 rounded-xl px-3 py-2">
              {successMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-white text-slate-900 text-sm font-medium py-2 mt-1 disabled:opacity-60"
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
              className="text-xs text-white/40 hover:text-white/70 underline"
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
              className="text-xs text-white/40 hover:text-white/70 underline"
            >
              Vissza a bejelentkezéshez
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

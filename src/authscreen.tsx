import { useState } from "react";
import { Eye, EyeOff, Mail, Lock, ArrowRight, RotateCcw } from "lucide-react";
import { useAuth } from "./auth";

// ---- Radar körök - háttér dekoráció ----
function RadarRings() {
  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
      viewBox="0 0 800 800"
      preserveAspectRatio="xMidYMid slice"
    >
      {[80, 160, 240, 320, 400].map((r, i) => (
        <circle
          key={i}
          cx="400" cy="400" r={r}
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="1"
        />
      ))}
      {/* Radar sweep vonal */}
      <line x1="400" y1="400" x2="400" y2="0" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.6" />
      {/* Pontok */}
      {[[280, 320], [350, 260], [440, 300]].map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="4" fill="var(--color-primary)" opacity="0.8" />
      ))}
    </svg>
  );
}

// ---- Input mező ----
function AuthInput({
  label,
  icon: Icon,
  type,
  value,
  onChange,
  onKeyDown,
  placeholder,
  required,
  minLength,
  autoFocus,
  rightEl,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  type: string;
  value: string;
  onChange: (v: string) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
  autoFocus?: boolean;
  rightEl?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-text-2 tracking-wide">{label}</label>
      <div className="relative">
        <Icon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          required={required}
          minLength={minLength}
          autoFocus={autoFocus}
          className="w-full h-12 rounded-xl border border-border pl-10 pr-10 text-sm text-text-1 placeholder:text-text-muted outline-none transition-all duration-200 focus:ring-2 focus:ring-primary/40 focus:border-primary/60"
          style={{
            background: "var(--color-surface-2)",
          }}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">{rightEl}</div>
        )}
      </div>
    </div>
  );
}

export function AuthScreen() {
  const { signIn, signUp, resetPassword } = useAuth();
  const [mode, setMode] = useState<"login" | "register" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit() {
    // Manuális validáció (form tag nélkül — CLAUDE.md policy)
    if (!email.trim() || !email.includes("@")) {
      setErrorMsg("Érvényes email-t adj meg.");
      return;
    }
    if (mode !== "forgot" && password.length < 6) {
      setErrorMsg("A jelszónak legalább 6 karakter kell.");
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    if (mode === "forgot") {
      const { error } = await resetPassword(email);
      if (error) setErrorMsg(error);
      else setSuccessMsg("Jelszó-visszaállítási link elküldve! Ellenőrizd az email fiókod.");
      setLoading(false);
      return;
    }

    const action = mode === "login" ? signIn : signUp;
    const { error } = await action(email, password);
    if (error) setErrorMsg(error);
    setLoading(false);
  }

  // Enter billentyű → submit (form tag helyett)
  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !loading) handleSubmit();
  }

  function switchMode(next: "login" | "register" | "forgot") {
    setMode(next);
    setErrorMsg(null);
    setSuccessMsg(null);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "var(--color-bg)" }}
    >
      {/* Háttér: radar körök + ambient glow */}
      <RadarRings />
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, var(--color-primary) 0%, transparent 70%)",
          opacity: 0.06,
          filter: "blur(40px)",
        }}
      />

      {/* Fő kártya */}
      <div
        className="relative w-full max-w-sm mx-4 rounded-3xl border border-border overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
          boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 4px 20px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.08)",
        }}
      >
        {/* Felső fény-csík */}
        <div
          className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)" }}
        />

        {/* Logo szekció */}
        <div className="px-8 pt-8 pb-6 flex flex-col items-center">
          {/* Logo kép — kell public/logo.png */}
          <div className="relative mb-4">
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background: "radial-gradient(circle, var(--color-primary) 0%, transparent 70%)",
                opacity: 0.15,
                filter: "blur(20px)",
                transform: "scale(1.4)",
              }}
            />
            <img
              src="/logo.png"
              alt="KöltségRadar logo"
              className="relative w-28 h-28 object-contain drop-shadow-2xl"
              onError={(e) => {
                // Fallback: radar SVG ikon ha nincs logo.png
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
            {/* Fallback SVG ha nincs logo.png */}
            <div className="w-28 h-28 rounded-full flex items-center justify-center -mt-28 relative"
              style={{ background: "var(--color-primary)18" }}>
              <svg viewBox="0 0 80 80" className="w-16 h-16">
                <circle cx="40" cy="40" r="36" fill="none" stroke="var(--color-primary)" strokeWidth="2" opacity="0.3" />
                <circle cx="40" cy="40" r="24" fill="none" stroke="var(--color-primary)" strokeWidth="2" opacity="0.5" />
                <circle cx="40" cy="40" r="12" fill="none" stroke="var(--color-primary)" strokeWidth="2" opacity="0.7" />
                <circle cx="40" cy="40" r="3" fill="var(--color-primary)" />
                <line x1="40" y1="40" x2="40" y2="6" stroke="var(--color-primary)" strokeWidth="2" opacity="0.8" />
                <circle cx="28" cy="30" r="2.5" fill="var(--color-primary)" opacity="0.9" />
                <circle cx="54" cy="36" r="2" fill="var(--color-primary)" opacity="0.7" />
              </svg>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-2xl font-extrabold tracking-tight">
              <span style={{ color: "var(--color-primary)" }}>Költség</span>
              <span className="text-text-1">Radar</span>
            </h1>
            <p className="text-xs text-text-muted mt-1">
              {mode === "forgot" ? "Jelszó visszaállítása" : "háztartási tervező"}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px mx-6" style={{ background: "var(--color-border)" }} />

        {/* Form szekció */}
        <div className="px-8 py-6 space-y-5">

          {/* Mode switcher — csak login/register módban */}
          {mode !== "forgot" && (
            <div
              className="flex rounded-xl p-1 gap-1"
              style={{ background: "var(--color-surface-2)" }}
            >
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className="flex-1 py-2 rounded-lg text-xs font-semibold transition-all duration-200"
                  style={mode === m ? {
                    background: "var(--color-primary)",
                    color: "#fff",
                    boxShadow: `0 2px 8px var(--color-primary)44`,
                  } : {
                    color: "var(--color-text-2)",
                  }}
                >
                  {m === "login" ? "Bejelentkezés" : "Regisztráció"}
                </button>
              ))}
            </div>
          )}

          {/* Elfelejtett jelszó info */}
          {mode === "forgot" && (
            <p className="text-xs text-text-muted text-center leading-relaxed">
              Add meg az email-ed, és küldünk egy<br />jelszó-visszaállítási linket.
            </p>
          )}

          {/* Mezők */}
          <div className="space-y-3">
            <AuthInput
              label="Email"
              icon={Mail}
              type="email"
              value={email}
              onChange={setEmail}
              onKeyDown={handleKeyDown}
              placeholder="nev@example.com"
              required
              autoFocus
            />
            {mode !== "forgot" && (
              <AuthInput
                label="Jelszó"
                icon={Lock}
                type={showPw ? "text" : "password"}
                value={password}
                onChange={setPassword}
                onKeyDown={handleKeyDown}
                placeholder="minimum 6 karakter"
                required
                minLength={6}
                rightEl={
                  <button
                    type="button"
                    onClick={() => setShowPw((v) => !v)}
                    className="text-text-muted hover:text-text-2 transition-colors"
                    tabIndex={-1}
                  >
                    {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />
            )}
          </div>

          {/* Hibaüzenet */}
          {errorMsg && (
            <div className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 border"
              style={{
                color: "var(--color-negative)",
                background: "color-mix(in srgb, var(--color-negative) 10%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-negative) 30%, transparent)",
              }}>
              <span className="mt-0.5 shrink-0">⚠</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Sikeres üzenet */}
          {successMsg && (
            <div className="flex items-start gap-2 text-xs rounded-xl px-3 py-2.5 border"
              style={{
                color: "var(--color-positive)",
                background: "color-mix(in srgb, var(--color-positive) 10%, transparent)",
                borderColor: "color-mix(in srgb, var(--color-positive) 30%, transparent)",
              }}>
              <span className="mt-0.5 shrink-0">✓</span>
              <span>{successMsg}</span>
            </div>
          )}

          {/* Submit gomb */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="w-full h-12 rounded-xl text-sm font-bold transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60"
            style={{
              background: loading
                ? "var(--color-primary)88"
                : "var(--color-primary)",
              color: "#fff",
              boxShadow: loading ? "none" : "0 4px 16px var(--color-primary)44, 0 1px 4px rgba(0,0,0,0.2)",
            }}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <RotateCcw className="w-4 h-4 animate-spin" />
                Dolgozom...
              </span>
            ) : (
              <>
                {mode === "login" ? "Bejelentkezés" : mode === "register" ? "Fiók létrehozása" : "Link küldése"}
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>

          {/* Elfelejtett jelszó link */}
          {mode === "login" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode("forgot")}
                className="text-xs transition-colors"
                style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
              >
                Elfelejtett jelszó?
              </button>
            </div>
          )}

          {/* Vissza a bejelentkezéshez */}
          {mode === "forgot" && (
            <div className="text-center">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="text-xs transition-colors flex items-center justify-center gap-1 mx-auto"
                style={{ color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "var(--color-text-2)")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "var(--color-text-muted)")}
              >
                ← Vissza a bejelentkezéshez
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-8 py-4 text-center border-t"
          style={{ borderColor: "var(--color-border)", background: "color-mix(in srgb, var(--color-surface-2) 40%, transparent)" }}
        >
          <p className="text-[10px] text-text-muted">
            Biztonságos bejelentkezés · Supabase Auth
          </p>
        </div>
      </div>
    </div>
  );
}

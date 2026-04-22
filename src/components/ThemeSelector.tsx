import { THEMES } from "../lib/themes";

// Mirror of themes.css values – UI-only, no logic dependency
const PREVIEW: Record<string, { bg: string; surface: string; primary: string; border: string }> = {
  "graphite-emerald": { bg: "#0D1117", surface: "#161B22", primary: "#10B981", border: "#30363D" },
  "midnight-purple":  { bg: "#0F0F1A", surface: "#1A1A2E", primary: "#7C3AED", border: "#2A2A4A" },
  "trust-blue":       { bg: "#F8FAFC", surface: "#FFFFFF",  primary: "#2563EB", border: "#E2E8F0" },
  "teal-slate":       { bg: "#F5F7F8", surface: "#FFFFFF",  primary: "#0F766E", border: "#D1D9DC" },
  "rose-gold":        { bg: "#FDF8F6", surface: "#FFFFFF",  primary: "#BE123C", border: "#F0D9D0" },
};

export function ThemeSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  // Normalize legacy aliases to canonical IDs for display
  const canonical = value === "dark-neo" ? "graphite-emerald" : value === "light" ? "trust-blue" : value;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-2">
      {THEMES.map((t) => {
        const p = PREVIEW[t.id] ?? { bg: "#000", surface: "#111", primary: "#10B981", border: "#333" };
        const isActive = canonical === t.id;

        return (
          <button
            key={t.id}
            type="button"
            onClick={() => onChange(t.id)}
            className={`rounded-xl border-2 p-2 text-left transition-all ${
              isActive
                ? "border-primary shadow-sm"
                : "border-border hover:border-primary/60"
            }`}
          >
            {/* Mini color preview */}
            <div
              className="rounded-lg h-10 mb-2 flex overflow-hidden"
              style={{ backgroundColor: p.bg, border: `1px solid ${p.border}` }}
            >
              {/* Surface strip */}
              <div className="w-5 h-full" style={{ backgroundColor: p.surface, borderRight: `1px solid ${p.border}` }} />
              {/* Primary accent dot + ring */}
              <div className="flex-1 flex items-center justify-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full shadow-sm"
                  style={{ backgroundColor: p.primary }}
                />
                <span
                  className="w-2 h-2 rounded-full opacity-50"
                  style={{ backgroundColor: p.primary }}
                />
              </div>
            </div>

            {/* Label */}
            <div className="text-xs font-semibold text-text-1 truncate leading-tight">{t.label}</div>
            <div className={`text-[10px] mt-0.5 ${t.mode === "dark" ? "text-text-muted" : "text-text-muted"}`}>
              {t.mode === "dark" ? "Sötét" : "Világos"}
            </div>

            {/* Active indicator */}
            {isActive && (
              <div className="mt-1.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] text-primary font-medium">Aktív</span>
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}

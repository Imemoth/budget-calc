import { useMemo, useState } from "react";
import { Plus, ChevronDown, TrendingUp, PiggyBank, Edit2 } from "lucide-react";
import type { State, SavingsBucket } from "../types";
import { Field, Input, ConfirmDelete, RingProgress, SmallButton } from "./ui";
import { normalizeMonthInput, parseNonNegativeInput } from "../lib/domainHelpers";
import { monthKey } from "../lib/utils";
import { formatHuf } from "../lib/format";

function ymToInt(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m;
}

function calcProgress(s: SavingsBucket) {
  const today = monthKey(new Date());
  const target = s.targetAmount ?? 0;
  const monthly = s.monthlyPlanned ?? 0;
  if (!s.startMonth || target <= 0) return null;
  const startInt = ymToInt(s.startMonth);
  const todayInt = ymToInt(today);
  const endInt = s.endMonth ? ymToInt(s.endMonth) : null;
  const cappedToday = endInt !== null ? Math.min(todayInt, endInt) : todayInt;
  const elapsed = Math.max(0, cappedToday - startInt + 1);
  const accumulated = elapsed * monthly;
  const pct = Math.min(100, Math.round((accumulated / target) * 100));
  const monthsLeft = endInt !== null ? Math.max(0, endInt - todayInt) : null;
  const totalMonths = endInt !== null ? endInt - startInt + 1 : null;
  const projectedTotal = totalMonths !== null ? totalMonths * monthly : null;
  return { accumulated, pct, monthsLeft, projectedTotal, target, monthly };
}

const GOAL_EMOJIS = ["🎯", "💻", "🌴", "🚗", "🏠", "✈️", "🎮", "📱", "🐖", "💍"];

export function SavingsView({
  state,
  addSavings,
  updateSavings,
  removeSavings,
}: {
  state: State;
  addSavings: () => void;
  updateSavings: (id: string, patch: Partial<SavingsBucket>) => void;
  removeSavings: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const hero = useMemo(() => {
    const totalTarget      = state.savings.reduce((s, b) => s + (b.targetAmount ?? 0), 0);
    const totalMonthly     = state.savings.reduce((s, b) => s + (b.monthlyPlanned ?? 0), 0);
    const activeCount      = state.savings.filter((b) => b.targetAmount > 0 && b.startMonth).length;
    const totalAccumulated = state.savings.reduce((sum, b) => {
      const prog = calcProgress(b);
      return sum + (prog?.accumulated ?? 0);
    }, 0);
    const heroPct = totalTarget > 0 ? Math.min(100, Math.round((totalAccumulated / totalTarget) * 100)) : 0;
    return { totalTarget, totalMonthly, activeCount, totalAccumulated, heroPct };
  }, [state.savings]);

  return (
    <div className="space-y-4">

      {/* ---- Hero kártya ---- */}
      <div className="rounded-2xl border border-border p-5 relative overflow-hidden"
        style={{
          borderLeftWidth: 4,
          borderLeftColor: "var(--color-warning)",
          background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
          boxShadow: "var(--shadow-card), 0 0 28px var(--color-warning)14",
        }}>
        {/* Glow */}
        <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
          style={{ background: "var(--color-warning)", opacity: 0.07, filter: "blur(22px)" }} />
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)" }} />

        <div className="relative">
          <div className="flex items-center gap-2 mb-4">
            <PiggyBank className="w-4 h-4" style={{ color: "var(--color-warning)" }} />
            <p className="text-xs font-bold text-text-muted uppercase tracking-widest">Megtakarítások</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Összes célösszeg</div>
              <div className="text-2xl font-extrabold tabular-nums" style={{ color: "var(--color-warning)" }}>
                {formatHuf(hero.totalTarget)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Összegyűjtve</div>
              <div className="text-xl font-bold tabular-nums text-positive">{formatHuf(hero.totalAccumulated)}</div>
            </div>
            <div>
              <div className="text-[10px] text-text-muted uppercase tracking-wide mb-1">Havi terv</div>
              <div className="text-xl font-bold tabular-nums text-text-1">{formatHuf(hero.totalMonthly)}</div>
              <div className="text-xs text-text-muted">{hero.activeCount} aktív keret</div>
            </div>
          </div>

          {hero.totalTarget > 0 && (
            <div>
              <div className="flex justify-between text-xs text-text-muted mb-1.5">
                <span>Összesített haladás</span>
                <span className="font-semibold text-text-1">{hero.heroPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${hero.heroPct}%`,
                    background: `linear-gradient(90deg, var(--color-warning)88, var(--color-warning))`,
                    boxShadow: "0 0 8px var(--color-warning)44",
                  }} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Keret kártyák ---- */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {state.savings.length === 0 ? (
          <div className="sm:col-span-2 rounded-2xl border border-border p-8 text-center"
            style={{ background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)" }}>
            <PiggyBank className="w-8 h-8 mx-auto mb-2 text-text-muted" />
            <div className="text-sm font-semibold text-text-2">Még nincs megtakarítási keret</div>
            <div className="text-xs text-text-muted mt-1">Kattints a + gombra az első keret létrehozásához</div>
          </div>
        ) : (
          state.savings.map((s, idx) => {
            const prog      = calcProgress(s);
            const isActive  = (s.targetAmount ?? 0) > 0 && !!s.startMonth;
            const isExpanded = expandedId === s.id;
            const emoji     = GOAL_EMOJIS[idx % GOAL_EMOJIS.length];
            const accentColor = !prog ? "var(--color-primary)"
              : prog.pct >= 100 ? "var(--color-positive)"
              : (prog.monthsLeft === 0 && prog.pct < 100) ? "var(--color-negative)"
              : prog.pct < 40 ? "var(--color-warning)"
              : "var(--color-primary)";

            return (
              <div key={s.id}
                className="rounded-2xl border border-border overflow-hidden relative"
                style={{
                  borderLeftWidth: 3,
                  borderLeftColor: isActive ? accentColor : "var(--color-warning)",
                  background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
                  boxShadow: `var(--shadow-card), 0 0 20px ${isActive ? accentColor : "var(--color-warning)"}14`,
                }}>
                {/* Felső fény */}
                <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />

                {/* Kártya fő nézet */}
                <div className="p-4">
                  {/* Fejléc sor */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="text-2xl shrink-0">{emoji}</span>
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-text-1 truncate">{s.name || "(névtelen)"}</div>
                        <span className={
                          "text-[10px] px-2 py-0.5 rounded-full font-semibold " +
                          (isActive
                            ? "bg-positive/10 text-positive"
                            : "bg-warning/10 text-warning")
                        }>
                          {isActive ? "Aktív" : "Draft"}
                        </span>
                      </div>
                    </div>
                    <button type="button"
                      onClick={() => setExpandedId(isExpanded ? null : s.id)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors"
                      style={{
                        background: isExpanded ? "var(--color-primary)15" : "var(--color-surface-2)",
                        color: isExpanded ? "var(--color-primary)" : "var(--color-text-muted)",
                      }}>
                      {isExpanded ? <ChevronDown className="w-4 h-4 rotate-180 transition-transform" /> : <Edit2 className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Progress */}
                  {prog ? (
                    <div className="flex items-center gap-3">
                      <div className="relative shrink-0">
                        <RingProgress pct={prog.pct} size={64} color={accentColor} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-[11px] font-bold text-text-1">{prog.pct}%</span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                          <div className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${prog.pct}%`,
                              background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
                              boxShadow: `0 0 6px ${accentColor}44`,
                            }} />
                        </div>
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-text-muted">
                            <span className="text-text-1 font-semibold tabular-nums">{formatHuf(prog.accumulated)}</span>
                            {" / "}{formatHuf(prog.target)}
                          </span>
                          {prog.monthsLeft !== null && (
                            <span className="text-text-muted shrink-0">
                              {prog.monthsLeft === 0 ? "Elérte a határt" : `${prog.monthsLeft} hó`}
                            </span>
                          )}
                        </div>
                        {prog.monthly > 0 && (
                          <div className="text-[11px] text-text-muted">
                            Havi: <span className="text-text-2 font-medium">{formatHuf(prog.monthly)}</span>
                            {prog.projectedTotal && prog.projectedTotal > 0 && (
                              <> · Végösszeg: <span className="text-text-2 font-medium">{formatHuf(prog.projectedTotal)}</span></>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="text-xs text-text-muted py-2">
                      {!isActive && "Célösszeg vagy kezdő hónap hiányzik — töltsd ki az adatokat."}
                    </div>
                  )}
                </div>

                {/* Szerkesztő panel — expand-ra nyílik */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-border space-y-3"
                    style={{ background: "var(--color-bg)30" }}>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <Field label="Név">
                          <Input value={s.name || ""} onChange={e => updateSavings(s.id, { name: e.target.value })} className="w-full" autoFocus />
                        </Field>
                      </div>
                      <Field label="Célösszeg (Ft)">
                        <Input type="number" value={s.targetAmount ?? 0}
                          onChange={e => updateSavings(s.id, { targetAmount: parseNonNegativeInput(e.target.value) })} className="w-full" />
                      </Field>
                      <Field label="Havi terv (Ft)">
                        <Input type="number" value={s.monthlyPlanned ?? 0}
                          onChange={e => updateSavings(s.id, { monthlyPlanned: parseNonNegativeInput(e.target.value) })} className="w-full" />
                      </Field>
                      <Field label="Kezdő hónap">
                        <Input type="month" value={s.startMonth || ""}
                          onChange={e => updateSavings(s.id, { startMonth: normalizeMonthInput(e.target.value) })} className="w-full" />
                      </Field>
                      <Field label="Záró hónap">
                        <Input type="month" value={s.endMonth || ""}
                          onChange={e => updateSavings(s.id, { endMonth: normalizeMonthInput(e.target.value) })} className="w-full" />
                      </Field>
                      <div className="col-span-2">
                        <Field label="Megjegyzés">
                          <Input value={s.notes || ""} onChange={e => updateSavings(s.id, { notes: e.target.value })} className="w-full" />
                        </Field>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-1">
                      <ConfirmDelete onConfirm={() => { removeSavings(s.id); setExpandedId(null); }} />
                      <SmallButton variant="ghost" onClick={() => setExpandedId(null)}>Bezár</SmallButton>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Új keret CTA */}
      <button type="button" onClick={addSavings}
        className="group w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-3 text-sm text-text-muted hover:border-primary hover:bg-primary/5 hover:text-primary transition-all">
        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
        Új megtakarítási keret
      </button>

      {/* Info */}
      <div className="rounded-xl border border-border px-4 py-3 flex items-start gap-2.5"
        style={{ background: "var(--color-surface-2)40" }}>
        <TrendingUp className="w-4 h-4 shrink-0 mt-0.5 text-text-muted" />
        <p className="text-xs text-text-muted">
          A haladás a <strong className="text-text-2">tervezett havi befizetések</strong> alapján számolt.
          Tényleges átutalásokat a Fix tételek vagy Tranzakciók oldalon rögzíthetsz.
        </p>
      </div>
    </div>
  );
}

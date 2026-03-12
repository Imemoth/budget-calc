import { useMemo } from "react";
import { Plus } from "lucide-react";
import type { State, SavingsBucket } from "../types";
import { Card, Field, Input, ConfirmDelete, RingProgress } from "./ui";
import { normalizeMonthInput, parseNonNegativeInput } from "../lib/domainHelpers";
import { monthKey } from "../lib/utils";
import { formatHuf } from "../lib/format";

// ym string "YYYY-MM" → integer for arithmetic
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

  // Months of planned contributions so far (capped at endMonth)
  const cappedToday = endInt !== null ? Math.min(todayInt, endInt) : todayInt;
  const elapsed = Math.max(0, cappedToday - startInt + 1);
  const accumulated = elapsed * monthly;

  const pct = Math.min(100, Math.round((accumulated / target) * 100));

  const monthsLeft = endInt !== null ? Math.max(0, endInt - todayInt) : null;
  const totalMonths = endInt !== null ? endInt - startInt + 1 : null;
  const projectedTotal = totalMonths !== null ? totalMonths * monthly : null;

  return { accumulated, pct, monthsLeft, projectedTotal, target, monthly };
}

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
  const hero = useMemo(() => {
    const totalTarget = state.savings.reduce((s, b) => s + (b.targetAmount ?? 0), 0);
    const totalMonthly = state.savings.reduce((s, b) => s + (b.monthlyPlanned ?? 0), 0);
    const activeCount = state.savings.length;
    return { totalTarget, totalMonthly, activeCount };
  }, [state.savings]);

  return (
    <div className="space-y-4">
      {/* Hero kártya */}
      <div className="rounded-2xl border border-amber-500/30 border-l-4 border-l-amber-500 bg-amber-950/20 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs text-text-muted mb-1">Összes megtakarítási cél</div>
            <div className="text-3xl font-bold tabular-nums text-amber-300">
              {formatHuf(hero.totalTarget)}
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-[11px] text-text-muted">Havi terv összesen</div>
              <div className="text-sm font-semibold tabular-nums text-amber-400">
                {formatHuf(hero.totalMonthly)}
              </div>
            </div>
            <div>
              <div className="text-[11px] text-text-muted">Aktív keretek</div>
              <div className="text-sm font-semibold text-text-1">{hero.activeCount} db</div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3">
        {state.savings.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-text-muted">Még nincs megtakarítási keret.</div>
          </Card>
        ) : (
          state.savings.map((s) => {
            const prog = calcProgress(s);
            const statusColor = !prog ? "var(--color-primary)"
              : prog.pct >= 100 ? "var(--color-positive)"
              : (prog.monthsLeft === 0 && prog.pct < 100) ? "var(--color-negative)"
              : prog.pct < 40 ? "var(--color-warning)"
              : "var(--color-primary)";
            const pctTextClass = !prog ? "text-text-2"
              : prog.pct >= 100 ? "text-positive"
              : (prog.monthsLeft === 0 && prog.pct < 100) ? "text-negative"
              : prog.pct < 40 ? "text-warning"
              : "text-text-2";
            return (
              <Card key={s.id} className="p-4">
                {/* ---- Progress summary ---- */}
                {prog && (
                  <div className="mb-4 pb-4 border-b border-border">
                    <div className="flex items-start gap-4">
                      {/* Ring */}
                      <div className="relative shrink-0">
                        <RingProgress pct={prog.pct} size={72} color={statusColor} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xs font-bold ${pctTextClass}`}>
                            {prog.pct}%
                          </span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{s.name || "(névtelen)"}</div>
                        <div className="mt-2 h-1.5 rounded-full bg-surface-2 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${prog.pct}%`, backgroundColor: statusColor }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-text-muted">
                          <span>
                            <span className="text-text-1">{formatHuf(prog.accumulated)}</span>
                            {" / "}
                            {formatHuf(prog.target)}
                          </span>
                          {prog.monthly > 0 && (
                            <span>Havi: <span className="text-text-2">{formatHuf(prog.monthly)}</span></span>
                          )}
                          {prog.projectedTotal !== null && prog.projectedTotal > 0 && (
                            <span>Végösszeg: <span className="text-text-2">{formatHuf(prog.projectedTotal)}</span></span>
                          )}
                          {prog.monthsLeft !== null && (
                            <span>
                              {prog.monthsLeft === 0
                                ? "Elérte a záró hónapot"
                                : `${prog.monthsLeft} hónap van hátra`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* ---- Edit form ---- */}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-3 items-end">
                  <div className="sm:col-span-2 md:col-span-4 min-w-0">
                    <Field label="Név">
                      <Input
                        value={s.name || ""}
                        onChange={(e) => updateSavings(s.id, { name: e.target.value })}
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <div className="min-w-0 md:col-span-2">
                    <Field label="Célösszeg">
                      <Input
                        type="number"
                        value={s.targetAmount ?? 0}
                        onChange={(e) =>
                          updateSavings(s.id, { targetAmount: parseNonNegativeInput(e.target.value) })
                        }
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <div className="min-w-0 md:col-span-2">
                    <Field label="Havi terv">
                      <Input
                        type="number"
                        value={s.monthlyPlanned ?? 0}
                        onChange={(e) =>
                          updateSavings(s.id, { monthlyPlanned: parseNonNegativeInput(e.target.value) })
                        }
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <div className="min-w-0 md:col-span-2">
                    <Field label="Kezdő hónap" hint="YYYY-MM">
                      <Input
                        type="month"
                        value={s.startMonth || ""}
                        onChange={(e) =>
                          updateSavings(s.id, { startMonth: normalizeMonthInput(e.target.value) })
                        }
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <div className="min-w-0 md:col-span-2">
                    <Field label="Záró hónap" hint="YYYY-MM">
                      <Input
                        type="month"
                        value={s.endMonth || ""}
                        onChange={(e) =>
                          updateSavings(s.id, { endMonth: normalizeMonthInput(e.target.value) })
                        }
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 md:col-span-12 min-w-0">
                    <Field label="Megjegyzés">
                      <Input
                        value={s.notes || ""}
                        onChange={(e) => updateSavings(s.id, { notes: e.target.value })}
                        className="w-full"
                      />
                    </Field>
                  </div>
                  <div className="sm:col-span-2 md:col-span-12 flex justify-end">
                    <ConfirmDelete onConfirm={() => removeSavings(s.id)} />
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      <button
        type="button"
        onClick={addSavings}
        className="group w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm text-text-muted hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
      >
        <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
        Új megtakarítási keret
      </button>

      <Card className="p-5">
        <div className="text-sm text-text-2">Megjegyzés</div>
        <div className="text-xs text-text-muted mt-1">
          A haladás a <b>tervezett havi befizetések</b> alapján számolt – tényleges átutalásokat a Kiadások tabban rögzíthetsz külön kategóriában.
        </div>
      </Card>
    </div>
  );
}

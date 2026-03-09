import { Plus } from "lucide-react";
import type { State, SavingsBucket } from "../types";
import { Card, Field, Input, SmallButton, ConfirmDelete, RingProgress } from "./ui";
import { normalizeMonthInput, parseNonNegativeInput } from "../lib/domainHelpers";
import { formatHUF, monthKey } from "../lib/utils";

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
  const currency = state.settings.currency;
  const fmt = (n: number) => `${formatHUF(n)} ${currency}`;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Tervezett megtakarítási célok és keretek</div>
            <div className="text-lg font-semibold">Megtakarítás</div>
          </div>
          <div className="flex items-center gap-2">
            <SmallButton variant="solid" onClick={addSavings}>
              <Plus className="w-3.5 h-3.5" /> Új megtakarítási keret
            </SmallButton>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-3">
        {state.savings.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-white/40">Még nincs megtakarítási keret.</div>
          </Card>
        ) : (
          state.savings.map((s) => {
            const prog = calcProgress(s);
            return (
              <Card key={s.id} className="p-4">
                {/* ---- Progress summary ---- */}
                {prog && (
                  <div className="mb-4 pb-4 border-b border-white/10">
                    <div className="flex items-start gap-4">
                      {/* Ring */}
                      <div className="relative shrink-0">
                        <RingProgress pct={prog.pct} size={72} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className={`text-xs font-bold ${prog.pct >= 100 ? "text-emerald-300" : "text-white/70"}`}>
                            {prog.pct}%
                          </span>
                        </div>
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm truncate">{s.name || "(névtelen)"}</div>
                        <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${prog.pct >= 100 ? "bg-emerald-400" : "bg-emerald-500/70"}`}
                            style={{ width: `${prog.pct}%` }}
                          />
                        </div>
                        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-white/50">
                          <span>
                            <span className="text-white/80">{fmt(prog.accumulated)}</span>
                            {" / "}
                            {fmt(prog.target)}
                          </span>
                          {prog.monthly > 0 && (
                            <span>Havi: <span className="text-white/70">{fmt(prog.monthly)}</span></span>
                          )}
                          {prog.projectedTotal !== null && prog.projectedTotal > 0 && (
                            <span>Végösszeg: <span className="text-white/70">{fmt(prog.projectedTotal)}</span></span>
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

      <Card className="p-5">
        <div className="text-sm text-white/60">Megjegyzés</div>
        <div className="text-xs text-white/40 mt-1">
          A haladás a <b>tervezett havi befizetések</b> alapján számolt – tényleges átutalásokat a Kiadások tabban rögzíthetsz külön kategóriában.
        </div>
      </Card>
    </div>
  );
}

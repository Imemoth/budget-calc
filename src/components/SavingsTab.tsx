import { Plus } from "lucide-react";
import type { State, SavingsBucket } from "../types";
import { Card, Field, Input, SmallButton, ConfirmDelete } from "./ui";
import { normalizeMonthInput, parseNonNegativeInput } from "../lib/domainHelpers";

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
            state.savings.map((s) => (
              <Card key={s.id} className="p-4">
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
            ))
          )}
        </div>

        <Card className="p-5">
          <div className="text-sm text-white/60">Megjegyzés</div>
          <div className="text-xs text-white/40 mt-1">
            A dashboard jelenleg a megtakarítási kereteket <b>tervezett levonásként</b> kezeli. Ha szeretnéd a tényleges megtakarítást is külön vezetni,
            hozz létre egy "Megtakarítás" kiadás kategóriát, és rögzítsd a valós átvezetéseket tételként.
          </div>
        </Card>
    </div>
  );
}

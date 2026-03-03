import { useMemo, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { formatHUF } from "../lib/utils";
import type { State, MoneyType, RecurringItem } from "../types";
import { Card, Field, Input, Select, SmallButton, ConfirmDelete } from "./ui";
import { monthKey } from "../lib/utils";
import {
  normalizeMonthInput,
  parseNumberInput,
  parseNonNegativeInput,
  dueDateForMonth,
} from "../lib/domainHelpers";

export function RecurringView({
  state,
  addRecurring,
  updateRecurring,
  removeRecurring,
  quickCreateYearTemplate,
}: {
  state: State;
  addRecurring: (type: MoneyType) => void;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  quickCreateYearTemplate: (year: number) => void;
}) {
  const [yearQuick, setYearQuick] = useState<number>(2026);
  const [previewMonth, setPreviewMonth] = useState(state.settings.startMonth || monthKey(new Date()));
  const incomes = state.recurring.filter((r) => r.type === "income");
  const expenses = state.recurring.filter((r) => r.type === "expense");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60">Tervezett, ismétlődő tételek</div>
            <div className="text-lg font-semibold">Fix bevételek és kiadások</div>
            <div className="text-xs text-white/40 mt-1">
              A kezdő/záró hónappal előre be tudsz állítani akár teljes éveket (pl. 2026).
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Gyors 12 hónapos sablon">
              <Input
                type="number"
                min={2000}
                max={2100}
                value={yearQuick}
                onChange={(e) => {
                  const n = parseNumberInput(e.target.value);
                  setYearQuick(Math.min(2100, Math.max(2000, n || yearQuick)));
                }}
                className="w-28"
              />
            </Field>
            <Field label="Előnézet hónap">
              <Input
                type="month"
                value={previewMonth}
                onChange={(e) => setPreviewMonth(e.target.value)}
                className="w-40"
              />
            </Field>
            <SmallButton variant="solid" onClick={() => quickCreateYearTemplate(yearQuick)}>
              <Plus className="w-3.5 h-3.5" /> {yearQuick} sablon hozzáadása
            </SmallButton>
            <SmallButton variant="ghost" onClick={() => addRecurring("income")}>
              <Plus className="w-3.5 h-3.5" /> Fix bevétel
            </SmallButton>
            <SmallButton variant="ghost" onClick={() => addRecurring("expense")}>
              <Plus className="w-3.5 h-3.5" /> Fix kiadás
            </SmallButton>
          </div>
        </div>
      </Card>

      <div className="space-y-4">
        <RecurringList
          title="Fix bevételek"
          items={incomes}
          state={state}
          previewMonth={previewMonth}
          updateRecurring={updateRecurring}
          removeRecurring={removeRecurring}
        />
        <RecurringList
          title="Fix kiadások"
          items={expenses}
          state={state}
          previewMonth={previewMonth}
          updateRecurring={updateRecurring}
          removeRecurring={removeRecurring}
        />
      </div>
    </div>
  );
}

function RecurringList({
  title,
  items,
  state,
  previewMonth,
  updateRecurring,
  removeRecurring,
}: {
  title: string;
  items: RecurringItem[];
  state: State;
  previewMonth: string;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  const type: MoneyType = items[0]?.type || "expense";
  const cats = state.categories.filter((c) => c.type === type);
  const money = (n: number) => `${formatHUF(n || 0)} ${state.settings.currency}`;

  const summary = useMemo(() => {
    let total = 0;
    const byCat = new Map<string, number>();
    for (const r of items) {
      if (!r.enabled) continue;
      const a = Number(r.amount ?? 0);
      total += a;
      const cid = r.categoryId || "";
      if (cid) byCat.set(cid, (byCat.get(cid) ?? 0) + a);
    }
    const catList = Array.from(byCat.entries())
      .map(([cid, sum]) => ({
        cid,
        sum,
        name: state.categories.find((c) => c.id === cid)?.name ?? "Ismeretlen",
      }))
      .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum))
      .slice(0, 4);
    return { total, catList };
  }, [items, state.categories]);

  return (
    <Card className="p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-xs text-white/40">{items.length} tétel</div>
          </div>
        </button>

        <div className="flex flex-col md:items-end gap-1">
          <div className="text-sm text-white/80">
            <span className="text-white/50">Aktív összesen / hó:</span>{" "}
            <span className={type === "income" ? "text-emerald-300" : "text-rose-300"}>
              {money(summary.total)}
            </span>
          </div>
          {summary.catList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {summary.catList.map((c) => (
                <span
                  key={c.cid}
                  className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70"
                >
                  {c.name}: {money(c.sum)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isOpen ? (
        <div className="mt-3 text-xs text-white/40">
          Kattints a fejlécre a részletek megnyitásához.
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 text-sm text-white/40">Még nincs itt semmi.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4 min-w-0">
                  <Field label="Megnevezés">
                    <Input
                      value={r.name || ""}
                      onChange={(e) => updateRecurring(r.id, { name: e.target.value })}
                      className="w-full"
                    />
                  </Field>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <Field label="Összeg / hó">
                    <Input
                      type="number"
                      value={r.amount ?? 0}
                      onChange={(e) =>
                        updateRecurring(r.id, { amount: parseNumberInput(e.target.value) })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>
                <div className="md:col-span-3 min-w-0">
                  <Field label="Kategória">
                    <Select
                      value={r.categoryId || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, { categoryId: e.target.value || null })
                      }
                      className="w-full"
                    >
                      <option value="">(nincs)</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="md:col-span-3 min-w-0">
                  <Field label="Személy (opcionális)">
                    <Select
                      value={r.personId || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, { personId: e.target.value || null })
                      }
                      className="w-full"
                    >
                      <option value="">Háztartás</option>
                      {state.people.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </Select>
                  </Field>
                </div>
                <div className="md:col-span-3 min-w-0">
                  <Field label="Kezdő hónap" hint="YYYY-MM">
                    <Input
                      type="month"
                      value={r.startMonth || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, { startMonth: normalizeMonthInput(e.target.value) })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>
                <div className="md:col-span-3 min-w-0">
                  <Field label="Záró hónap" hint="üres = nincs vége">
                    <Input
                      type="month"
                      value={r.endMonth || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, { endMonth: normalizeMonthInput(e.target.value) || null })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <Field label="Gyakoriság">
                    <Select value={r.cadence} className="w-full" onChange={() => {}}>
                      <option value="monthly">Havi</option>
                    </Select>
                  </Field>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <Field label="Esedékes nap">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={r.dayOfMonth ?? 5}
                      onChange={(e) => {
                        const n = parseNonNegativeInput(e.target.value);
                        updateRecurring(r.id, { dayOfMonth: Math.min(31, Math.max(1, n || 1)) });
                      }}
                      className="w-full"
                    />
                    <div className="mt-1 text-[11px] text-white/50">
                      Előnézet: <span className="text-white/70">{dueDateForMonth(previewMonth, r.dayOfMonth ?? 5)}</span>
                    </div>
                  </Field>
                </div>
                <div className="md:col-span-2 min-w-0">
                  <Field label="Aktív">
                    <Select
                      value={r.enabled ? "yes" : "no"}
                      onChange={(e) =>
                        updateRecurring(r.id, { enabled: e.target.value === "yes" })
                      }
                      className="w-full"
                    >
                      <option value="yes">Igen</option>
                      <option value="no">Nem</option>
                    </Select>
                  </Field>
                </div>
                <div className="md:col-span-12 min-w-0">
                  <Field label="Megjegyzés">
                    <Input
                      value={r.notes || ""}
                      onChange={(e) => updateRecurring(r.id, { notes: e.target.value })}
                      className="w-full"
                    />
                  </Field>
                </div>
                <div className="md:col-span-12 flex justify-end">
                  <ConfirmDelete onConfirm={() => removeRecurring(r.id)} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

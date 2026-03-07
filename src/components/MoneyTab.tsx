import { useMemo, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { formatHUF, monthKey } from "../lib/utils";
import type { State, MoneyType, RecurringItem, Transaction, Category } from "../types";
import { Card, Field, Input, Select, SmallButton, ConfirmDelete, CategorySelect } from "./ui";
import {
  normalizeMonthInput,
  normalizeDateInput,
  parseNumberInput,
  parseNonNegativeInput,
  dueDateForMonth,
} from "../lib/domainHelpers";

export function MoneyTab({
  type,
  state,
  addRecurring,
  updateRecurring,
  removeRecurring,
  quickCreateYearTemplate,
  addTransaction,
  updateTransaction,
  removeTransaction,
}: {
  type: MoneyType;
  state: State;
  addRecurring: (type: MoneyType) => void;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  quickCreateYearTemplate: (year: number) => void;
  addTransaction: (type: MoneyType) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
}) {
  const label = type === "income" ? "Bevételek" : "Kiadások";
  const recurringItems = state.recurring.filter((r) => r.type === type);
  const transactions = state.transactions.filter((t) => t.type === type);

  const plannedTotal = useMemo(
    () => recurringItems.filter((r) => r.enabled).reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [recurringItems]
  );
  const actualTotal = useMemo(
    () => transactions.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [transactions]
  );
  const fmt = (n: number) => `${formatHUF(n)} ${state.settings.currency}`;

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60">
              {type === "income" ? "Tervezett és tényleges bevételek" : "Tervezett és tényleges kiadások"}
            </div>
            <div className="text-lg font-semibold">{label}</div>
          </div>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <div>
              <span className="text-white/50">Tervezett / hó:</span>{" "}
              <span className={type === "income" ? "text-emerald-300" : "text-rose-300"}>
                {fmt(plannedTotal)}
              </span>
            </div>
            <div>
              <span className="text-white/50">Tényleges összesen:</span>{" "}
              <span className={type === "income" ? "text-emerald-300" : "text-rose-300"}>
                {fmt(actualTotal)}
              </span>
            </div>
          </div>
        </div>
      </Card>

      {/* Planned section */}
      <PlannedSection
        type={type}
        state={state}
        items={recurringItems}
        addRecurring={addRecurring}
        updateRecurring={updateRecurring}
        removeRecurring={removeRecurring}
        quickCreateYearTemplate={quickCreateYearTemplate}
      />

      {/* Actual section */}
      <ActualSection
        type={type}
        state={state}
        transactions={transactions}
        addTransaction={addTransaction}
        updateTransaction={updateTransaction}
        removeTransaction={removeTransaction}
      />
    </div>
  );
}

// -------------------- Planned section --------------------

function PlannedSection({
  type,
  state,
  items,
  addRecurring,
  updateRecurring,
  removeRecurring,
  quickCreateYearTemplate,
}: {
  type: MoneyType;
  state: State;
  items: RecurringItem[];
  addRecurring: (type: MoneyType) => void;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  quickCreateYearTemplate: (year: number) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [yearQuick, setYearQuick] = useState<number>(2026);
  const [previewMonth, setPreviewMonth] = useState(state.settings.startMonth || monthKey(new Date()));

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
            <div className="text-lg font-semibold">
              {type === "income" ? "Tervezett fix bevételek" : "Tervezett fix kiadások"}
            </div>
            <div className="text-xs text-white/40">{items.length} tétel</div>
          </div>
        </button>

        <div className="flex flex-col md:items-end gap-2">
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
        <div className="mt-3 text-xs text-white/40">Kattints a fejlécre a részletek megnyitásához.</div>
      ) : (
        <>
          {/* Quick actions toolbar */}
          <div className="mt-4 flex flex-wrap items-end gap-2">
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
              <Plus className="w-3.5 h-3.5" /> {yearQuick} sablon
            </SmallButton>
            <SmallButton variant="ghost" onClick={() => addRecurring(type)}>
              <Plus className="w-3.5 h-3.5" /> {type === "income" ? "Fix bevétel" : "Fix kiadás"}
            </SmallButton>
          </div>

          {items.length === 0 ? (
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
                        <CategorySelect
                          value={r.categoryId || ""}
                          onChange={(id) => updateRecurring(r.id, { categoryId: id || null })}
                          categories={cats}
                          className="w-full"
                        />
                      </Field>
                    </div>
                    <div className="md:col-span-3 min-w-0">
                      <Field label="Személy (opcionális)">
                        <Select
                          value={r.personId || ""}
                          onChange={(e) => updateRecurring(r.id, { personId: e.target.value || null })}
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
                        <Select
                          value={r.cadence}
                          onChange={(e) =>
                            updateRecurring(r.id, { cadence: e.target.value as RecurringItem["cadence"] })
                          }
                          className="w-full"
                        >
                          <option value="monthly">Havi</option>
                          <option value="quarterly">Negyedéves</option>
                          <option value="yearly">Éves</option>
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
                          Előnézet:{" "}
                          <span className="text-white/70">
                            {dueDateForMonth(previewMonth, r.dayOfMonth ?? 5)}
                          </span>
                        </div>
                      </Field>
                    </div>
                    <div className="md:col-span-2 min-w-0">
                      <Field label="Aktív">
                        <Select
                          value={r.enabled ? "yes" : "no"}
                          onChange={(e) => updateRecurring(r.id, { enabled: e.target.value === "yes" })}
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
        </>
      )}
    </Card>
  );
}

// -------------------- Actual section --------------------

function ActualSection({
  type,
  state,
  transactions,
  addTransaction,
  updateTransaction,
  removeTransaction,
}: {
  type: MoneyType;
  state: State;
  transactions: Transaction[];
  addTransaction: (type: MoneyType) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [search, setSearch] = useState("");

  const cats = state.categories.filter((c) => c.type === type);

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    state.categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [state.categories]);

  const monthOf = (isoDate: string) => (isoDate || "").slice(0, 7);
  const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions.filter((t) => {
      if (filterMonth && monthOf(t.date) !== filterMonth) return false;
      if (q && !`${t.name ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [transactions, filterMonth, search]);

  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const t of filtered) {
      const key = isIsoDate(t.date) ? t.date : "nincs-datum";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    const arr = Array.from(map.entries()).map(([date, items]) => ({ date, items }));
    arr.sort((a, b) => {
      if (a.date === "nincs-datum") return 1;
      if (b.date === "nincs-datum") return -1;
      return b.date.localeCompare(a.date);
    });
    return arr;
  }, [filtered]);

  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});
  const toggleDay = (d: string) => setOpenDays((s) => ({ ...s, [d]: !s[d] }));
  const fmt = (n: number) => `${formatHUF(n)} ${state.settings.currency}`;

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
            <div className="text-lg font-semibold">
              {type === "income" ? "Tényleges bevételek" : "Tényleges kiadások"}
            </div>
            <div className="text-xs text-white/40">{transactions.length} tétel</div>
          </div>
        </button>

        <div className="flex flex-wrap items-end gap-2">
          <Field label="Hónap szűrő">
            <Input
              type="month"
              value={filterMonth}
              onChange={(e) => setFilterMonth(normalizeMonthInput(e.target.value))}
              className="w-44"
            />
          </Field>
          <SmallButton variant="ghost" onClick={() => setFilterMonth("")}>Összes</SmallButton>
          <Field label="Keresés">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="pl. bevásárlás"
              className="w-44"
            />
          </Field>
          <SmallButton variant="solid" onClick={() => addTransaction(type)}>
            <Plus className="w-3.5 h-3.5" /> {type === "income" ? "Bevétel rögzítése" : "Kiadás rögzítése"}
          </SmallButton>
        </div>
      </div>

      {!isOpen ? (
        <div className="mt-3 text-xs text-white/40">Kattints a fejlécre a tételek megnyitásához.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {groups.length === 0 ? (
            <div className="text-sm text-white/40">Nincs találat.</div>
          ) : (
            groups.map(({ date, items }) => {
              const isExpanded = !!openDays[date];
              const total = items.reduce((s, t) => s + (Number(t.amount) || 0), 0);
              const byCat = new Map<string, number>();
              for (const t of items) {
                if (t.categoryId) byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + (Number(t.amount) || 0));
              }
              const topCats = Array.from(byCat.entries())
                .map(([cid, sum]) => ({ cid, sum, name: catById.get(cid)?.name ?? "Ismeretlen" }))
                .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum))
                .slice(0, 3);

              return (
                <div key={date} className="rounded-xl border border-white/10 bg-white/5 overflow-hidden">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 p-4">
                    <button
                      type="button"
                      onClick={() => toggleDay(date)}
                      className="flex items-center gap-2 text-left"
                    >
                      <ChevronDown
                        className={`w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                      />
                      <div>
                        <div className="text-sm text-white/60">Nap</div>
                        <div className="text-lg font-semibold">
                          {date === "nincs-datum" ? "(nincs dátum)" : date}
                        </div>
                      </div>
                    </button>
                    <div className="flex flex-col items-start md:items-end gap-1">
                      <div className="text-sm">
                        <span className="text-white/60">Összesen:</span>{" "}
                        <span className={type === "income" ? "text-emerald-300" : "text-rose-300"}>
                          {fmt(total)}
                        </span>
                      </div>
                      {topCats.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {topCats.map((c) => (
                            <span
                              key={c.cid}
                              className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70"
                            >
                              {c.name}: {fmt(c.sum)}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-white/10 p-4 space-y-3">
                      {items.map((t) => (
                        <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                          <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                            <div className="md:col-span-3 min-w-0">
                              <Field label="Dátum">
                                <Input
                                  type="date"
                                  value={t.date || ""}
                                  onChange={(e) =>
                                    updateTransaction(t.id, { date: normalizeDateInput(e.target.value) })
                                  }
                                  className="w-full"
                                />
                              </Field>
                            </div>
                            <div className="md:col-span-4 min-w-0">
                              <Field label="Megnevezés">
                                <Input
                                  value={t.name || ""}
                                  onChange={(e) => updateTransaction(t.id, { name: e.target.value })}
                                  className="w-full"
                                />
                              </Field>
                            </div>
                            <div className="md:col-span-2 min-w-0">
                              <Field label="Összeg">
                                <Input
                                  type="number"
                                  value={t.amount ?? 0}
                                  onChange={(e) =>
                                    updateTransaction(t.id, { amount: parseNumberInput(e.target.value) })
                                  }
                                  className="w-full"
                                />
                              </Field>
                            </div>
                            <div className="md:col-span-3 min-w-0">
                              <Field label="Kategória">
                                <CategorySelect
                                  value={t.categoryId || ""}
                                  onChange={(id) => updateTransaction(t.id, { categoryId: id || null })}
                                  categories={cats}
                                  className="w-full"
                                />
                              </Field>
                            </div>
                            <div className="md:col-span-3 min-w-0">
                              <Field label="Személy">
                                <Select
                                  value={t.personId || ""}
                                  onChange={(e) =>
                                    updateTransaction(t.id, { personId: e.target.value || null })
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
                            <div className="md:col-span-12 min-w-0">
                              <Field label="Megjegyzés">
                                <Input
                                  value={t.notes || ""}
                                  onChange={(e) => updateTransaction(t.id, { notes: e.target.value })}
                                  className="w-full"
                                />
                              </Field>
                            </div>
                            <div className="md:col-span-12 flex justify-end">
                              <ConfirmDelete onConfirm={() => removeTransaction(t.id)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </Card>
  );
}

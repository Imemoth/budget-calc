import React, { useMemo, useState } from "react";
import { Plus, ChevronDown } from "lucide-react";
import { formatHUF } from "../lib/utils";
import type { State, TabKey, MoneyType, Transaction, Category } from "../types";
import { Card, Field, Input, Select, SmallButton, ConfirmDelete } from "./ui";
import { normalizeMonthInput, normalizeDateInput, parseNumberInput } from "../lib/domainHelpers";

export function TransactionsView({
  state,
  setTab,
  addTransaction,
  updateTransaction,
  removeTransaction,
}: {
  state: State;
  setTab: React.Dispatch<React.SetStateAction<TabKey>>;
  addTransaction: () => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
}) {
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [search, setSearch] = useState("");

  const catsIncome = state.categories.filter((c) => c.type === "income");
  const catsExpense = state.categories.filter((c) => c.type === "expense");

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    state.categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [state.categories]);

  const monthOf = (isoDate: string) => (isoDate || "").slice(0, 7);
  const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.transactions.filter((t) => {
      if (filterMonth && monthOf(t.date) !== filterMonth) return false;
      if (q && !`${t.name ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [state.transactions, filterMonth, search]);

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
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Tényleges bevételek és kiadások</div>
            <div className="text-lg font-semibold">Tételek rögzítése</div>
          </div>
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
                className="w-56"
              />
            </Field>
            <div className="flex flex-wrap items-center gap-2 mr-2">
              <SmallButton variant="ghost" onClick={() => setTab("recurring")}>Fix tételek</SmallButton>
              <SmallButton variant="ghost" onClick={() => setTab("people")}>Keresők & kategóriák</SmallButton>
              <SmallButton variant="ghost" onClick={() => setTab("settings")}>Beállítások</SmallButton>
            </div>
            <SmallButton variant="solid" onClick={addTransaction}>
              <Plus className="w-3.5 h-3.5" /> Új tétel
            </SmallButton>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-white/40">Nincs találat.</div>
          </Card>
        ) : (
          groups.map(({ date, items }) => {
            const isOpen = !!openDays[date];
            let income = 0, expense = 0;
            const byCat = new Map<string, number>();
            for (const t of items) {
              const a = Number(t.amount ?? 0);
              if (t.type === "income") income += a;
              else expense += a;
              if (t.categoryId) byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + a);
            }
            const total = income - expense;
            const topCats = Array.from(byCat.entries())
              .map(([cid, sum]) => ({ cid, sum, name: catById.get(cid)?.name ?? "Ismeretlen" }))
              .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum))
              .slice(0, 3);

            return (
              <Card key={date} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(date)}
                    className="flex items-center gap-2 text-left"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    <div>
                      <div className="text-sm text-white/60">Nap</div>
                      <div className="text-lg font-semibold">
                        {date === "nincs-datum" ? "(nincs dátum)" : date}
                      </div>
                    </div>
                  </button>
                  <div className="flex flex-col items-start md:items-end gap-1">
                    <div className="text-sm">
                      <span className="text-white/60">Bevétel:</span> {fmt(income)}{" "}
                      <span className="text-white/40">•</span>{" "}
                      <span className="text-white/60">Kiadás:</span> {fmt(expense)}{" "}
                      <span className="text-white/40">•</span>{" "}
                      <span className="text-white/60">Egyenleg:</span>{" "}
                      <span className={total >= 0 ? "text-emerald-300" : "text-rose-300"}>{fmt(total)}</span>
                    </div>
                    {topCats.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {topCats.map((c) => (
                          <span key={c.cid} className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70">
                            {c.name}: {fmt(c.sum)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!isOpen ? (
                  <div className="mt-3 text-xs text-white/40">Kattints a napra a tételek megnyitásához.</div>
                ) : (
                  <div className="mt-4 space-y-3">
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
                            <Field label="Típus">
                              <Select
                                value={t.type}
                                onChange={(e) => {
                                  const type = e.target.value as MoneyType;
                                  updateTransaction(t.id, {
                                    type,
                                    categoryId: (type === "income" ? catsIncome[0]?.id : catsExpense[0]?.id) || null,
                                  });
                                }}
                                className="w-full"
                              >
                                <option value="expense">Kiadás</option>
                                <option value="income">Bevétel</option>
                              </Select>
                            </Field>
                          </div>
                          <div className="md:col-span-3 min-w-0">
                            <Field label="Kategória">
                              <Select
                                value={t.categoryId || ""}
                                onChange={(e) =>
                                  updateTransaction(t.id, { categoryId: e.target.value || null })
                                }
                                className="w-full"
                              >
                                <option value="">(nincs)</option>
                                {(t.type === "income" ? catsIncome : catsExpense).map((c) => (
                                  <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                              </Select>
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
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

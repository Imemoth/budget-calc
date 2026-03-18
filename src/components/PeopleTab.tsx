import { useMemo, useState } from "react";
import { Plus, ChevronDown, RotateCcw, TrendingUp, TrendingDown, Info } from "lucide-react";
import type { State, MoneyType, Person, Category, TabKey, RecurringItem } from "../types";
import { Card, Field, Input, SmallButton, ConfirmDelete } from "./ui";
import { formatHuf } from "../lib/format";

// Accent palette derived from person.colorIndex
const PERSON_ACCENTS = [
  { bg: "bg-primary/20", border: "border-primary/30", text: "text-primary" },
  { bg: "bg-amber-500/20", border: "border-amber-500/30", text: "text-amber-400" },
  { bg: "bg-rose-500/20", border: "border-rose-500/30", text: "text-rose-400" },
  { bg: "bg-sky-500/20", border: "border-sky-500/30", text: "text-sky-400" },
  { bg: "bg-violet-500/20", border: "border-violet-500/30", text: "text-violet-400" },
] as const;
const accent = (colorIndex: number) => PERSON_ACCENTS[colorIndex % PERSON_ACCENTS.length];

export function PeopleCategoriesView({
  state,
  addPerson,
  updatePerson,
  removePerson,
  addCategory,
  updateCategory,
  removeCategory,
  reseedCategories,
  onNavigate,
}: {
  state: State;
  addPerson: () => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  removePerson: (id: string) => void;
  addCategory: (type: MoneyType, parentId?: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  reseedCategories: () => void;
  onNavigate?: (tab: TabKey) => void;
}) {
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(
    state.people[0]?.id ?? null
  );
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [activeMoneyTab, setActiveMoneyTab] = useState<MoneyType>("income");

  const catById = useMemo(
    () => Object.fromEntries(state.categories.map((c) => [c.id, c])) as Record<string, Category>,
    [state.categories]
  );

  const incomeParents = state.categories.filter((c) => c.type === "income" && !c.parentId);
  const expenseParents = state.categories.filter((c) => c.type === "expense" && !c.parentId);
  const childrenOf = (parentId: string) => state.categories.filter((c) => c.parentId === parentId);

  // Per-person recurring summary (enabled items only)
  const personSummary = useMemo(() => {
    const map = new Map<string, { incomeCount: number; incomeTotal: number; expenseCount: number; expenseTotal: number }>();
    for (const r of state.recurring) {
      if (!r.personId || !r.enabled) continue;
      const cur = map.get(r.personId) ?? { incomeCount: 0, incomeTotal: 0, expenseCount: 0, expenseTotal: 0 };
      if (r.type === "income") { cur.incomeCount++; cur.incomeTotal += Number(r.amount) || 0; }
      else { cur.expenseCount++; cur.expenseTotal += Number(r.amount) || 0; }
      map.set(r.personId, cur);
    }
    return map;
  }, [state.recurring]);

  const selectedPerson = state.people.find((p) => p.id === selectedPersonId) ?? null;

  const personItems = useMemo(() => {
    if (!selectedPersonId) return { income: [] as RecurringItem[], expense: [] as RecurringItem[] };
    const items = state.recurring.filter((r) => r.personId === selectedPersonId);
    return {
      income: items.filter((r) => r.type === "income"),
      expense: items.filter((r) => r.type === "expense"),
    };
  }, [state.recurring, selectedPersonId]);

  const selectedItem = selectedItemId
    ? state.recurring.find((r) => r.id === selectedItemId) ?? null
    : null;

  return (
    <div className="space-y-6">
      {/* 3-column board */}
      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr_300px] gap-4 items-start">

        {/* BAL — személylista */}
        <div className="space-y-2">
          <div className="text-xs font-semibold text-text-muted uppercase tracking-wider px-1 mb-3">Személyek</div>

          {state.people.map((p, idx) => {
            const isSelected = selectedPersonId === p.id;
            const summary = personSummary.get(p.id);
            const ac = accent(p.colorIndex ?? idx);
            const initial = (p.name || "?").charAt(0).toUpperCase();
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => { setSelectedPersonId(p.id); setSelectedItemId(null); }}
                className={`w-full text-left rounded-xl border p-3 transition-all ${
                  isSelected
                    ? "border-primary/40 bg-primary/5 outline outline-1 outline-primary/15"
                    : "border-border bg-surface hover:bg-surface-2"
                }`}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className={`w-8 h-8 rounded-full ${ac.bg} border ${ac.border} flex items-center justify-center text-xs font-bold ${ac.text} shrink-0`}>
                    {initial}
                  </div>
                  <div className="text-sm font-semibold text-text-1 truncate flex-1">{p.name || `Személy ${idx + 1}`}</div>
                </div>

                {/* Badges */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {summary?.incomeCount ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-positive/10 text-positive font-medium">
                      {summary.incomeCount} bevétel
                    </span>
                  ) : null}
                  {summary?.expenseCount ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-negative/10 text-negative font-medium">
                      {summary.expenseCount} kiadás
                    </span>
                  ) : null}
                  {!summary?.incomeCount && !summary?.expenseCount && (
                    <span className="text-[10px] text-text-muted">Nincs tétel</span>
                  )}
                </div>

                {/* Mini stats */}
                {summary && (summary.incomeTotal > 0 || summary.expenseTotal > 0) && (
                  <div className="grid grid-cols-2 gap-1 text-[10px]">
                    <div>
                      <div className="text-text-muted">Fix bevétel</div>
                      <div className="font-medium text-positive tabular-nums">{formatHuf(summary.incomeTotal)}</div>
                    </div>
                    <div>
                      <div className="text-text-muted">Fix kiadás</div>
                      <div className="font-medium text-negative tabular-nums">{formatHuf(summary.expenseTotal)}</div>
                    </div>
                  </div>
                )}
              </button>
            );
          })}

          <button
            type="button"
            onClick={addPerson}
            className="group w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm text-text-muted hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            Új kereső
          </button>
        </div>

        {/* KÖZÉP — person detail + recurring list */}
        {selectedPerson ? (
          <div className="flex flex-col gap-3">
            {/* PersonDetailHeader */}
            <Card className="p-5">
              <div className="flex items-start gap-3 mb-4">
                {(() => {
                  const ac = accent(selectedPerson.colorIndex ?? 0);
                  const initial = (selectedPerson.name || "?").charAt(0).toUpperCase();
                  return (
                    <div className={`w-11 h-11 rounded-full ${ac.bg} border ${ac.border} flex items-center justify-center text-base font-bold ${ac.text} shrink-0`}>
                      {initial}
                    </div>
                  );
                })()}
                <div className="flex-1 min-w-0">
                  <Field label="Név">
                    <Input
                      value={selectedPerson.name || ""}
                      onChange={(e) => updatePerson(selectedPerson.id, { name: e.target.value })}
                      className="w-full text-base font-semibold"
                    />
                  </Field>
                </div>
                <ConfirmDelete
                  onConfirm={() => {
                    removePerson(selectedPerson.id);
                    setSelectedPersonId(state.people.find((p) => p.id !== selectedPerson.id)?.id ?? null);
                    setSelectedItemId(null);
                  }}
                  disabled={state.people.length <= 1}
                  title={state.people.length <= 1 ? "Legalább 1 személy szükséges" : ""}
                />
              </div>

              {/* 3 stat cards */}
              {(() => {
                const summary = personSummary.get(selectedPerson.id);
                const net = (summary?.incomeTotal ?? 0) - (summary?.expenseTotal ?? 0);
                return (
                  <div className="grid grid-cols-3 gap-3">
                    <div className="rounded-xl bg-surface-2 border border-border p-3">
                      <div className="text-[10px] text-text-muted mb-1">Fix bevétel / hó</div>
                      <div className="text-sm font-bold text-positive tabular-nums">{formatHuf(summary?.incomeTotal ?? 0)}</div>
                    </div>
                    <div className="rounded-xl bg-surface-2 border border-border p-3">
                      <div className="text-[10px] text-text-muted mb-1">Fix kiadás / hó</div>
                      <div className="text-sm font-bold text-negative tabular-nums">{formatHuf(summary?.expenseTotal ?? 0)}</div>
                    </div>
                    <div className="rounded-xl bg-surface-2 border border-border p-3">
                      <div className="text-[10px] text-text-muted mb-1">Várható nettó</div>
                      <div className={`text-sm font-bold tabular-nums ${net >= 0 ? "text-positive" : "text-negative"}`}>{formatHuf(net)}</div>
                    </div>
                  </div>
                );
              })()}
            </Card>

            {/* RecurringItemList */}
            <Card className="p-0 overflow-hidden">
              {/* Inner tab bar */}
              <div className="p-3 border-b border-border">
                <div className="flex bg-surface-2 rounded-xl p-0.5 gap-0.5">
                  {(["income", "expense"] as MoneyType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => { setActiveMoneyTab(t); setSelectedItemId(null); }}
                      className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        activeMoneyTab === t
                          ? "bg-surface text-text-1 shadow-sm"
                          : "text-text-2 hover:text-text-1"
                      }`}
                    >
                      {t === "income"
                        ? <TrendingUp className="w-3.5 h-3.5" />
                        : <TrendingDown className="w-3.5 h-3.5" />
                      }
                      {t === "income" ? "Fix bevételek" : "Fix kiadások"}
                      <span className="text-[10px] text-text-muted ml-0.5">({personItems[t].length})</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Items */}
              <div className="p-3 space-y-2">
                {personItems[activeMoneyTab].length === 0 ? (
                  <div className="py-6 text-center text-sm text-text-muted">
                    Nincs {activeMoneyTab === "income" ? "bevételi" : "kiadási"} tétel ehhez a személyhez.
                  </div>
                ) : (
                  personItems[activeMoneyTab].map((r) => {
                    const isSelected = selectedItemId === r.id;
                    const cat = r.categoryId ? catById[r.categoryId] : null;
                    const isActive = r.enabled;
                    return (
                      <button
                        key={r.id}
                        type="button"
                        onClick={() => setSelectedItemId(isSelected ? null : r.id)}
                        className={`w-full text-left rounded-xl border p-3 transition-all ${
                          isSelected
                            ? "border-primary/40 bg-primary/5"
                            : isActive
                            ? "border-border bg-surface hover:bg-surface-2"
                            : "border-warning/30 bg-warning/5 opacity-80"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                              activeMoneyTab === "income" ? "bg-positive/10" : "bg-negative/10"
                            }`}>
                              {activeMoneyTab === "income"
                                ? <TrendingUp className="w-3.5 h-3.5 text-positive" />
                                : <TrendingDown className="w-3.5 h-3.5 text-negative" />
                              }
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-medium text-text-1 truncate">{r.name || "Névtelen"}</div>
                              {cat && <div className="text-[10px] text-text-muted truncate">{cat.name}</div>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span className={`text-sm font-semibold tabular-nums ${activeMoneyTab === "income" ? "text-positive" : "text-negative"}`}>
                              {formatHuf(r.amount)}
                            </span>
                            {!isActive && (
                              <span className="text-[9px] px-1 py-0.5 rounded-full border border-warning/40 text-warning font-medium">
                                draft
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Badge row */}
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border">
                            {r.cadence === "monthly" ? "havi" : r.cadence === "quarterly" ? "negyedéves" : "éves"}
                          </span>
                          {r.dayOfMonth && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-surface-2 text-text-muted border border-border">
                              {r.dayOfMonth}. nap
                            </span>
                          )}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium border ${
                            isActive
                              ? "bg-positive/10 text-positive border-positive/20"
                              : "bg-warning/10 text-warning border-warning/20"
                          }`}>
                            {isActive ? "aktív" : "draft"}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )}

                {/* Dashed CTA */}
                <button
                  type="button"
                  onClick={() => onNavigate?.(activeMoneyTab)}
                  className="group w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm text-text-muted hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
                >
                  <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
                  {activeMoneyTab === "income" ? "Fix bevétel hozzáadása" : "Fix kiadás hozzáadása"}
                </button>
              </div>
            </Card>
          </div>
        ) : (
          <div className="flex items-center justify-center py-16 text-text-muted text-sm">
            Válassz egy személyt a bal oldali listából.
          </div>
        )}

        {/* JOBB — inspector panel */}
        <div className="sticky top-20 space-y-3">
          {selectedItem ? (
            <Card className="p-4">
              <div className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-3">Tétel részletei</div>
              {!selectedItem.enabled && (
                <div className="rounded-lg border border-warning/30 bg-warning/8 border-l-4 border-l-warning p-3 mb-3">
                  <div className="text-xs text-warning font-medium">Draft tétel</div>
                  <div className="text-[10px] text-text-muted mt-0.5">Nem számít bele a havi tervbe.</div>
                </div>
              )}
              <div className="space-y-2 text-xs">
                {[
                  { label: "Megnevezés", value: selectedItem.name || "—" },
                  { label: "Összeg", value: formatHuf(selectedItem.amount) },
                  { label: "Típus", value: selectedItem.type === "income" ? "Bevétel" : "Kiadás" },
                  { label: "Kategória", value: selectedItem.categoryId ? (catById[selectedItem.categoryId]?.name ?? "—") : "—" },
                  { label: "Cadence", value: selectedItem.cadence === "monthly" ? "Havi" : selectedItem.cadence === "quarterly" ? "Negyedéves" : "Éves" },
                  { label: "Kezdet", value: selectedItem.startMonth },
                  { label: "Vége", value: selectedItem.endMonth ?? "∞" },
                  { label: "Esedékes nap", value: `${selectedItem.dayOfMonth ?? 5}.` },
                  { label: "Státusz", value: selectedItem.enabled ? "Aktív" : "Draft" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-start justify-between gap-2">
                    <span className="text-text-muted shrink-0">{label}</span>
                    <span className="text-text-1 font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => onNavigate?.(selectedItem.type)}
                  className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                >
                  Szerkesztés megnyitása →
                </button>
              </div>
            </Card>
          ) : (
            <Card className="p-4">
              <div className="flex flex-col items-center justify-center py-8 text-center gap-2">
                <Info className="w-6 h-6 text-text-muted" />
                <div className="text-sm text-text-muted">Válassz egy sort a részletekhez.</div>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Kategóriák — full width below */}
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-text-2">Kategória-rendszer</div>
            <div className="text-lg font-semibold">Bevétel- és kiadás kategóriák</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SmallButton variant="ghost" onClick={() => addCategory("income")}>
              <Plus className="w-3.5 h-3.5" /> Bevétel csoport
            </SmallButton>
            <SmallButton variant="ghost" onClick={() => addCategory("expense")}>
              <Plus className="w-3.5 h-3.5" /> Kiadás csoport
            </SmallButton>
            {state.categories.length < 10 && (
              <SmallButton variant="ghost" onClick={reseedCategories} title="Visszaállítja az alapértelmezett kategóriákat">
                <RotateCcw className="w-3.5 h-3.5" /> Visszaállítás
              </SmallButton>
            )}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <CategorySection
            title="Bevétel"
            type="income"
            parents={incomeParents}
            childrenOf={childrenOf}
            addCategory={addCategory}
            updateCategory={updateCategory}
            removeCategory={removeCategory}
          />
          <CategorySection
            title="Kiadás"
            type="expense"
            parents={expenseParents}
            childrenOf={childrenOf}
            addCategory={addCategory}
            updateCategory={updateCategory}
            removeCategory={removeCategory}
          />
        </div>
      </Card>
    </div>
  );
}

function CategorySection({
  title,
  type,
  parents,
  childrenOf,
  addCategory,
  updateCategory,
  removeCategory,
}: {
  title: string;
  type: MoneyType;
  parents: Category[];
  childrenOf: (parentId: string) => Category[];
  addCategory: (type: MoneyType, parentId?: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(parents.map((p) => p.id)));

  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold">{title}</div>

      {parents.length === 0 && (
        <div className="text-xs text-text-muted">Nincs {title.toLowerCase()} kategória.</div>
      )}

      {parents.map((parent) => {
        const children = childrenOf(parent.id);
        const isCollapsed = collapsed.has(parent.id);
        const hasChildren = children.length > 0;

        return (
          <div key={parent.id} className="rounded-xl border border-border bg-surface-2 overflow-hidden">
            {/* Szülő sor */}
            <div className="flex items-center gap-2 p-2 pl-3">
              <button
                type="button"
                onClick={() => toggle(parent.id)}
                className="shrink-0 text-text-muted hover:text-text-2 transition min-w-9 min-h-9 flex items-center justify-center"
                title={isCollapsed ? "Kinyit" : "Összecsuk"}
              >
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                />
              </button>
              <Input
                value={parent.name}
                onChange={(e) => updateCategory(parent.id, { name: e.target.value })}
                className="flex-1 font-medium"
              />
              <SmallButton
                variant="ghost"
                onClick={() => addCategory(type, parent.id)}
                title="Alkategória hozzáadása"
              >
                <Plus className="w-3 h-3" />
              </SmallButton>
              <ConfirmDelete onConfirm={() => removeCategory(parent.id)} />
            </div>

            {/* Alkategóriák */}
            {!isCollapsed && hasChildren && (
              <div className="border-t border-border bg-bg">
                {children.map((child) => (
                  <div
                    key={child.id}
                    className="flex items-center gap-2 px-3 py-2 pl-9 border-b border-border last:border-b-0"
                  >
                    <span className="text-text-muted text-xs shrink-0">↳</span>
                    <Input
                      value={child.name}
                      onChange={(e) => updateCategory(child.id, { name: e.target.value })}
                      className="flex-1 text-sm"
                    />
                    <ConfirmDelete onConfirm={() => removeCategory(child.id)} />
                  </div>
                ))}
              </div>
            )}

            {/* Alkategória hozzáadása */}
            {!isCollapsed && !hasChildren && (
              <div className="border-t border-border px-9 py-2">
                <button
                  type="button"
                  onClick={() => addCategory(type, parent.id)}
                  className="text-xs text-text-muted hover:text-text-2 transition flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> alkategória hozzáadása
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

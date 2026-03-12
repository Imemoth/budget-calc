import { useMemo, useState } from "react";
import { Plus, ChevronDown, RotateCcw } from "lucide-react";
import type { State, MoneyType, Person, Category, TabKey } from "../types";
import { Card, Field, Input, SmallButton, ConfirmDelete } from "./ui";
import { formatHuf } from "../lib/format";

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
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const incomeParents = state.categories.filter((c) => c.type === "income" && !c.parentId);
  const expenseParents = state.categories.filter((c) => c.type === "expense" && !c.parentId);
  const childrenOf = (parentId: string) =>
    state.categories.filter((c) => c.parentId === parentId);

  // Per-person recurring summary (only enabled items)
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

  const totalPlannedIncome = useMemo(
    () => state.recurring.filter((r) => r.enabled && r.type === "income").reduce((s, r) => s + (Number(r.amount) || 0), 0),
    [state.recurring]
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Személyek */}
      <div className="space-y-4">
        {/* Hero */}
        <div className="rounded-2xl border border-emerald-500/30 border-l-4 border-l-emerald-500 bg-emerald-950/20 p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-text-muted mb-1">Tervezett havi bevétel összesen</div>
              <div className="text-3xl font-bold tabular-nums text-emerald-300">{formatHuf(totalPlannedIncome)}</div>
            </div>
            <div className="text-right">
              <div className="text-[11px] text-text-muted">Személyek</div>
              <div className="text-sm font-semibold text-text-1">{state.people.length} fő</div>
            </div>
          </div>
        </div>

        {/* Person cards */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-sm text-text-2">Bevételek bővíthetősége</div>
              <div className="text-base font-semibold">Keresők / személyek</div>
            </div>
          </div>

          <div className="space-y-2">
            {state.people.map((p, idx) => {
              const isExpanded = expandedId === p.id;
              const summary = personSummary.get(p.id);
              const initial = (p.name || "?").charAt(0).toUpperCase();
              return (
                <div key={p.id} className="rounded-xl border border-border bg-surface-2 overflow-hidden">
                  {/* Collapsed header */}
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : p.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-xs font-bold text-primary shrink-0">
                      {initial}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-text-1">{p.name || `Személy ${idx + 1}`}</div>
                      {summary ? (
                        <div className="text-xs mt-0.5 flex flex-wrap gap-x-3">
                          {summary.incomeCount > 0 && (
                            <span className="text-positive">{summary.incomeCount} bevétel · {formatHuf(summary.incomeTotal)}/hó</span>
                          )}
                          {summary.expenseCount > 0 && (
                            <span className="text-negative">{summary.expenseCount} kiadás · {formatHuf(summary.expenseTotal)}/hó</span>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-text-muted mt-0.5">Nincs hozzárendelt tétel</div>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-text-muted shrink-0 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>

                  {/* Expanded edit */}
                  {isExpanded && (
                    <div className="border-t border-border px-4 py-3 space-y-3">
                      <Field label="Név">
                        <Input
                          value={p.name || ""}
                          onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                          className="w-full"
                        />
                      </Field>
                      <div className="flex items-center justify-between gap-2 pt-1">
                        <ConfirmDelete
                          onConfirm={() => { removePerson(p.id); setExpandedId(null); }}
                          disabled={state.people.length <= 1}
                          title={state.people.length <= 1 ? "Legalább 1 személy szükséges" : ""}
                        />
                        {onNavigate && (
                          <div className="flex gap-2">
                            <SmallButton variant="ghost" onClick={() => onNavigate("income")}>
                              + Fix bevétel
                            </SmallButton>
                            <SmallButton variant="ghost" onClick={() => onNavigate("expense")}>
                              + Fix kiadás
                            </SmallButton>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <button
            type="button"
            onClick={addPerson}
            className="group mt-3 w-full flex items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-2.5 text-sm text-text-muted hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" />
            Új kereső hozzáadása
          </button>

          <div className="mt-3 text-[11px] text-text-muted">
            Tipp: ha később 3. jövedelemforrás belép, itt egy kattintással bővítheted a listát, majd a fix bevételeknél hozzárendelheted.
          </div>
        </Card>
      </div>

      {/* Kategóriák */}
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

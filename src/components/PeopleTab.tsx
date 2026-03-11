import { useState } from "react";
import { Plus, ChevronDown, RotateCcw } from "lucide-react";
import type { State, MoneyType, Person, Category } from "../types";
import { Card, Field, Input, SmallButton, ConfirmDelete } from "./ui";

export function PeopleCategoriesView({
  state,
  addPerson,
  updatePerson,
  removePerson,
  addCategory,
  updateCategory,
  removeCategory,
  reseedCategories,
}: {
  state: State;
  addPerson: () => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  removePerson: (id: string) => void;
  addCategory: (type: MoneyType, parentId?: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  reseedCategories: () => void;
}) {
  const incomeParents = state.categories.filter((c) => c.type === "income" && !c.parentId);
  const expenseParents = state.categories.filter((c) => c.type === "expense" && !c.parentId);
  const childrenOf = (parentId: string) =>
    state.categories.filter((c) => c.parentId === parentId);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      {/* Személyek */}
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-text-2">Bevételek bővíthetősége</div>
            <div className="text-lg font-semibold">Keresők / személyek</div>
          </div>
          <SmallButton variant="solid" onClick={addPerson}>
            <Plus className="w-3.5 h-3.5" /> Új személy
          </SmallButton>
        </div>

        <div className="mt-4 space-y-3">
          {state.people.map((p, idx) => (
            <div key={p.id} className="rounded-xl border border-border bg-surface-2 p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-8">
                  <Field label={`Név (#${idx + 1})`}>
                    <Input
                      value={p.name || ""}
                      onChange={(e) => updatePerson(p.id, { name: e.target.value })}
                    />
                  </Field>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <ConfirmDelete
                    onConfirm={() => removePerson(p.id)}
                    disabled={state.people.length <= 1}
                    title={state.people.length <= 1 ? "Legalább 1 személy szükséges" : ""}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-[11px] text-text-muted">
          Tipp: ha később 3. jövedelemforrás belép, itt egy kattintással bővítheted a listát, majd a fix bevételeknél hozzárendelheted.
        </div>
      </Card>

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
  // Alapból minden csoport csukva; kattintásra nyílik ki
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

            {/* Alkategóriák – csak ha nem összecsukt */}
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

            {/* Alkategória hozzáadása gomb – összecsukt esetén is látszik ha üres */}
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

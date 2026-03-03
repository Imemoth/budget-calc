import { Plus } from "lucide-react";
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
}: {
  state: State;
  addPerson: () => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  removePerson: (id: string) => void;
  addCategory: (type: MoneyType) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
}) {
  const incomeCats = state.categories.filter((c) => c.type === "income");
  const expenseCats = state.categories.filter((c) => c.type === "expense");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Bevételek bővíthetősége</div>
            <div className="text-lg font-semibold">Keresők / személyek</div>
          </div>
          <SmallButton variant="solid" onClick={addPerson}>
            <Plus className="w-3.5 h-3.5" /> Új személy
          </SmallButton>
        </div>

        <div className="mt-4 space-y-3">
          {state.people.map((p, idx) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
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

        <div className="mt-4 text-[11px] text-white/40">
          Tipp: ha később 3. jövedelemforrás belép, itt egy kattintással bővítheted a listát, majd a fix bevételeknél hozzárendelheted.
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Kategória-rendszer</div>
            <div className="text-lg font-semibold">Bevétel- és kiadás kategóriák</div>
          </div>
          <div className="flex items-center gap-2">
            <SmallButton variant="ghost" onClick={() => addCategory("income")}>
              <Plus className="w-3.5 h-3.5" /> Bevétel kategória
            </SmallButton>
            <SmallButton variant="ghost" onClick={() => addCategory("expense")}>
              <Plus className="w-3.5 h-3.5" /> Kiadás kategória
            </SmallButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold">Bevétel</div>
            {incomeCats.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                />
                <ConfirmDelete onConfirm={() => removeCategory(c.id)} />
              </div>
            ))}
            {incomeCats.length === 0 && <div className="text-xs text-white/40">Nincs bevétel kategória.</div>}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold">Kiadás</div>
            {expenseCats.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                />
                <ConfirmDelete onConfirm={() => removeCategory(c.id)} />
              </div>
            ))}
            {expenseCats.length === 0 && <div className="text-xs text-white/40">Nincs kiadás kategória.</div>}
          </div>
        </div>
      </Card>
    </div>
  );
}

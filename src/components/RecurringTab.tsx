import { useMemo, useState } from "react";
import { ChevronDown, ArrowDownToLine, TrendingUp, TrendingDown } from "lucide-react";
import { uid, monthKey } from "../lib/utils";
import { formatHuf } from "../lib/format";
import type { State, MoneyType, RecurringItem, Category } from "../types";
import { Field, Input, Select, SmallButton, ConfirmDelete, CategorySelect } from "./ui";
import {
  normalizeMonthInput,
  parseNumberInput,
} from "../lib/domainHelpers";

// ---- MiniStat kártya ----
function MiniStat({ label, value, sub, color }: {
  label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="rounded-2xl border border-border p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
        boxShadow: `var(--shadow-card), 0 0 20px ${color}14`,
        borderLeftWidth: 3, borderLeftColor: color,
      }}>
      <div className="absolute -top-6 -left-6 w-20 h-20 rounded-full pointer-events-none"
        style={{ background: color, opacity: 0.06, filter: "blur(16px)" }} />
      <div className="text-[10px] font-semibold text-text-muted uppercase tracking-wider mb-1.5">{label}</div>
      <div className="text-xl font-extrabold tabular-nums leading-none" style={{ color }}>{value}</div>
      {sub && <div className="text-[11px] text-text-muted mt-1">{sub}</div>}
    </div>
  );
}

const CAT_COLORS = [
  "var(--color-chart-1)","var(--color-chart-2)","var(--color-chart-3)","var(--color-chart-4)",
  "var(--color-primary)","var(--color-accent)","#A78BFA","#22D3EE","#F472B6","#6EE7B7",
];

// ---- Fő komponens ----
export function RecurringTab({
  state,
  addRecurringFull,
  updateRecurring,
  removeRecurring,
  convertRecurring,
}: {
  state: State;
  addRecurringFull: (patch: Partial<RecurringItem> & { type: MoneyType }) => string;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  convertRecurring: (r: RecurringItem, month: string) => void;
}) {
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "draft">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [catFilter, setCatFilter] = useState<string>("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const allCategories = state.categories;
  const currentMonth = monthKey(new Date());

  const catColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach((c, i) => map.set(c.id, CAT_COLORS[i % CAT_COLORS.length]));
    return map;
  }, [allCategories]);

  // Filtered recurring items
  const filtered = useMemo(() => {
    return state.recurring
      .filter(r => {
        if (statusFilter !== "all" && (statusFilter === "active" ? !r.enabled : r.enabled)) return false;
        if (typeFilter !== "all" && r.type !== typeFilter) return false;
        if (catFilter && r.categoryId !== catFilter) return false;
        return true;
      });
  }, [state.recurring, statusFilter, typeFilter, catFilter]);

  // Stats
  const stats = useMemo(() => {
    const activeIncome = state.recurring
      .filter(r => r.enabled && r.type === "income")
      .reduce((s, r) => s + (r.amount ?? 0), 0);
    const activeExpense = state.recurring
      .filter(r => r.enabled && r.type === "expense")
      .reduce((s, r) => s + (r.amount ?? 0), 0);
    const draftCount = state.recurring.filter(r => !r.enabled).length;
    const net = activeIncome - activeExpense;
    return { activeIncome, activeExpense, draftCount, net };
  }, [state.recurring]);

  // Top categories for filter
  const topCats = useMemo(() => {
    const count = new Map<string, number>();
    state.recurring.forEach(r => {
      if (!r.categoryId) return;
      if (typeFilter !== "all" && r.type !== typeFilter) return;
      count.set(r.categoryId, (count.get(r.categoryId) ?? 0) + 1);
    });
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => allCategories.find(c => c.id === id))
      .filter(Boolean) as Category[];
  }, [state.recurring, typeFilter, allCategories]);

  const handleAdd = (type: MoneyType) => {
    const draft: RecurringItem = {
      id: uid(),
      type,
      name: type === "income" ? "Fix bevétel" : "Fix kiadás",
      amount: 0,
      categoryId: null,
      cadence: "monthly",
      startMonth: monthKey(new Date(new Date().getFullYear(), 0, 1)),
      endMonth: null,
      dayOfMonth: 5,
      personId: null,
      enabled: true,
      notes: "",
    };
    addRecurringFull(draft);
  };

  return (
    <div className="space-y-4">

      {/* ---- Stat strip ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Aktív bevétel/hó"  value={formatHuf(stats.activeIncome)} sub={`${state.recurring.filter(r=>r.enabled && r.type==="income").length} tétel`} color="var(--color-positive)" />
        <MiniStat label="Aktív kiadás/hó" value={formatHuf(stats.activeExpense)}  sub={`${state.recurring.filter(r=>r.enabled && r.type==="expense").length} tétel`}  color="var(--color-negative)" />
        <MiniStat label="Draft tételek" value={String(stats.draftCount)} sub="nem számít be" color="var(--color-warning)" />
        <MiniStat label="Nettó terv" value={`${stats.net >= 0 ? "+" : "−"}${formatHuf(Math.abs(stats.net))}`} sub="bevétel − kiadás" color={stats.net >= 0 ? "var(--color-positive)" : "var(--color-negative)"} />
      </div>

      {/* ---- Fő kártya ---- */}
      <div className="rounded-2xl border border-border overflow-hidden"
        style={{
          background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
          boxShadow: "var(--shadow-card)",
        }}>

        {/* Kártya fejléc */}
        <div className="px-5 py-4 border-b border-border flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Rendszeres tételek</div>
            <div className="text-base font-bold text-text-1">Fix bevételek és kiadások</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <SmallButton variant="primary" onClick={() => handleAdd("expense")}>
              <TrendingDown className="w-3.5 h-3.5" /> Új kiadás
            </SmallButton>
            <SmallButton variant="solid" onClick={() => handleAdd("income")}>
              <TrendingUp className="w-3.5 h-3.5" /> Új bevétel
            </SmallButton>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-border space-y-3">
          {/* Sor 1: status + type chips */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex rounded-xl overflow-hidden border border-border text-xs font-semibold shrink-0">
              {(["all", "active", "draft"] as const).map((s) => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className="px-3 py-1.5 transition-colors"
                  style={statusFilter === s ? {
                    background: s === "active" ? "var(--color-positive)" : s === "draft" ? "var(--color-warning)" : "var(--color-primary)",
                    color: "#fff",
                  } : { color: "var(--color-text-2)", background: "transparent" }}>
                  {s === "all" ? "Mind" : s === "active" ? "Aktív" : "Draft"}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-border shrink-0" />

            <div className="flex rounded-xl overflow-hidden border border-border text-xs font-semibold shrink-0">
              {(["all", "income", "expense"] as const).map((t) => (
                <button key={t} type="button" onClick={() => { setTypeFilter(t); setCatFilter(""); }}
                  className="px-3 py-1.5 transition-colors"
                  style={typeFilter === t ? {
                    background: t === "income" ? "var(--color-positive)" : t === "expense" ? "var(--color-negative)" : "var(--color-primary)",
                    color: "#fff",
                  } : { color: "var(--color-text-2)", background: "transparent" }}>
                  {t === "all" ? "Minden" : t === "income" ? "Bevétel" : "Kiadás"}
                </button>
              ))}
            </div>
          </div>

          {/* Sor 2: kategória filter chips */}
          {topCats.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] text-text-muted shrink-0">Kategória:</span>
              {topCats.map(cat => (
                <button key={cat.id} type="button" onClick={() => setCatFilter(catFilter === cat.id ? "" : cat.id)}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0"
                  style={catFilter === cat.id ? {
                    background: `${catColorMap.get(cat.id)}22`,
                    color: catColorMap.get(cat.id),
                    borderColor: `${catColorMap.get(cat.id)}55`,
                  } : { color: "var(--color-text-2)", borderColor: "var(--color-border)" }}>
                  <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: catColorMap.get(cat.id) }} />
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Lista */}
        {filtered.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <div className="text-base font-semibold text-text-2">
              {state.recurring.length === 0 ? "Még nincs fix tétel" : "Nincs találat"}
            </div>
            <div className="text-xs text-text-muted">
              {state.recurring.length === 0
                ? "Kattints az \"Új bevétel\" vagy \"Új kiadás\" gombra."
                : "Próbálj más szűrőt."}
            </div>
          </div>
        ) : (
          <div>
            {/* Desktop column headers (hidden on mobile) */}
            <div className="hidden sm:grid px-5 py-2 text-[10px] text-text-muted uppercase tracking-wider font-semibold border-b border-border/20 gap-3"
              style={{ gridTemplateColumns: "40px 2fr 1fr 120px 100px 140px 32px" }}>
              <div></div>
              <div>Megnevezés</div>
              <div>Kategória</div>
              <div>Ki</div>
              <div>Frekvencia</div>
              <div className="text-right">Összeg</div>
              <div></div>
            </div>

            {/* Tételek */}
            <div className="divide-y divide-border/40">
              {filtered.map(r => {
                const isExpanded = expandedId === r.id;
                const isDraft = !r.enabled;
                const cat = allCategories.find(c => c.id === r.categoryId);
                const person = r.personId ? state.people.find(p => p.id === r.personId) : null;
                const isIncome = r.type === "income";
                const cadenceLabel = r.cadence === "quarterly" ? "Negyedéves" : r.cadence === "yearly" ? "Éves" : "Havi";

                return (
                  <div key={r.id}>
                    {/* Desktop table row */}
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className={`hidden sm:grid w-full items-center px-5 py-3 text-left transition-colors gap-3 ${isDraft ? "opacity-75 bg-warning/5 hover:bg-warning/10" : "hover:bg-surface-2/50"}`}
                      style={{ gridTemplateColumns: "40px 2fr 1fr 120px 100px 140px 32px" }}>

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold`}
                        style={{
                          background: isDraft ? "var(--color-warning)20" : isIncome ? "var(--color-positive)20" : "var(--color-negative)20",
                          color: isDraft ? "var(--color-warning)" : isIncome ? "var(--color-positive)" : "var(--color-negative)",
                        }}>
                        {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>

                      {/* Name + Badge */}
                      <div className="min-w-0 flex items-center gap-2">
                        <span className={`text-sm font-semibold truncate ${isDraft ? "text-text-muted" : "text-text-1"}`}>{r.name || "(névtelen)"}</span>
                        {isDraft && (
                          <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium border bg-warning/10 text-warning border-warning/20">Draft</span>
                        )}
                      </div>

                      {/* Category */}
                      <div className="text-xs text-text-muted truncate">
                        {cat?.name || "—"}
                      </div>

                      {/* Person */}
                      <div className="text-xs text-text-muted truncate">
                        {person?.name || "—"}
                      </div>

                      {/* Frequency */}
                      <div className="text-xs text-text-muted truncate">
                        {cadenceLabel}
                      </div>

                      {/* Amount */}
                      <span className={`text-sm font-bold tabular-nums text-right shrink-0 ${isDraft ? "text-text-muted" : isIncome ? "text-positive" : "text-negative"}`}>
                        {formatHuf(r.amount ?? 0)}
                      </span>

                      {/* Chevron */}
                      <ChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Mobile simplified row */}
                    <button type="button" onClick={() => setExpandedId(isExpanded ? null : r.id)}
                      className={`sm:hidden w-full flex items-center gap-3 px-5 py-3 text-left transition-colors ${isDraft ? "opacity-75 bg-warning/5 hover:bg-warning/10" : "hover:bg-surface-2/50"}`}>

                      {/* Icon */}
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold`}
                        style={{
                          background: isDraft ? "var(--color-warning)20" : isIncome ? "var(--color-positive)20" : "var(--color-negative)20",
                          color: isDraft ? "var(--color-warning)" : isIncome ? "var(--color-positive)" : "var(--color-negative)",
                        }}>
                        {isIncome ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                      </div>

                      {/* Name */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-semibold truncate ${isDraft ? "text-text-muted" : "text-text-1"}`}>{r.name || "(névtelen)"}</span>
                          {isDraft && (
                            <span className="shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium border bg-warning/10 text-warning border-warning/20">Draft</span>
                          )}
                        </div>
                        <div className="text-xs text-text-muted truncate mt-0.5">
                          {[cat?.name, person?.name, cadenceLabel].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>

                      {/* Amount */}
                      <span className={`text-sm font-bold tabular-nums shrink-0 ${isDraft ? "text-text-muted" : isIncome ? "text-positive" : "text-negative"}`}>
                        {formatHuf(r.amount ?? 0)}
                      </span>

                      {/* Chevron */}
                      <ChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    {/* Expanded edit */}
                    {isExpanded && (
                      <div className="px-5 pb-4 pt-3 border-t border-border bg-bg/30">
                        <div className="grid grid-cols-[1fr_140px] gap-3 mb-3">
                          <Field label="Megnevezés">
                            <Input value={r.name || ""} onChange={(e) => updateRecurring(r.id, { name: e.target.value })} className="w-full" />
                          </Field>
                          <Field label="Összeg">
                            <Input type="number" value={r.amount ?? 0} onChange={(e) => updateRecurring(r.id, { amount: parseNumberInput(e.target.value) })} className="w-full text-right" />
                          </Field>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                          <Field label="Kategória">
                            <CategorySelect
                              value={r.categoryId || ""}
                              onChange={(id) => updateRecurring(r.id, { categoryId: id || null })}
                              categories={allCategories.filter(c => c.type === r.type)}
                              className="w-full"
                            />
                          </Field>
                          <Field label="Személy">
                            <Select value={r.personId || ""} onChange={(e) => updateRecurring(r.id, { personId: e.target.value || null })} className="w-full">
                              <option value="">Háztartás</option>
                              {state.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </Select>
                          </Field>
                          <Field label="Státusz">
                            <Select
                              value={r.enabled ? "yes" : "no"}
                              onChange={(e) => updateRecurring(r.id, { enabled: e.target.value === "yes" })}
                              className="w-full"
                            >
                              <option value="yes">Aktív</option>
                              <option value="no">Draft</option>
                            </Select>
                          </Field>
                          <Field label="Gyakoriság">
                            <Select
                              value={r.cadence}
                              onChange={(e) => updateRecurring(r.id, { cadence: e.target.value as RecurringItem["cadence"] })}
                              className="w-full"
                            >
                              <option value="monthly">Havi</option>
                              <option value="quarterly">Negyedéves</option>
                              <option value="yearly">Éves</option>
                            </Select>
                          </Field>
                          <Field label="Kezdő hónap">
                            <Input
                              type="month"
                              value={r.startMonth || ""}
                              onChange={(e) => updateRecurring(r.id, { startMonth: normalizeMonthInput(e.target.value) })}
                              className="w-full"
                            />
                          </Field>
                          <Field label="Záró hónap">
                            <Input
                              type="month"
                              value={r.endMonth || ""}
                              onChange={(e) => updateRecurring(r.id, { endMonth: normalizeMonthInput(e.target.value) || null })}
                              className="w-full"
                            />
                          </Field>
                        </div>
                        <Field label="Megjegyzés">
                          <Input value={r.notes || ""} onChange={(e) => updateRecurring(r.id, { notes: e.target.value })} className="w-full" />
                        </Field>
                        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
                          {!r.enabled || (
                            <button
                              type="button"
                              title={`Rögzít tényleges tételként (${currentMonth})`}
                              onClick={() => { convertRecurring(r, currentMonth); setExpandedId(null); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium border border-primary/30 text-primary bg-primary/10 hover:bg-primary/20 transition-colors"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5" />
                              Rögzít
                            </button>
                          )}
                          <ConfirmDelete onConfirm={() => { removeRecurring(r.id); setExpandedId(null); }} />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

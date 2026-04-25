import { useMemo, useState } from "react";
import { Plus, ChevronDown, Search, TrendingUp, TrendingDown, Calendar, ArrowUpDown } from "lucide-react";
import { formatHuf } from "../lib/format";
import type { State, MoneyType, Transaction, Category } from "../types";
import { Field, Input, Select, SmallButton, ConfirmDelete, CategorySelect, ModalOverlay, ModalPanel } from "./ui";
import { normalizeDateInput, parseNumberInput } from "../lib/domainHelpers";
import { getCategoryIcon } from "../lib/categoryIcons";
import { RevolutImportButton } from "./RevolutImport";

// ---- helpers ----

function monthOf(d: string) { return (d || "").slice(0, 7); }

function formatDayHeader(isoDate: string): string {
  if (!isoDate) return "Ismeretlen dátum";
  const d = new Date(isoDate + "T00:00:00");
  if (isNaN(d.getTime())) return isoDate;
  const months = ["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"];
  const days = ["vasárnap","hétfő","kedd","szerda","csütörtök","péntek","szombat"];
  const today = new Date(); today.setHours(0,0,0,0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  const dayName = diff === 0 ? "Ma" : diff === -1 ? "Tegnap" : days[d.getDay()];
  return `${d.getDate()} ${months[d.getMonth()]} · ${dayName}`;
}

const CAT_COLORS = [
  "var(--color-chart-1)","var(--color-chart-2)","var(--color-chart-3)","var(--color-chart-4)",
  "var(--color-primary)","var(--color-accent)","#A78BFA","#22D3EE","#F472B6","#6EE7B7",
];

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

// ---- Fő komponens ----
export function TransactionsTab({
  state,
  addTransactionFull,
  updateTransaction,
  removeTransaction,
}: {
  state: State;
  addTransactionFull: (patch: Partial<Transaction> & { type: MoneyType }) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | "income" | "expense">("all");
  const [catFilter, setCatFilter] = useState<string>("");
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [sortDesc, setSortDesc] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draftModal, setDraftModal] = useState<{
    type: MoneyType; name: string; amount: number; date: string;
    categoryId: string | null; personId: string | null; notes: string;
  } | null>(null);

  const allCategories = state.categories;
  const incomeCategories = allCategories.filter(c => c.type === "income");
  const expenseCategories = allCategories.filter(c => c.type === "expense");

  const catColorMap = useMemo(() => {
    const map = new Map<string, string>();
    allCategories.forEach((c, i) => map.set(c.id, CAT_COLORS[i % CAT_COLORS.length]));
    return map;
  }, [allCategories]);

  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    state.transactions.forEach(t => { if (t.date) set.add(monthOf(t.date)); });
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [state.transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.transactions
      .filter(t => {
        if (typeFilter !== "all" && t.type !== typeFilter) return false;
        if (catFilter && t.categoryId !== catFilter) return false;
        if (filterMonth && monthOf(t.date) !== filterMonth) return false;
        if (q && !`${t.name ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => sortDesc
        ? (b.date || "").localeCompare(a.date || "")
        : (a.date || "").localeCompare(b.date || ""));
  }, [state.transactions, typeFilter, catFilter, filterMonth, search, sortDesc]);

  const stats = useMemo(() => {
    const income  = filtered.filter(t => t.type === "income").reduce((s, t) => s + (t.amount ?? 0), 0);
    const expense = filtered.filter(t => t.type === "expense").reduce((s, t) => s + (t.amount ?? 0), 0);
    const net     = income - expense;
    const avg     = filtered.length ? Math.round((income + expense) / filtered.length) : 0;
    return { income, expense, net, avg, count: filtered.length };
  }, [filtered]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    filtered.forEach(t => {
      const d = t.date || "";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return [...map.entries()].sort(([a], [b]) => sortDesc ? b.localeCompare(a) : a.localeCompare(b));
  }, [filtered, sortDesc]);

  const topCats = useMemo(() => {
    const count = new Map<string, number>();
    state.transactions.forEach(t => {
      if (!t.categoryId) return;
      if (typeFilter !== "all" && t.type !== typeFilter) return;
      count.set(t.categoryId, (count.get(t.categoryId) ?? 0) + 1);
    });
    return [...count.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([id]) => allCategories.find(c => c.id === id))
      .filter(Boolean) as Category[];
  }, [state.transactions, typeFilter, allCategories]);

  const openDraft = (type: MoneyType) => setDraftModal({
    type, name: "", amount: 0,
    date: new Date().toISOString().slice(0, 10),
    categoryId: null, personId: null, notes: "",
  });

  return (
    <div className="space-y-4">

      {/* ---- Stat strip ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MiniStat label="Kiadás összesen"  value={formatHuf(stats.expense)} sub={`${filtered.filter(t=>t.type==="expense").length} tétel`} color="var(--color-negative)" />
        <MiniStat label="Bevétel összesen" value={formatHuf(stats.income)}  sub={`${filtered.filter(t=>t.type==="income").length} tétel`}  color="var(--color-positive)" />
        <MiniStat
          label="Egyenleg"
          value={`${stats.net >= 0 ? "+" : "−"}${formatHuf(Math.abs(stats.net))}`}
          sub={`${stats.count} tétel összesen`}
          color={stats.net >= 0 ? "var(--color-positive)" : "var(--color-negative)"}
        />
        <MiniStat label="Átlag / tétel" value={formatHuf(stats.avg)} sub="átlagos érték" color="var(--color-chart-1)" />
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
            <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Összes tranzakció</div>
            <div className="text-base font-bold text-text-1">Tranzakciók</div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <RevolutImportButton state={state} addTransactionFull={addTransactionFull} />
            <SmallButton variant="primary" onClick={() => openDraft("expense")}>
              <TrendingDown className="w-3.5 h-3.5" /> Kiadás rögzítése
            </SmallButton>
            <SmallButton variant="solid" onClick={() => openDraft("income")}>
              <TrendingUp className="w-3.5 h-3.5" /> Bevétel rögzítése
            </SmallButton>
          </div>
        </div>

        {/* Filter bar */}
        <div className="px-5 py-3 border-b border-border space-y-3">
          {/* Sor 1: keresés + rendezés */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Keresés…"
                className="pl-9 text-sm"
              />
            </div>
            <button
              type="button"
              onClick={() => setSortDesc(v => !v)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium border border-border text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors shrink-0"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              {sortDesc ? "Legújabb" : "Legrégebbi"}
            </button>
          </div>

          {/* Sor 2: type chips + month chips */}
          <div className="flex items-center gap-2 flex-wrap">
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

            <div className="w-px h-5 bg-border shrink-0" />

            <button type="button" onClick={() => setFilterMonth("")}
              className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0"
              style={!filterMonth ? { background: "var(--color-primary)18", color: "var(--color-primary)", borderColor: "var(--color-primary)40" }
                : { color: "var(--color-text-2)", borderColor: "var(--color-border)" }}>
              Összes hónap
            </button>
            {availableMonths.slice(0, 5).map(m => {
              const [y, mo] = m.split("-");
              const label = `${["jan","feb","már","ápr","máj","jún","júl","aug","szep","okt","nov","dec"][parseInt(mo,10)-1]} ${y}`;
              return (
                <button key={m} type="button" onClick={() => setFilterMonth(filterMonth === m ? "" : m)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium border transition-colors shrink-0"
                  style={filterMonth === m ? { background: "var(--color-primary)18", color: "var(--color-primary)", borderColor: "var(--color-primary)40" }
                    : { color: "var(--color-text-2)", borderColor: "var(--color-border)" }}>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Sor 3: kategória filter chips */}
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
              {state.transactions.length === 0 ? "Még nincs rögzített tranzakció" : "Nincs találat"}
            </div>
            <div className="text-xs text-text-muted">
              {state.transactions.length === 0
                ? "Kattints a \"Kiadás rögzítése\" vagy \"Bevétel rögzítése\" gombra."
                : "Próbálj más szűrőt."}
            </div>
          </div>
        ) : (
          <div>
            {grouped.map(([date, items]) => {
              const dayIncome  = items.filter(t => t.type === "income").reduce((s,t) => s + (t.amount??0), 0);
              const dayExpense = items.filter(t => t.type === "expense").reduce((s,t) => s + (t.amount??0), 0);
              return (
                <div key={date}>
                  {/* Nap fejléc */}
                  <div className="px-5 pt-3 pb-2.5 flex items-center justify-between border-b border-border/40"
                    style={{ background: "var(--color-surface-2)30" }}>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-text-muted shrink-0" />
                      <span className="text-xs font-semibold text-text-2">{formatDayHeader(date)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] tabular-nums">
                      {dayIncome > 0 && <span style={{ color: "var(--color-positive)" }}>+{formatHuf(dayIncome)}</span>}
                      {dayExpense > 0 && <span style={{ color: "var(--color-negative)" }}>−{formatHuf(dayExpense)}</span>}
                    </div>
                  </div>

                  {/* Desktop column headers (hidden on mobile) */}
                  <div className="hidden sm:grid px-5 py-2 text-[10px] text-text-muted uppercase tracking-wider font-semibold border-b border-border/20 gap-3"
                    style={{ gridTemplateColumns: "40px 2fr 1fr 120px 100px 140px 32px" }}>
                    <div></div>
                    <div>Leírás</div>
                    <div>Kategória</div>
                    <div>Ki</div>
                    <div>Dátum</div>
                    <div className="text-right">Összeg</div>
                    <div></div>
                  </div>

                  {/* Tételek */}
                  <div className="divide-y divide-border/40">
                    {items.map(t => {
                      const isExpanded = expandedId === t.id;
                      const cat = allCategories.find(c => c.id === t.categoryId);

                      const person = t.personId ? state.people.find(p => p.id === t.personId) : null;
                      const isIncome = t.type === "income";

                      return (
                        <div key={t.id}>
                          {/* Desktop table row */}
                          <button type="button" onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            className="hidden sm:grid w-full items-center px-5 py-3 text-left hover:bg-surface-2/50 transition-colors gap-3"
                            style={{ gridTemplateColumns: "40px 2fr 1fr 120px 100px 140px 32px" }}>

                            {/* Category icon */}
                            {getCategoryIcon(cat?.name ?? "", t.type)}

                            {/* Name + Badge */}
                            <div className="min-w-0 flex items-center gap-2">
                              <span className="text-sm font-semibold text-text-1 truncate">{t.name || "(névtelen)"}</span>
                              <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                                style={{
                                  background: isIncome ? "var(--color-positive)18" : "var(--color-negative)18",
                                  color: isIncome ? "var(--color-positive)" : "var(--color-negative)",
                                }}>
                                {isIncome ? "Bev" : "Kiad"}
                              </span>
                            </div>

                            {/* Category */}
                            <div className="text-xs text-text-muted truncate">
                              {cat?.name || "—"}
                            </div>

                            {/* Person */}
                            <div className="text-xs text-text-muted truncate">
                              {person?.name || "—"}
                            </div>

                            {/* Date */}
                            <div className="text-xs text-text-muted truncate">
                              {t.date || "—"}
                            </div>

                            {/* Amount */}
                            <span className="text-sm font-bold tabular-nums text-right shrink-0"
                              style={{ color: isIncome ? "var(--color-positive)" : "var(--color-negative)" }}>
                              {isIncome ? "+" : "−"}{formatHuf(t.amount ?? 0)}
                            </span>

                            {/* Chevron */}
                            <ChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>

                          {/* Mobile simplified row */}
                          <button type="button" onClick={() => setExpandedId(isExpanded ? null : t.id)}
                            className="sm:hidden w-full flex items-center gap-3 px-5 py-3 text-left hover:bg-surface-2/50 transition-colors">

                            {/* Category icon */}
                            {getCategoryIcon(cat?.name ?? "", t.type)}

                            {/* Name */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-semibold text-text-1 truncate">{t.name || "(névtelen)"}</span>
                                <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wider"
                                  style={{
                                    background: isIncome ? "var(--color-positive)18" : "var(--color-negative)18",
                                    color: isIncome ? "var(--color-positive)" : "var(--color-negative)",
                                  }}>
                                  {isIncome ? "Bev" : "Kiad"}
                                </span>
                              </div>
                              <div className="text-xs text-text-muted truncate mt-0.5">
                                {[cat?.name, person?.name].filter(Boolean).join(" · ") || "—"}
                              </div>
                            </div>

                            {/* Amount */}
                            <span className="text-sm font-bold tabular-nums shrink-0"
                              style={{ color: isIncome ? "var(--color-positive)" : "var(--color-negative)" }}>
                              {isIncome ? "+" : "−"}{formatHuf(t.amount ?? 0)}
                            </span>

                            {/* Chevron */}
                            <ChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                          </button>

                          {/* Expanded edit */}
                          {isExpanded && (
                            <div className="px-5 pb-4 pt-3 border-t border-border bg-bg/30">
                              <div className="grid grid-cols-[1fr_140px] gap-3 mb-3">
                                <Field label="Megnevezés">
                                  <Input value={t.name || ""} onChange={(e) => updateTransaction(t.id, { name: e.target.value })} className="w-full" />
                                </Field>
                                <Field label="Összeg">
                                  <Input type="number" value={t.amount ?? 0} onChange={(e) => updateTransaction(t.id, { amount: parseNumberInput(e.target.value) })} className="w-full text-right" />
                                </Field>
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                                <Field label="Dátum">
                                  <Input type="date" value={t.date || ""} onChange={(e) => updateTransaction(t.id, { date: normalizeDateInput(e.target.value) })} className="w-full" />
                                </Field>
                                <Field label="Típus">
                                  <Select value={t.type} onChange={(e) => updateTransaction(t.id, { type: e.target.value as MoneyType })} className="w-full">
                                    <option value="expense">Kiadás</option>
                                    <option value="income">Bevétel</option>
                                  </Select>
                                </Field>
                                <Field label="Kategória">
                                  <CategorySelect
                                    value={t.categoryId || ""}
                                    onChange={(id) => updateTransaction(t.id, { categoryId: id || null })}
                                    categories={t.type === "income" ? incomeCategories : expenseCategories}
                                    className="w-full"
                                  />
                                </Field>
                                <Field label="Személy">
                                  <Select value={t.personId || ""} onChange={(e) => updateTransaction(t.id, { personId: e.target.value || null })} className="w-full">
                                    <option value="">Háztartás</option>
                                    {state.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                  </Select>
                                </Field>
                              </div>
                              <Field label="Megjegyzés">
                                <Input value={t.notes || ""} onChange={(e) => updateTransaction(t.id, { notes: e.target.value })} className="w-full" />
                              </Field>
                              <div className="flex justify-end mt-3 pt-3 border-t border-border">
                                <ConfirmDelete onConfirm={() => { removeTransaction(t.id); setExpandedId(null); }} />
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ---- Új tranzakció modal ---- */}
      {draftModal && (
        <ModalOverlay onClose={() => setDraftModal(null)}>
          <ModalPanel>
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">
                  {draftModal.type === "income" ? "Bevétel rögzítése" : "Kiadás rögzítése"}
                </div>
                <div className="text-sm font-bold text-text-1">Új tétel</div>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg overflow-hidden border border-border text-xs font-semibold">
                  <button type="button" onClick={() => setDraftModal(d => d && { ...d, type: "expense", categoryId: null })}
                    className="px-3 py-1.5 transition-colors"
                    style={draftModal.type === "expense" ? { background: "var(--color-negative)", color: "#fff" } : { color: "var(--color-text-2)" }}>
                    Kiadás
                  </button>
                  <button type="button" onClick={() => setDraftModal(d => d && { ...d, type: "income", categoryId: null })}
                    className="px-3 py-1.5 transition-colors"
                    style={draftModal.type === "income" ? { background: "var(--color-positive)", color: "#fff" } : { color: "var(--color-text-2)" }}>
                    Bevétel
                  </button>
                </div>
                <button type="button" onClick={() => setDraftModal(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-1 hover:bg-surface-2 transition-colors text-lg">×</button>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="grid grid-cols-[1fr_120px] gap-3">
                <Field label="Megnevezés">
                  <Input value={draftModal.name}
                    onChange={(e) => setDraftModal(d => d && { ...d, name: e.target.value })}
                    className="w-full" autoFocus
                    placeholder={draftModal.type === "income" ? "pl. Fizetés, Prémium…" : "pl. Tesco, Shell…"} />
                </Field>
                <Field label="Összeg (Ft)">
                  <Input type="number" value={draftModal.amount}
                    onChange={(e) => setDraftModal(d => d && { ...d, amount: parseNumberInput(e.target.value) })}
                    className="w-full text-right" />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Dátum">
                  <Input type="date" value={draftModal.date}
                    onChange={(e) => setDraftModal(d => d && { ...d, date: normalizeDateInput(e.target.value) })}
                    className="w-full" />
                </Field>
                <Field label="Kategória">
                  <CategorySelect value={draftModal.categoryId || ""}
                    onChange={(id) => setDraftModal(d => d && { ...d, categoryId: id || null })}
                    categories={draftModal.type === "income" ? incomeCategories : expenseCategories}
                    className="w-full" />
                </Field>
                <Field label="Személy">
                  <Select value={draftModal.personId || ""}
                    onChange={(e) => setDraftModal(d => d && { ...d, personId: e.target.value || null })}
                    className="w-full">
                    <option value="">Háztartás</option>
                    {state.people.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </Select>
                </Field>
                <Field label="Megjegyzés">
                  <Input value={draftModal.notes}
                    onChange={(e) => setDraftModal(d => d && { ...d, notes: e.target.value })}
                    className="w-full" />
                </Field>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-2/20">
              <SmallButton variant="ghost" onClick={() => setDraftModal(null)}>Mégsem</SmallButton>
              <SmallButton variant="primary" onClick={() => {
                addTransactionFull({ ...draftModal });
                setDraftModal(null);
              }}>
                <Plus className="w-3.5 h-3.5" /> Rögzít
              </SmallButton>
            </div>
          </ModalPanel>
        </ModalOverlay>
      )}
    </div>
  );
}

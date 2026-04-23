import { useMemo, useState } from "react";
import { Plus, ChevronDown, ArrowDownToLine, TrendingUp, TrendingDown } from "lucide-react";
import { monthKey, uid } from "../lib/utils";
import { formatHuf } from "../lib/format";
import type { State, MoneyType, RecurringItem, Transaction, Category } from "../types";
import { Card, Field, Input, Select, SmallButton, ConfirmDelete, CategorySelect, ModalOverlay, ModalPanel } from "./ui";
import {
  normalizeMonthInput,
  normalizeDateInput,
  parseNumberInput,
} from "../lib/domainHelpers";

export function MoneyTab({
  type,
  state,
  addRecurringFull,
  updateRecurring,
  removeRecurring,
  addTransactionFull,
  updateTransaction,
  removeTransaction,
  convertRecurring,
}: {
  type: MoneyType;
  state: State;
  addRecurringFull: (patch: Partial<RecurringItem> & { type: MoneyType }) => string;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  addTransactionFull: (patch: Partial<Transaction> & { type: MoneyType }) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  convertRecurring: (r: RecurringItem, month: string) => void;
}) {
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
  const diff = actualTotal - plannedTotal;
  const isIncome = type === "income";
  const diffGood = isIncome ? diff >= 0 : diff <= 0;
  const accentColor = isIncome ? "var(--color-positive)" : "var(--color-negative)";
  const draftCount = recurringItems.filter((r) => !r.enabled).length;

  const activeCount = recurringItems.filter((r) => r.enabled).length;

  return (
    <div className="space-y-4">
      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Aktív fix / hó", value: formatHuf(plannedTotal), sub: `${activeCount} aktív tétel`, color: accentColor },
          { label: "Tényleges", value: formatHuf(actualTotal), sub: actualTotal > 0 ? `${diff >= 0 ? "+" : ""}${formatHuf(diff)}` : "—", subColor: diffGood ? "var(--color-positive)" : "var(--color-negative)", color: accentColor },
          { label: "Draft tételek", value: String(draftCount), sub: "nem számít be", color: "var(--color-warning)" },
          { label: "Különbség", value: `${diff >= 0 ? "+" : ""}${formatHuf(diff)}`, sub: isIncome ? "tény − terv" : "terv − tény", color: diffGood ? "var(--color-positive)" : "var(--color-negative)" },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl border border-border bg-surface p-4 border-l-4"
            style={{ borderLeftColor: kpi.color, boxShadow: "var(--shadow-card)" }}
          >
            <div className="text-xs text-text-muted mb-2">{kpi.label}</div>
            <div className="text-xl font-bold tabular-nums" style={{ color: kpi.color }}>{kpi.value}</div>
            <div className="text-xs text-text-muted mt-1" style={kpi.subColor ? { color: kpi.subColor } : undefined}>{kpi.sub}</div>
          </div>
        ))}
      </div>

      {/* Planned section */}
      <PlannedSection
        type={type}
        state={state}
        items={recurringItems}
        addRecurringFull={addRecurringFull}
        updateRecurring={updateRecurring}
        removeRecurring={removeRecurring}
        convertRecurring={convertRecurring}
      />

      {/* Actual section */}
      <ActualSection
        type={type}
        state={state}
        transactions={transactions}
        addTransactionFull={addTransactionFull}
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
  addRecurringFull,
  updateRecurring,
  removeRecurring,
  convertRecurring,
}: {
  type: MoneyType;
  state: State;
  items: RecurringItem[];
  addRecurringFull: (patch: Partial<RecurringItem> & { type: MoneyType }) => string;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  convertRecurring: (r: RecurringItem, month: string) => void;
}) {
  const [recurringFilter, setRecurringFilter] = useState<"all" | "active" | "draft">("all");
  const [modalItem, setModalItem] = useState<RecurringItem | null>(null);
  const [isNew, setIsNew] = useState(false);
  const currentMonth = state.settings.startMonth || monthKey(new Date());

  const cats = state.categories.filter((c) => c.type === type);
  const activeTotal = useMemo(
    () => items.filter((r) => r.enabled).reduce((s, r) => s + (Number(r.amount ?? 0)), 0),
    [items]
  );

  const visibleItems = items.filter((r) =>
    recurringFilter === "all" ? true : recurringFilter === "active" ? r.enabled : !r.enabled
  );

  const accentClass = type === "income" ? "text-positive" : "text-negative";
  const RowIcon = type === "income" ? TrendingUp : TrendingDown;

  // Create a local draft — nothing written to state until user confirms
  const handleAdd = () => {
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
    setModalItem(draft);
    setIsNew(true);
  };

  const handleSave = (savedItem: RecurringItem) => {
    if (isNew) {
      addRecurringFull(savedItem);
    } else {
      updateRecurring(savedItem.id, savedItem);
    }
    setModalItem(null);
    setIsNew(false);
  };

  const handleClose = () => {
    setModalItem(null);
    setIsNew(false);
  };

  return (
    <>
      <Card className="overflow-hidden p-0">
        {/* ── Card header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <div>
            <div className="text-sm font-semibold text-text-1">
              {type === "income" ? "Várható bevételek" : "Várható kiadások"}
            </div>
            <div className="text-xs text-text-muted mt-0.5">
              {items.filter((r) => r.enabled).length} aktív · összesen:{" "}
              <span className={accentClass}>{formatHuf(activeTotal)}</span>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <div className="flex bg-surface-2 rounded-lg p-0.5 gap-0.5">
              {(["all", "active", "draft"] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setRecurringFilter(f)}
                  className={
                    "px-2.5 py-1 rounded-md text-xs font-medium transition-colors " +
                    (recurringFilter === f
                      ? "bg-surface text-text-1 shadow-sm"
                      : "text-text-2 hover:text-text-1")
                  }
                >
                  {f === "all" ? "Mind" : f === "active" ? "Aktív" : "Draft"}
                </button>
              ))}
            </div>
            <SmallButton variant="primary" onClick={handleAdd}>
              <Plus className="w-3.5 h-3.5" />
              {type === "income" ? "Új bevétel" : "Új kiadás"}
            </SmallButton>
          </div>
        </div>

        {/* ── Item list ── */}
        {visibleItems.length === 0 ? (
          <div className="px-4 py-8 text-sm text-text-muted text-center">
            {items.length === 0 ? (
              <span>Még nincs sablon — kattints az <strong className="text-text-2">Új</strong> gombra.</span>
            ) : "Nincs találat a szűrőre."}
          </div>
        ) : (
          <div className="divide-y divide-border">
            {visibleItems.map((r) => {
              const isDraft = !r.enabled;
              const catName = state.categories.find((c) => c.id === r.categoryId)?.name;
              const personName = r.personId ? state.people.find((p) => p.id === r.personId)?.name : null;
              const cadenceLabel = r.cadence === "quarterly" ? "negyedéves" : r.cadence === "yearly" ? "éves" : "havi";
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => { setModalItem({ ...r }); setIsNew(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${isDraft ? "opacity-75 bg-warning/5 hover:bg-warning/10" : "hover:bg-surface-2/50"}`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isDraft ? "bg-warning/15" : type === "income" ? "bg-positive/15" : "bg-negative/15"}`}>
                    <RowIcon className={`w-4 h-4 ${isDraft ? "text-warning" : type === "income" ? "text-positive" : "text-negative"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-semibold text-text-1 truncate">{r.name || "(névtelen)"}</span>
                      {isDraft && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 border bg-warning/10 text-warning border-warning/20">Draft</span>
                      )}
                    </div>
                    <div className="text-xs text-text-muted truncate mt-0.5">
                      {[personName, catName, cadenceLabel + (r.dayOfMonth ? ` · minden hó ${r.dayOfMonth}.` : "")].filter(Boolean).join(" · ")}
                    </div>
                  </div>
                  <span className={`text-sm font-bold tabular-nums shrink-0 ${isDraft ? "text-text-muted" : type === "income" ? "text-positive" : "text-negative"}`}>
                    {formatHuf(r.amount ?? 0)}
                  </span>
                  {!isDraft && (
                    <span
                      role="button"
                      title={`Rögzít tényleges tételként (${currentMonth})`}
                      onClick={(e) => { e.stopPropagation(); convertRecurring(r, currentMonth); }}
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-text-muted hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <ArrowDownToLine className="w-3.5 h-3.5" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Edit Modal ── */}
      {modalItem && (
        <RecurringEditModal
          key={modalItem.id}
          item={modalItem}
          isNew={isNew}
          type={type}
          state={state}
          cats={cats}
          currentMonth={currentMonth}
          onSave={handleSave}
          onDelete={() => { if (!isNew) removeRecurring(modalItem.id); handleClose(); }}
          onConvert={(item) => { convertRecurring(item, currentMonth); handleClose(); }}
          onClose={handleClose}
        />
      )}
    </>
  );
}

// -------------------- Recurring Edit Modal --------------------

function RecurringEditModal({
  item,
  isNew,
  type,
  state,
  cats,
  currentMonth,
  onSave,
  onDelete,
  onConvert,
  onClose,
}: {
  item: RecurringItem;
  isNew: boolean;
  type: MoneyType;
  state: State;
  cats: Category[];
  currentMonth: string;
  onSave: (item: RecurringItem) => void;
  onDelete: () => void;
  onConvert: (item: RecurringItem) => void;
  onClose: () => void;
}) {
  const [local, setLocal] = useState<RecurringItem>(item);
  const upd = (patch: Partial<RecurringItem>) => setLocal((p) => ({ ...p, ...patch }));

  return (
    <ModalOverlay onClose={onClose}>
      <ModalPanel
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wide mb-0.5">
              {isNew ? (type === "income" ? "Új fix bevétel" : "Új fix kiadás") : (type === "income" ? "Fix bevétel szerkesztése" : "Fix kiadás szerkesztése")}
            </div>
            <div className="text-base font-semibold text-text-1 truncate">{local.name || "(névtelen)"}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-1 hover:bg-surface-2 transition-colors text-lg leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Primary fields */}
          <div className="grid grid-cols-[1fr_130px] gap-3">
            <Field label="Megnevezés">
              <Input
                value={local.name || ""}
                onChange={(e) => upd({ name: e.target.value })}
                className="w-full"
                autoFocus
              />
            </Field>
            <Field label="Összeg">
              <Input
                type="number"
                value={local.amount ?? 0}
                onChange={(e) => upd({ amount: parseNumberInput(e.target.value) })}
                className="w-full text-right"
              />
            </Field>
          </div>

          {/* Secondary fields */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategória">
              <CategorySelect
                value={local.categoryId || ""}
                onChange={(id) => upd({ categoryId: id || null })}
                categories={cats}
                className="w-full"
              />
            </Field>
            <Field label="Személy">
              <Select
                value={local.personId || ""}
                onChange={(e) => upd({ personId: e.target.value || null })}
                className="w-full"
              >
                <option value="">Háztartás</option>
                {state.people.map((p) => (
                  <option key={p.id} value={p.id}>{p.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Státusz">
              <Select
                value={local.enabled ? "yes" : "no"}
                onChange={(e) => upd({ enabled: e.target.value === "yes" })}
                className="w-full"
              >
                <option value="yes">Aktív</option>
                <option value="no">Draft</option>
              </Select>
            </Field>
            <Field label="Gyakoriság">
              <Select
                value={local.cadence}
                onChange={(e) => upd({ cadence: e.target.value as RecurringItem["cadence"] })}
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
                value={local.startMonth || ""}
                onChange={(e) => upd({ startMonth: normalizeMonthInput(e.target.value) })}
                className="w-full"
              />
            </Field>
            <Field label="Záró hónap">
              <Input
                type="month"
                value={local.endMonth || ""}
                onChange={(e) => upd({ endMonth: normalizeMonthInput(e.target.value) || null })}
                className="w-full"
              />
            </Field>
          </div>

          <Field label="Megjegyzés">
            <Input
              value={local.notes || ""}
              onChange={(e) => upd({ notes: e.target.value })}
              className="w-full"
            />
          </Field>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-2/30">
          {!isNew ? <ConfirmDelete onConfirm={onDelete} /> : <div />}
          <div className="flex items-center gap-2">
            {!isNew && local.enabled && (
              <SmallButton variant="solid" onClick={() => onConvert(local)} title={`Rögzít tényleges tételként: ${currentMonth}`}>
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Rögzít ({currentMonth})
              </SmallButton>
            )}
            <SmallButton variant="ghost" onClick={onClose}>Mégsem</SmallButton>
            <SmallButton variant="primary" onClick={() => onSave(local)}>
              {isNew ? "Létrehozás" : "Mentés"}
            </SmallButton>
          </div>
        </div>
      </ModalPanel>
    </ModalOverlay>
  );
}

// -------------------- Actual section --------------------

/** "2026-03-07" → "7 március" */
function formatDayHeader(isoDate: string): string {
  if (!isoDate) return "Ismeretlen dátum";
  const d = new Date(isoDate + "T00:00:00");
  if (isNaN(d.getTime())) return isoDate;
  const months = ["január","február","március","április","május","június","július","augusztus","szeptember","október","november","december"];
  return `${d.getDate()} ${months[d.getMonth()]}`;
}

/** "2026-03-07" → "2026-03" */
const monthOf = (isoDate: string) => (isoDate || "").slice(0, 7);

/** Unique months from transactions, sorted descending */
function uniqueMonths(txs: { date?: string | null }[]): string[] {
  const set = new Set<string>();
  txs.forEach((t) => { if (t.date) set.add(monthOf(t.date)); });
  return [...set].sort((a, b) => b.localeCompare(a));
}

/** Category color dot — cycles through 6 semantic colors */
const CAT_COLORS = [
  "var(--color-chart-1)",
  "var(--color-chart-2)",
  "var(--color-chart-3)",
  "var(--color-chart-4)",
  "var(--color-primary)",
  "var(--color-accent)",
];

function ActualSection({
  type,
  state,
  transactions,
  addTransactionFull,
  updateTransaction,
  removeTransaction,
}: {
  type: MoneyType;
  state: State;
  transactions: Transaction[];
  addTransactionFull: (patch: Partial<Transaction> & { type: MoneyType }) => string;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [txDraft, setTxDraft] = useState<{ name: string; amount: number; date: string; categoryId: string | null; personId: string | null; notes: string } | null>(null);
  const [filterMonth, setFilterMonth] = useState<string>("");
  const [search, setSearch] = useState("");

  const cats = state.categories.filter((c) => c.type === type);
  const accentClass = type === "income" ? "text-positive" : "text-negative";
  const accentColorVar = type === "income" ? "var(--color-positive)" : "var(--color-negative)";

  // Build a stable color index map for categories
  const catColorIndex = useMemo(() => {
    const map = new Map<string, number>();
    cats.forEach((c, i) => map.set(c.id, i % CAT_COLORS.length));
    return map;
  }, [cats]);

  const availableMonths = useMemo(() => uniqueMonths(transactions), [transactions]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transactions
      .filter((t) => {
        if (filterMonth && monthOf(t.date ?? "") !== filterMonth) return false;
        if (q && !`${t.name ?? ""} ${t.notes ?? ""}`.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""));
  }, [transactions, filterMonth, search]);

  const filteredTotal = useMemo(
    () => filtered.reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [filtered]
  );

  // Group by date
  const grouped = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((t) => {
      const d = t.date || "";
      if (!map.has(d)) map.set(d, []);
      map.get(d)!.push(t);
    });
    return [...map.entries()].sort(([a], [b]) => b.localeCompare(a));
  }, [filtered]);

  return (
    <>
    <Card className="overflow-hidden p-0">
      {/* ── Card header ── */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
        <div>
          <div className="text-sm font-semibold text-text-1">
            {type === "income" ? "Rögzített bevételek" : "Rögzített kiadások"}
          </div>
          <div className="text-xs text-text-muted mt-0.5">
            {filtered.length} tétel · összesen:{" "}
            <span className={accentClass}>{formatHuf(filteredTotal)}</span>
          </div>
        </div>
        <SmallButton
          variant="primary"
          onClick={() => setTxDraft({ name: "", amount: 0, date: new Date().toISOString().slice(0, 10), categoryId: null, personId: null, notes: "" })}
        >
          <Plus className="w-3.5 h-3.5" />
          {type === "income" ? "Új bevétel" : "Új kiadás"}
        </SmallButton>
      </div>

      {/* ── Filter bar ── */}
      <div className="px-4 py-2.5 border-b border-border bg-surface-2/30 flex flex-wrap items-center gap-2">
        {/* Search */}
        <div className="flex-1 min-w-[160px]">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Keresés…"
            className="w-full text-sm"
          />
        </div>
        {/* Month chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setFilterMonth("")}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
              !filterMonth
                ? "bg-primary/15 text-primary border-primary/30"
                : "text-text-2 border-border hover:bg-surface-2 hover:text-text-1"
            }`}
          >
            Összes
          </button>
          {availableMonths.slice(0, 6).map((m) => {
            const [y, mo] = m.split("-");
            const months = ["jan","feb","már","ápr","máj","jún","júl","aug","szep","okt","nov","dec"];
            const label = `${months[parseInt(mo, 10) - 1]} ${y}`;
            return (
              <button
                key={m}
                type="button"
                onClick={() => setFilterMonth(filterMonth === m ? "" : m)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors border ${
                  filterMonth === m
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "text-text-2 border-border hover:bg-surface-2 hover:text-text-1"
                }`}
              >
                {label}
              </button>
            );
          })}
          {availableMonths.length > 6 && !filterMonth && (
            <span className="text-xs text-text-muted">+{availableMonths.length - 6}</span>
          )}
        </div>
      </div>

      {/* ── Date-grouped list ── */}
      {filtered.length === 0 ? (
        <div className="px-4 py-10 text-sm text-text-muted text-center space-y-1">
          <div className="text-base font-semibold text-text-2">
            {transactions.length === 0 ? "Még nincs rögzített tétel" : "Nincs találat"}
          </div>
          <div className="text-xs">
            {transactions.length === 0
              ? "Kattints az \"Új\" gombra az első tétel rögzítéséhez."
              : "Próbálj más keresési feltételt."}
          </div>
        </div>
      ) : (
        <div>
          {grouped.map(([date, items]) => (
            <div key={date}>
              {/* Date section header */}
              <div className="px-4 pt-3 pb-1.5 flex items-center justify-between">
                <span className="text-xs font-semibold text-text-2 uppercase tracking-wide">
                  {formatDayHeader(date)}
                </span>
                <span className="text-xs tabular-nums" style={{ color: accentColorVar }}>
                  {type === "income" ? "+" : "−"}{formatHuf(items.reduce((s, t) => s + (Number(t.amount) || 0), 0))}
                </span>
              </div>

              {/* Transactions in this day */}
              <div className="divide-y divide-border/50">
                {items.map((t) => {
                  const isExpanded = expandedId === t.id;
                  const cat = state.categories.find((c) => c.id === t.categoryId);
                  const catName = cat?.name;
                  const catColor = cat ? CAT_COLORS[catColorIndex.get(cat.id) ?? 0] : accentColorVar;
                  const personName = t.personId ? state.people.find((p) => p.id === t.personId)?.name : null;

                  return (
                    <div key={t.id}>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : t.id)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-surface-2/60 transition-colors"
                      >
                        {/* Category color dot */}
                        <div
                          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold text-bg"
                          style={{ backgroundColor: catColor }}
                        >
                          {(t.name || "?").slice(0, 1).toUpperCase()}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-text-1 truncate">{t.name || "(névtelen)"}</div>
                          <div className="text-xs text-text-muted truncate mt-0.5">
                            {[catName, personName].filter(Boolean).join(" · ") || "—"}
                          </div>
                        </div>

                        <span className={`text-sm font-bold tabular-nums shrink-0 ${accentClass}`}>
                          {type === "income" ? "+" : "−"}{formatHuf(t.amount ?? 0)}
                        </span>
                        <ChevronDown className={`w-3.5 h-3.5 text-text-muted shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`} />
                      </button>

                      {/* Expanded edit form */}
                      {isExpanded && (
                        <div className="px-4 pb-4 pt-3 border-t border-border bg-bg/40">
                          <div className="grid grid-cols-[1fr_140px] gap-3 mb-4">
                            <Field label="Megnevezés">
                              <Input
                                value={t.name || ""}
                                onChange={(e) => updateTransaction(t.id, { name: e.target.value })}
                                className="w-full text-base font-medium"
                              />
                            </Field>
                            <Field label="Összeg">
                              <Input
                                type="number"
                                value={t.amount ?? 0}
                                onChange={(e) => updateTransaction(t.id, { amount: parseNumberInput(e.target.value) })}
                                className="w-full text-base font-semibold text-right"
                              />
                            </Field>
                          </div>
                          <div className="border-t border-border pt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
                            <Field label="Dátum">
                              <Input
                                type="date"
                                value={t.date || ""}
                                onChange={(e) => updateTransaction(t.id, { date: normalizeDateInput(e.target.value) })}
                                className="w-full"
                              />
                            </Field>
                            <Field label="Kategória">
                              <CategorySelect
                                value={t.categoryId || ""}
                                onChange={(id) => updateTransaction(t.id, { categoryId: id || null })}
                                categories={cats}
                                className="w-full"
                              />
                            </Field>
                            <Field label="Személy">
                              <Select
                                value={t.personId || ""}
                                onChange={(e) => updateTransaction(t.id, { personId: e.target.value || null })}
                                className="w-full"
                              >
                                <option value="">Háztartás</option>
                                {state.people.map((p) => (
                                  <option key={p.id} value={p.id}>{p.name}</option>
                                ))}
                              </Select>
                            </Field>
                            <div className="col-span-2 sm:col-span-3">
                              <Field label="Megjegyzés">
                                <Input
                                  value={t.notes || ""}
                                  onChange={(e) => updateTransaction(t.id, { notes: e.target.value })}
                                  className="w-full"
                                />
                              </Field>
                            </div>
                          </div>
                          <div className="flex justify-end mt-3 pt-3 border-t border-border">
                            <ConfirmDelete onConfirm={() => removeTransaction(t.id)} />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>

    {/* ── New transaction draft modal ── */}
    {txDraft && (
      <ModalOverlay onClose={() => setTxDraft(null)}>
        <ModalPanel>
          <div className="flex items-center justify-between px-5 py-4 border-b border-border">
            <div>
              <div className="text-xs text-text-muted uppercase tracking-wide mb-0.5">
                {type === "income" ? "Új bevétel rögzítése" : "Új kiadás rögzítése"}
              </div>
              <div className="text-sm font-semibold text-text-1">Egyszeri tétel</div>
            </div>
            <button type="button" onClick={() => setTxDraft(null)} className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-1 hover:bg-surface-2 transition-colors text-lg">×</button>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <Field label="Megnevezés">
                <Input value={txDraft.name} onChange={(e) => setTxDraft((d) => d && { ...d, name: e.target.value })} className="w-full" autoFocus placeholder={type === "income" ? "pl. Fizetés, Prémium…" : "pl. Tesco, Shell…"} />
              </Field>
              <Field label="Összeg">
                <Input type="number" value={txDraft.amount} onChange={(e) => setTxDraft((d) => d && { ...d, amount: parseNumberInput(e.target.value) })} className="w-full text-right" />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Dátum">
                <Input type="date" value={txDraft.date} onChange={(e) => setTxDraft((d) => d && { ...d, date: normalizeDateInput(e.target.value) })} className="w-full" />
              </Field>
              <Field label="Kategória">
                <CategorySelect value={txDraft.categoryId || ""} onChange={(id) => setTxDraft((d) => d && { ...d, categoryId: id || null })} categories={cats} className="w-full" />
              </Field>
              <Field label="Személy">
                <Select value={txDraft.personId || ""} onChange={(e) => setTxDraft((d) => d && { ...d, personId: e.target.value || null })} className="w-full">
                  <option value="">Háztartás</option>
                  {state.people.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </Select>
              </Field>
              <Field label="Megjegyzés">
                <Input value={txDraft.notes} onChange={(e) => setTxDraft((d) => d && { ...d, notes: e.target.value })} className="w-full" />
              </Field>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-surface-2/20">
            <SmallButton variant="ghost" onClick={() => setTxDraft(null)}>Mégsem</SmallButton>
            <SmallButton variant="primary" onClick={() => { addTransactionFull({ ...txDraft, type }); setTxDraft(null); }}>
              <Plus className="w-3.5 h-3.5" /> Rögzít
            </SmallButton>
          </div>
        </ModalPanel>
      </ModalOverlay>
    )}
  </>
  );
}

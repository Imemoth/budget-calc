import React, { useMemo, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartTooltip,
  PieChart, Pie, Cell, Area, AreaChart,
  ResponsiveContainer,
} from "recharts";
import { formatHuf } from "../lib/format";
import { monthKey } from "../lib/utils";
import type { SeriesRow, State } from "../types";
import { useTheme } from "../context/ThemeContext";
import { Target, ArrowRight, ArrowUpRight } from "lucide-react";
import { getCategoryIcon } from "../lib/categoryIcons";

// ---- helpers ----

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function yFmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}K`;
  return String(v);
}

function cmpct(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `${Math.round(v / 1_000)}k`;
  return String(v);
}

const PERSON_PALETTE = [
  "var(--color-positive)",
  "var(--color-chart-1)",
  "#A78BFA",
  "#F472B6",
  "#22D3EE",
  "#F59E0B",
];

// ---- Glassmorphism kártya alap ----
function GlassCard({
  children,
  className = "",
  accentColor,
  style,
}: {
  children: React.ReactNode;
  className?: string;
  accentColor?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={`rounded-2xl border border-border relative overflow-hidden ${className}`}
      style={{
        background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
        boxShadow: accentColor
          ? `var(--shadow-card), 0 0 32px ${accentColor}14`
          : "var(--shadow-card)",
        ...style,
      }}
    >
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)" }} />
      {accentColor && (
        <div className="absolute -top-10 -left-10 w-32 h-32 rounded-full pointer-events-none"
          style={{ background: accentColor, opacity: 0.06, filter: "blur(24px)" }} />
      )}
      {children}
    </div>
  );
}

// ---- Custom Tooltip ----
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border px-3 py-2 text-xs space-y-1 z-50"
      style={{ background: "var(--color-surface-2)", boxShadow: "var(--shadow-card)" }}>
      {label !== undefined && <div className="font-semibold text-text-2 mb-1">{label}. nap</div>}
      {payload.map((p, i) => (
        <div key={i} className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
            <span className="text-text-muted">{p.name}</span>
          </span>
          <span className="font-semibold tabular-nums text-text-1">{formatHuf(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

// ---- Célok progress ----
function ym2int(ym: string): number {
  const [y, m] = ym.split("-").map(Number);
  return y * 12 + m;
}
function goalProgress(s: { targetAmount?: number; monthlyPlanned?: number; startMonth?: string | null; endMonth?: string | null }) {
  const today = monthKey(new Date());
  const target = s.targetAmount ?? 0;
  const monthly = s.monthlyPlanned ?? 0;
  if (!s.startMonth || target <= 0) return null;
  const start = ym2int(s.startMonth);
  const end = s.endMonth ? ym2int(s.endMonth) : null;
  const now = ym2int(today);
  const capped = end ? Math.min(now, end) : now;
  const elapsed = Math.max(0, capped - start + 1);
  const accumulated = elapsed * monthly;
  const pct = Math.min(100, Math.round((accumulated / target) * 100));
  return { accumulated, pct, target };
}

const GOAL_EMOJIS = ["🎯", "💻", "🌴", "🚗", "🏠", "✈️", "🎮", "📱"];

// ---- Relatív dátum ----
function relativeDate(isoDate: string): string {
  if (!isoDate) return "—";
  const d = new Date(isoDate + "T00:00:00");
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff = Math.round((today.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return "Ma";
  if (diff === 1) return "Tegnap";
  if (diff < 7) return `${diff} napja`;
  return isoDate.slice(5).replace("-", ". ");
}

// =============================================================
// FŐKOMPONENS
// =============================================================

export function DashboardView({
  monthList,
  focusMonth,
  setFocusMonth,
  series,
  activeSavingsCount = 0,
  state,
  onNavigateTransactions,
  onUpdateBudget,
}: {
  monthList: string[];
  focusMonth: string;
  setFocusMonth: React.Dispatch<React.SetStateAction<string>>;
  series: SeriesRow[];
  categoryBreakdown?: { category: string; value: number }[];
  incomeCategoryBreakdown?: { category: string; value: number }[];
  peopleIncomePlanned?: { name: string; value: number }[];
  currency?: string;
  activeSavingsCount?: number;
  state?: State;
  onNavigateTransactions?: () => void;
  onUpdateBudget?: (amount: number) => void;
}) {
  useTheme();
  const cIncome  = readVar("--color-positive");
  const cExpense = readVar("--color-negative");
  const cWarning = readVar("--color-warning");
  const cPrimary = readVar("--color-primary");
  const cBorder  = readVar("--color-border");

  const current = series.find(s => s.month === focusMonth) ?? series[0];
  const prevIdx = series.findIndex(s => s.month === focusMonth) - 1;
  const prev = prevIdx >= 0 ? series[prevIdx] : null;

  // Hó/hó változás %
  const netChange = prev && prev.plannedNet !== 0
    ? Math.round(((current?.plannedNet ?? 0) - prev.plannedNet) / Math.abs(prev.plannedNet) * 100)
    : null;

  // Sparkline — utolsó 8 hónap nettó
  const sparkData = series.slice(-8).map(s => ({ v: s.plannedNet }));

  // Havi keret
  const monthlyBudget = state?.settings?.monthlyBudget ?? 0;
  const budgetUsedPct = monthlyBudget > 0
    ? Math.min(100, Math.round(((current?.plannedExpense ?? 0) / monthlyBudget) * 100))
    : null;

  // --- Napi kiadás (state.transactions-ból) ---
  const dailyData = useMemo(() => {
    if (!state) return [];
    const [year, month] = focusMonth.split("-").map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    const byDay: Record<string, Record<string, number>> = {};
    state.transactions
      .filter(t => t.type === "expense" && (t.date || "").startsWith(focusMonth))
      .forEach(t => {
        const day = String(parseInt((t.date || "").slice(8, 10), 10));
        const pid = t.personId || "__household";
        if (!byDay[day]) byDay[day] = {};
        byDay[day][pid] = (byDay[day][pid] ?? 0) + (t.amount ?? 0);
      });
    return Array.from({ length: daysInMonth }, (_, i) => {
      const d = String(i + 1);
      const row: Record<string, number> = { day: i + 1 };
      (state.people).forEach(p => { row[p.id] = byDay[d]?.[p.id] ?? 0; });
      row.__household = byDay[d]?.__household ?? 0;
      return row;
    });
  }, [state, focusMonth]);

  const hasDailyData = dailyData.some(d =>
    Object.entries(d).some(([k, v]) => k !== "day" && (v as number) > 0)
  );

  const dailyAvg = useMemo(() => {
    if (!state) return 0;
    const total = state.transactions
      .filter(t => t.type === "expense" && (t.date || "").startsWith(focusMonth))
      .reduce((s, t) => s + (t.amount ?? 0), 0);
    const [year, month] = focusMonth.split("-").map(Number);
    const days = new Date(year, month, 0).getDate();
    return days > 0 ? Math.round(total / days) : 0;
  }, [state, focusMonth]);

  // --- Kategória donut ---
  const catData = useMemo(() => {
    if (!state) return [];
    const map: Record<string, { name: string; value: number }> = {};
    state.transactions
      .filter(t => t.type === "expense" && (t.date || "").startsWith(focusMonth))
      .forEach(t => {
        const cat = state.categories.find(c => c.id === t.categoryId);
        const name = cat?.name ?? "Egyéb";
        if (!map[name]) map[name] = { name, value: 0 };
        map[name].value += t.amount ?? 0;
      });
    return Object.values(map).sort((a, b) => b.value - a.value).slice(0, 8);
  }, [state, focusMonth]);

  const catTotal = catData.reduce((s, c) => s + c.value, 0);

  const DONUT_COLORS = [
    cPrimary, readVar("--color-chart-1"), "#A78BFA", "#22D3EE",
    "#F472B6", cWarning, "#6EE7B7", "#C4B5FD",
  ];

  // --- Célok ---
  const goalItems = useMemo(() => {
    if (!state) return [];
    return state.savings
      .filter(s => (s.targetAmount ?? 0) > 0 && s.startMonth)
      .slice(0, 3);
  }, [state]);

  // --- Legutóbbi tranzakciók filter ---
  // Havi keret inline szerkesztés
  const [budgetEdit, setBudgetEdit] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const [txPeriod, setTxPeriod] = useState<"today"|"week"|"month"|"custom">("month");
  const [txFrom, setTxFrom] = useState("");
  const [txTo,   setTxTo]   = useState("");

  const recentTx = useMemo(() => {
    if (!state) return [];
    const today = new Date(); today.setHours(0,0,0,0);
    const todayStr = today.toISOString().slice(0,10);

    let from = "", to = todayStr;
    if (txPeriod === "today") {
      from = todayStr;
    } else if (txPeriod === "week") {
      const d = new Date(today); d.setDate(d.getDate() - 6);
      from = d.toISOString().slice(0,10);
    } else if (txPeriod === "month") {
      from = focusMonth + "-01";
      const [y, m] = focusMonth.split("-").map(Number);
      to = new Date(y, m, 0).toISOString().slice(0,10);
    } else {
      from = txFrom; to = txTo;
    }

    return state.transactions
      .slice()
      .sort((a, b) => (b.date||"").localeCompare(a.date||""))
      .filter(t => {
        const d = t.date || "";
        if (from && d < from) return false;
        if (to   && d > to)   return false;
        return true;
      })
      .slice(0, 20);
  }, [state, txPeriod, txFrom, txTo, focusMonth]);

  return (
    <div className="space-y-4">

      {/* ===== ROW 1: 4 KPI kártya (egyenleg hero + bevétel + kiadás + keret) ===== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"
        style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1fr)" }}>

        {/* Nettó egyenleg — HERO (2fr a grid template-ben) */}
        <GlassCard className="p-5 flex flex-col gap-3" accentColor={cIncome}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2">
                Nettó egyenleg · {focusMonth}
              </div>
              <div className="text-4xl font-extrabold tabular-nums leading-none" style={{ color: cIncome }}>
                {formatHuf(current?.plannedNet ?? 0)}
              </div>
              {netChange !== null && (
                <div className="flex items-center gap-1 mt-2 text-xs font-semibold"
                  style={{ color: netChange >= 0 ? cIncome : cExpense }}>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                  {netChange >= 0 ? "+" : ""}{netChange}% hó/hó
                </div>
              )}
            </div>
            {/* Hónap szűrő */}
            <select
              value={focusMonth}
              onChange={e => setFocusMonth(e.target.value)}
              className="text-xs rounded-xl border border-border px-2 py-1.5 shrink-0"
              style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)" }}
            >
              {monthList.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          {/* Mini sparkline */}
          {sparkData.length > 1 && (
            <div className="h-14 -mx-1">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={cIncome} stopOpacity={0.25} />
                      <stop offset="95%" stopColor={cIncome} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="v" stroke={cIncome} strokeWidth={2}
                    fill="url(#netGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        {/* Bevétel */}
        <GlassCard className="p-4 flex flex-col gap-2" accentColor={cIncome}
          style={{ borderLeftWidth: 3, borderLeftColor: cIncome }}>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Bevétel · {focusMonth}
          </div>
          <div className="text-2xl font-extrabold tabular-nums" style={{ color: cIncome }}>
            {formatHuf(current?.plannedIncome ?? 0)}
          </div>
          <div className="text-xs text-text-muted mt-auto">
            {state ? `${state.recurring.filter(r => r.type === "income" && r.enabled).length} aktív forrás` : "—"}
          </div>
          {(current?.actualIncome ?? 0) > 0 && (
            <div className="text-[11px]" style={{ color: cIncome }}>
              Tényleges: {formatHuf(current!.actualIncome)}
            </div>
          )}
        </GlassCard>

        {/* Kiadás */}
        <GlassCard className="p-4 flex flex-col gap-2" accentColor={cExpense}
          style={{ borderLeftWidth: 3, borderLeftColor: cExpense }}>
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest">
            Kiadás · {focusMonth}
          </div>
          <div className="text-2xl font-extrabold tabular-nums" style={{ color: cExpense }}>
            {formatHuf(current?.plannedExpense ?? 0)}
          </div>
          <div className="text-xs text-text-muted mt-auto">
            {state
              ? `${state.transactions.filter(t => t.type === "expense" && (t.date || "").startsWith(focusMonth)).length} tétel`
              : "—"}
          </div>
          {(current?.actualExpense ?? 0) > 0 && (
            <div className="text-[11px]" style={{ color: cExpense }}>
              Tényleges: {formatHuf(current!.actualExpense)}
            </div>
          )}
        </GlassCard>

        {/* Havi keret */}
        <GlassCard className="p-4 flex flex-col gap-2" accentColor={cWarning}
          style={{ borderLeftWidth: 3, borderLeftColor: cWarning }}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
                Havi költségkeret
              </div>
              {monthlyBudget > 0 && !budgetEdit ? (
                <>
                  <div className="text-2xl font-extrabold tabular-nums" style={{ color: cWarning }}>
                    {budgetUsedPct}%
                  </div>
                  <div className="text-xs text-text-muted mt-1">
                    {formatHuf(current?.plannedExpense ?? 0)} / {formatHuf(monthlyBudget)} keretből
                  </div>
                  {onUpdateBudget && (
                    <button type="button" onClick={() => { setBudgetInput(String(monthlyBudget)); setBudgetEdit(true); }}
                      className="text-[10px] text-text-muted hover:text-primary underline mt-1 transition-colors">
                      Módosítás
                    </button>
                  )}
                </>
              ) : budgetEdit || !monthlyBudget ? (
                <div className="space-y-1.5 mt-1">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      value={budgetInput}
                      onChange={e => setBudgetInput(e.target.value)}
                      placeholder="pl. 300000"
                      autoFocus
                      className="flex-1 min-w-0 text-sm rounded-lg border border-border px-2 py-1 tabular-nums"
                      style={{ background: "var(--color-surface-2)", color: "var(--color-text-1)" }}
                      onKeyDown={e => {
                        if (e.key === "Enter" && onUpdateBudget) {
                          const n = parseInt(budgetInput, 10);
                          if (n > 0) { onUpdateBudget(n); setBudgetEdit(false); }
                        }
                        if (e.key === "Escape") setBudgetEdit(false);
                      }}
                    />
                    <button type="button"
                      onClick={() => {
                        if (!onUpdateBudget) return;
                        const n = parseInt(budgetInput, 10);
                        if (n > 0) { onUpdateBudget(n); setBudgetEdit(false); }
                      }}
                      className="text-xs px-2 py-1 rounded-lg font-semibold text-white transition-colors"
                      style={{ background: cWarning }}>
                      OK
                    </button>
                    {budgetEdit && (
                      <button type="button" onClick={() => setBudgetEdit(false)}
                        className="text-xs text-text-muted hover:text-text-1 transition-colors">✕</button>
                    )}
                  </div>
                  <div className="text-[10px] text-text-muted">Ft / hó (Enter = ment)</div>
                </div>
              ) : null}
            </div>
            <Target className="w-7 h-7 shrink-0" style={{ color: cWarning, opacity: 0.5 }} />
          </div>
          {monthlyBudget > 0 && !budgetEdit && budgetUsedPct !== null && (
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${budgetUsedPct}%`,
                  background: budgetUsedPct > 90
                    ? `linear-gradient(90deg, ${cExpense}88, ${cExpense})`
                    : budgetUsedPct > 70
                    ? `linear-gradient(90deg, ${cWarning}88, ${cWarning})`
                    : `linear-gradient(90deg, ${cIncome}88, ${cIncome})`,
                  boxShadow: `0 0 8px ${cWarning}44`,
                }} />
            </div>
          )}
        </GlassCard>
      </div>

      {/* ===== ROW 2: Napi kiadás | Donut | Célok — 2fr:1fr:1fr ===== */}
      <div className="grid grid-cols-1 gap-4"
        style={{ gridTemplateColumns: "minmax(0,2fr) minmax(0,1fr) minmax(0,1fr)" }}>

        {/* Napi kiadás */}
        <GlassCard className="p-5">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">
                Napi kiadás
              </div>
              <div className="text-base font-bold text-text-1">
                {formatHuf(dailyAvg)} / nap átlag
              </div>
            </div>
            {/* Legenda (személyek) */}
            {state && (
              <div className="flex items-center gap-3 text-xs text-text-muted">
                {state.people.map((p, i) => (
                  <span key={p.id} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ background: PERSON_PALETTE[i % PERSON_PALETTE.length] }} />
                    {p.name}
                  </span>
                ))}
              </div>
            )}
          </div>
          {!hasDailyData ? (
            <div className="h-48 flex items-center justify-center text-sm text-text-muted">
              Nincs rögzített kiadás ebben a hónapban.
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                  barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" stroke={cBorder} opacity={0.3} vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false} axisLine={false}
                    tickFormatter={v => v % 5 === 1 || v === 1 ? String(v) : ""} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false} axisLine={false} tickFormatter={yFmt} width={40} />
                  <RechartTooltip content={<ChartTooltip />}
                    cursor={{ fill: "var(--color-surface-2)", opacity: 0.5 }} />
                  {state?.people.map((p, i) => (
                    <Bar key={p.id} dataKey={p.id} name={p.name} stackId="a"
                      fill={PERSON_PALETTE[i % PERSON_PALETTE.length]}
                      fillOpacity={0.9} radius={i === (state.people.length - 1) ? [3, 3, 0, 0] : [0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        {/* Kategória donut */}
        <GlassCard className="p-5 flex flex-col">
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-1">
            Kategóriák
          </div>
          <div className="text-sm font-bold text-text-1 mb-3">Kiadások megoszlása</div>
          {catData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted">
              Nincs adat
            </div>
          ) : (
            <>
              {/* Donut */}
              <div className="relative h-44">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={catData} cx="50%" cy="50%"
                      innerRadius={54} outerRadius={78}
                      dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                      {catData.map((_, i) => (
                        <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]}
                          stroke="transparent" />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                {/* Közép szöveg */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <div className="text-xl font-extrabold tabular-nums text-text-1">
                    {cmpct(catTotal)}k
                  </div>
                  <div className="text-[10px] text-text-muted">Ft összesen</div>
                </div>
              </div>
              {/* Legenda */}
              <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1">
                {catData.slice(0, 6).map((c, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px] text-text-2 min-w-0">
                    <span className="w-2 h-2 rounded-full shrink-0"
                      style={{ background: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                    <span className="truncate">{c.name.replace(/ 🛒|🏠|⚡|🍽️|🚗|🩺|🛡️|🧾|🧩|🎮|👕|👶|🎁|✈️|🧯/g, "").trim()}</span>
                    <span className="ml-auto shrink-0 tabular-nums font-medium">{cmpct(c.value)}k</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </GlassCard>

        {/* Célok — 3. oszlop a Row 2-ben */}
        <GlassCard className="p-5 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-0.5">Megtakarítás</div>
              <div className="text-base font-bold text-text-1">Célok</div>
            </div>
            {activeSavingsCount > 0 && (
              <span className="text-xs font-semibold px-2 py-1 rounded-lg border border-border text-text-2">
                {activeSavingsCount} aktív
              </span>
            )}
          </div>
          {goalItems.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-sm text-text-muted text-center">
              Nincs aktív megtakarítási cél
            </div>
          ) : (
            <div className="space-y-3 flex-1">
              {goalItems.map((g, i) => {
                const prog = goalProgress(g);
                return (
                  <div key={g.id} className="space-y-1.5 p-3 rounded-xl border border-border"
                    style={{ background: "var(--color-surface-2)50" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{GOAL_EMOJIS[i % GOAL_EMOJIS.length]}</span>
                      <span className="text-xs font-semibold text-text-1 truncate flex-1">{g.name || "Cél"}</span>
                      <span className="text-[11px] font-bold shrink-0" style={{ color: cWarning }}>
                        {prog?.pct ?? 0}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-text-muted">
                      <span>{prog ? formatHuf(prog.accumulated) : "0 Ft"}</span>
                      <span>{formatHuf(g.targetAmount ?? 0)}</span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                      <div className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${prog?.pct ?? 0}%`,
                          background: `linear-gradient(90deg, ${cWarning}88, ${cWarning})`,
                          boxShadow: `0 0 6px ${cWarning}44`,
                        }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>

      {/* ===== ROW 3: Legutóbbi tranzakciók ===== */}
      {state && (
        <GlassCard>
          {/* Fejléc */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
            <div>
              <div className="text-base font-bold text-text-1">Tranzakciók</div>
              <div className="text-xs text-text-muted mt-0.5">
                {recentTx.length > 0
                  ? `${recentTx.length} tétel látható`
                  : "Nincs tranzakció a kiválasztott időszakban"}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {/* Period filter chips */}
              {(["today","week","month","custom"] as const).map(p => (
                <button key={p} type="button" onClick={() => setTxPeriod(p)}
                  className="px-2.5 py-1 rounded-full text-xs font-semibold border transition-all"
                  style={txPeriod === p ? {
                    background: cPrimary, color: "#fff",
                    borderColor: cPrimary,
                    boxShadow: `0 2px 8px ${cPrimary}44`,
                  } : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }}>
                  {p === "today" ? "Ma" : p === "week" ? "Hét" : p === "month" ? "Hónap" : "Időszak"}
                </button>
              ))}
              {/* Custom dátum inputok */}
              {txPeriod === "custom" && (
                <div className="flex items-center gap-1.5">
                  <input type="date" value={txFrom} onChange={e => setTxFrom(e.target.value)}
                    className="text-xs rounded-lg border border-border px-2 py-1"
                    style={{ background: "var(--color-surface-2)", color: "var(--color-text-1)" }} />
                  <span className="text-xs text-text-muted">–</span>
                  <input type="date" value={txTo} onChange={e => setTxTo(e.target.value)}
                    className="text-xs rounded-lg border border-border px-2 py-1"
                    style={{ background: "var(--color-surface-2)", color: "var(--color-text-1)" }} />
                </div>
              )}
              {onNavigateTransactions && (
                <button type="button" onClick={onNavigateTransactions}
                  className="flex items-center gap-1 text-xs font-semibold transition-colors hover:opacity-80 ml-1"
                  style={{ color: cPrimary }}>
                  Mind <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Tábla fejléc */}
          <div className="hidden sm:grid px-5 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border/50"
            style={{ gridTemplateColumns: "44px 2fr 1fr 120px 90px 130px" }}>
            <div />
            <div>Tranzakció</div>
            <div>Kategória</div>
            <div>Ki</div>
            <div>Dátum</div>
            <div className="text-right">Összeg</div>
          </div>

          {/* Sorok */}
          <div className="divide-y divide-border/30">
            {recentTx.map(t => {
              const cat = state.categories.find(c => c.id === t.categoryId);
              const person = t.personId ? state.people.find(p => p.id === t.personId) : null;
              const personIdx = person ? state.people.findIndex(p => p.id === person.id) : -1;
              const isIncome = t.type === "income";
              return (
                <div key={t.id}
                  className="px-5 py-3 flex sm:grid items-center gap-3 hover:bg-surface-2/40 transition-colors"
                  style={{ gridTemplateColumns: "44px 2fr 1fr 120px 90px 130px" }}>
                  {getCategoryIcon(cat?.name ?? "", t.type)}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold text-text-1 truncate">{t.name || "(névtelen)"}</div>
                    <div className="text-xs text-text-muted sm:hidden">{cat?.name} · {relativeDate(t.date)}</div>
                  </div>
                  <div className="hidden sm:block text-xs text-text-2 truncate">
                    {cat?.name?.replace(/ 🛒|🏠|⚡|🍽️|🚗|🩺|🛡️|🧾|🧩|🎮|👕|👶|🎁|✈️|🧯/g, "").trim() || "—"}
                  </div>
                  <div className="hidden sm:flex items-center gap-2 text-xs text-text-2">
                    {person && (
                      <span className="w-5 h-5 rounded-full text-[9px] font-bold flex items-center justify-center shrink-0"
                        style={{
                          background: PERSON_PALETTE[personIdx >= 0 ? personIdx % PERSON_PALETTE.length : 0] + "30",
                          color: PERSON_PALETTE[personIdx >= 0 ? personIdx % PERSON_PALETTE.length : 0],
                        }}>
                        {person.name.charAt(0)}
                      </span>
                    )}
                    {person?.name ?? "Háztartás"}
                  </div>
                  <div className="hidden sm:block text-xs text-text-muted">{relativeDate(t.date)}</div>
                  <div className="ml-auto sm:ml-0 text-sm font-bold tabular-nums text-right"
                    style={{ color: isIncome ? cIncome : cExpense }}>
                    {isIncome ? "+" : "−"}{formatHuf(t.amount ?? 0)}
                  </div>
                </div>
              );
            })}
          </div>
        </GlassCard>
      )}
    </div>
  );
}

import React from "react";
import {
  ComposedChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import { formatHuf } from "../lib/format";
import { percent, roundTo } from "../lib/utils";
import type { SeriesRow } from "../types";
import { Field, Select } from "./ui";
import { useTheme } from "../context/ThemeContext";
import { TrendingUp, TrendingDown, Wallet, PiggyBank } from "lucide-react";

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function yFmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return String(v);
}

// ---- KPI kártya mélység-effekttel ----
function KpiCard({
  label,
  value,
  sub,
  accentColor,
  icon: Icon,
  progress,
}: {
  label: string;
  value: string;
  sub?: React.ReactNode;
  accentColor: string;
  icon: React.ComponentType<{ className?: string }>;
  progress?: number; // 0-100, opcionális mini progress bar
}) {
  return (
    <div
      className="rounded-2xl border border-border p-4 relative overflow-hidden flex flex-col gap-3"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: accentColor,
        background: `linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)`,
        boxShadow: `var(--shadow-card), 0 0 28px ${accentColor}18`,
      }}
    >
      {/* Háttér radial glow */}
      <div className="absolute -top-8 -left-8 w-28 h-28 rounded-full pointer-events-none"
        style={{ background: accentColor, opacity: 0.08, filter: "blur(22px)" }} />
      {/* Felső fény-csík */}
      <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${accentColor}44, transparent)` }} />

      <div className="relative flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-text-muted uppercase tracking-wider mb-2">{label}</div>
          <div className="text-[1.6rem] font-extrabold tabular-nums leading-none" style={{ color: accentColor }}>
            {value}
          </div>
        </div>
        <div className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
          style={{ background: `${accentColor}20`, color: accentColor, boxShadow: `0 2px 8px ${accentColor}30` }}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {/* Sub text */}
      {sub && <div className="relative text-xs text-text-muted leading-snug">{sub}</div>}

      {/* Mini progress bar */}
      {progress !== undefined && (
        <div className="relative">
          <div className="h-1 rounded-full overflow-hidden" style={{ background: `${accentColor}18` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${Math.min(100, Math.max(0, progress))}%`,
                background: `linear-gradient(90deg, ${accentColor}88, ${accentColor})`,
                boxShadow: `0 0 6px ${accentColor}55`,
              }}
            />
          </div>
          <div className="text-[10px] text-text-muted mt-1 text-right tabular-nums">{Math.round(progress)}%</div>
        </div>
      )}
    </div>
  );
}

// ---- Tooltip ----
function ChartTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-xl border border-border px-3 py-2 text-xs space-y-1"
      style={{
        background: "var(--color-surface-2)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div className="font-semibold text-text-2 mb-1">{label}</div>
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

export function DashboardView({
  monthList,
  focusMonth,
  setFocusMonth,
  series,
  categoryBreakdown,
  incomeCategoryBreakdown,
  peopleIncomePlanned,
  activeSavingsCount = 0,
}: {
  monthList: string[];
  focusMonth: string;
  setFocusMonth: React.Dispatch<React.SetStateAction<string>>;
  series: SeriesRow[];
  categoryBreakdown: { category: string; value: number }[];
  incomeCategoryBreakdown: { category: string; value: number }[];
  peopleIncomePlanned: { name: string; value: number }[];
  currency?: string;
  activeSavingsCount?: number;
}) {
  useTheme();
  const cIncome  = readVar("--color-positive");
  const cExpense = readVar("--color-negative");
  const cNet     = readVar("--color-chart-3");
  const cBlue    = readVar("--color-chart-1");
  const cBorder  = readVar("--color-border");
  const cWarning = readVar("--color-warning");
  const cPrimary = readVar("--color-primary");
  const PIE_COLORS = [cBlue, "#A78BFA", "#22D3EE", "#F472B6", "#93C5FD", "#6EE7B7", cNet, "#C4B5FD"];

  const current = series.find((s) => s.month === focusMonth) ?? (series.length ? series[0] : undefined);
  const totalExpense = categoryBreakdown.reduce((s, x) => s + (x.value || 0), 0);
  const totalIncome  = incomeCategoryBreakdown.reduce((s, x) => s + (x.value || 0), 0);
  const plannedNet   = current?.plannedNet ?? 0;

  return (
    <div className="space-y-4">

      {/* ---- 4 KPI kártya ---- */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard
          label="Fix bevétel / hó"
          value={formatHuf(current?.plannedIncome ?? 0)}
          accentColor={cIncome}
          icon={TrendingUp}
          sub={(current?.actualIncome ?? 0) > 0
            ? <span>Tényleges: <span style={{ color: cIncome }}>{formatHuf(current!.actualIncome)}</span></span>
            : <span className="text-text-muted">Tervezett összeg</span>}
        />
        <KpiCard
          label="Fix kiadás / hó"
          value={formatHuf(current?.plannedExpense ?? 0)}
          accentColor={cExpense}
          icon={TrendingDown}
          progress={(current?.plannedIncome ?? 0) > 0
            ? ((current?.plannedExpense ?? 0) / (current?.plannedIncome ?? 1)) * 100
            : undefined}
          sub={(current?.actualExpense ?? 0) > 0
            ? <span>Tényleges: <span style={{ color: cExpense }}>{formatHuf(current!.actualExpense)}</span></span>
            : <span className="text-text-muted">Bevétel arányában</span>}
        />
        <KpiCard
          label={`Várható nettó · ${focusMonth}`}
          value={formatHuf(plannedNet)}
          accentColor={plannedNet >= 0 ? cIncome : cExpense}
          icon={Wallet}
          sub={(current?.actualIncome || current?.actualExpense)
            ? <span style={{ color: (current?.actualNet ?? 0) >= 0 ? cIncome : cExpense }}>
                Tényleges: {formatHuf(current?.actualNet ?? 0)}
              </span>
            : <span className="text-text-muted">Bevétel − kiadás</span>}
        />
        <KpiCard
          label="Megtakarítás / hó"
          value={formatHuf(current?.plannedSavings ?? 0)}
          accentColor={cWarning}
          icon={PiggyBank}
          sub={activeSavingsCount > 0
            ? <span>{activeSavingsCount} aktív keret</span>
            : <span className="text-text-muted">Nincs aktív keret</span>}
        />
      </div>

      {/* ---- Chartok egymás alatt, full-width ---- */}
      <div className="space-y-4">

          {/* Dual-scale bar chart */}
          <div
            className="rounded-2xl border border-border p-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
            />
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Idősáv</div>
                <div className="text-base font-semibold text-text-1">Bevétel vs. Kiadás</div>
              </div>
              <div className="flex items-center gap-3">
                {/* Jelmagyarázat */}
                <div className="flex items-center gap-3 text-xs text-text-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cIncome }} />
                    Bevétel
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: cExpense }} />
                    Kiadás
                  </span>
                </div>
                <Field label="Hónap">
                  <Select value={focusMonth} onChange={(e) => setFocusMonth(e.target.value)}>
                    {monthList.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                {/*
                  Overlay / layered bar chart — mindkét bar ugyanazon az Y-skálán.
                  Income: széles (42px), 20% opacity → háttér referencia sáv.
                  Expense: keskeny (18px), teljes opacity → ráfekszik az income sávra.
                  barGap={-30} → a két bar kb. középre igazodik egymáshoz képest.
                */}
                <ComposedChart
                  data={series}
                  margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                  barGap={-30}
                  barCategoryGap="28%"
                >
                  <CartesianGrid strokeDasharray="3 3" stroke={cBorder} opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      const [, m] = v.split("-");
                      return ["jan","feb","már","ápr","máj","jún","júl","aug","szep","okt","nov","dec"][parseInt(m,10)-1] ?? v;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={yFmt}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-surface-2)", opacity: 0.4 }} />
                  {/* Bevétel — széles, halvány → vizuális referencia */}
                  <Bar
                    dataKey="plannedIncome"
                    name="Tervezett bevétel"
                    fill={cIncome}
                    fillOpacity={0.22}
                    barSize={42}
                    radius={[5, 5, 0, 0]}
                  />
                  {/* Kiadás — keskeny, opaque → arányosan ráfekszik */}
                  <Bar
                    dataKey="plannedExpense"
                    name="Tervezett kiadás"
                    fill={cExpense}
                    fillOpacity={0.9}
                    barSize={18}
                    radius={[4, 4, 0, 0]}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Nettó trend */}
          <div
            className="rounded-2xl border border-border p-5 relative overflow-hidden"
            style={{
              background: "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div
              className="absolute top-0 left-0 right-0 h-px pointer-events-none"
              style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
            />
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">Nettó trend</div>
                <div className="text-base font-semibold text-text-1">Egyenleg alakulása</div>
              </div>
              <span className="text-xs text-text-muted hidden sm:block">A tényleges nettó a rögzített tételekből számol.</span>
            </div>
            <div className="h-60">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={cBorder} opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => {
                      const [, m] = v.split("-");
                      return ["jan","feb","már","ápr","máj","jún","júl","aug","szep","okt","nov","dec"][parseInt(m,10)-1] ?? v;
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "var(--color-text-muted)" }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={yFmt}
                    width={48}
                  />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="plannedNet" name="Tervezett nettó" stroke={cBlue} strokeWidth={2.5} dot={false} strokeDasharray="6 3" />
                  <Line type="monotone" dataKey="actualNet" name="Tényleges nettó" stroke={cNet} strokeWidth={2.5} dot={{ r: 3, fill: cNet }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        {/* ---- Info kártyák — 3 oszlopos sor ---- */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Kiadás kategória bontás */}
          <SideCard
            subtitle="Kiadások bontása"
            title="Kategória megoszlás"
            badge="tényleges"
            empty={categoryBreakdown.length === 0}
            emptyText="Nincs rögzített kiadás ebben a hónapban."
          >
            <div className="space-y-2.5">
              {categoryBreakdown.slice(0, 8).map((c, i) => (
                <ProgressRow
                  key={i}
                  label={c.category}
                  value={c.value}
                  total={totalExpense}
                  color={PIE_COLORS[i % PIE_COLORS.length]}
                />
              ))}
            </div>
          </SideCard>

          {/* Bevétel kategória bontás */}
          <SideCard
            subtitle="Bevételek bontása"
            title="Kategória megoszlás"
            badge="tényleges"
            empty={incomeCategoryBreakdown.length === 0}
            emptyText="Nincs rögzített bevétel ebben a hónapban."
          >
            <div className="space-y-2.5">
              {incomeCategoryBreakdown.slice(0, 8).map((c, i) => (
                <ProgressRow
                  key={i}
                  label={c.category}
                  value={c.value}
                  total={totalIncome}
                  color={PIE_COLORS[i % PIE_COLORS.length]}
                />
              ))}
            </div>
          </SideCard>

          {/* Keresők szerint */}
          <SideCard
            subtitle="Látható időtáv"
            title="Keresők tervezett bevétele"
            empty={peopleIncomePlanned.length === 0}
            emptyText="Nincs személyhez rendelt fix bevétel."
          >
            {(() => {
              const maxVal = Math.max(...peopleIncomePlanned.map((p) => p.value), 1);
              return (
                <div className="space-y-3">
                  {peopleIncomePlanned.map((p, i) => (
                    <div key={i} className="space-y-1.5">
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 uppercase"
                          style={{ background: `${cPrimary}22`, color: cPrimary }}
                        >
                          {(p.name || "?")[0]}
                        </span>
                        <span className="flex-1 truncate text-text-2">{p.name}</span>
                        <span className="tabular-nums font-semibold text-text-1">{formatHuf(p.value)}</span>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${(p.value / maxVal) * 100}%`,
                            background: `linear-gradient(90deg, ${cIncome}cc, ${cIncome})`,
                            boxShadow: `0 0 8px ${cIncome}55`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </SideCard>
        </div>
      </div>
    </div>
  );
}

// ---- Újrahasználható segéd-komponensek ----

function SideCard({
  subtitle,
  title,
  badge,
  empty,
  emptyText,
  children,
}: {
  subtitle: string;
  title: string;
  badge?: string;
  empty?: boolean;
  emptyText?: string;
  children?: React.ReactNode;
}) {
  return (
    <div
      className="rounded-2xl border border-border p-4 relative overflow-hidden"
      style={{
        background: "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)" }}
      />
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-xs text-text-muted">{subtitle}</div>
          <div className="text-sm font-semibold text-text-1 mt-0.5">{title}</div>
        </div>
        {badge && (
          <span className="text-[10px] text-text-muted bg-surface-2 px-2 py-0.5 rounded-full border border-border shrink-0">
            {badge}
          </span>
        )}
      </div>
      {empty
        ? <div className="text-xs text-text-muted py-4 text-center">{emptyText}</div>
        : children}
    </div>
  );
}

function ProgressRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = percent(value, total);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-1.5 truncate mr-2 text-text-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
          <span className="truncate">{label}</span>
        </span>
        <span className="flex items-center gap-2 shrink-0">
          <span className="tabular-nums text-text-1">{formatHuf(value)}</span>
          <span className="text-text-muted w-7 text-right">{roundTo(pct, 0)}%</span>
        </span>
      </div>
      <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--color-surface-2)" }}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, ${color}aa, ${color})`,
            boxShadow: pct > 5 ? `0 0 6px ${color}44` : undefined,
          }}
        />
      </div>
    </div>
  );
}

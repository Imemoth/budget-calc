import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, ResponsiveContainer,
} from "recharts";
import { formatHuf } from "../lib/format";
import { percent, roundTo } from "../lib/utils";
import type { SeriesRow } from "../types";
import { Card, Field, Select } from "./ui";
import { useTheme } from "../context/ThemeContext";

function readVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

function yFmt(v: number): string {
  if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000)     return `${Math.round(v / 1_000)}K`;
  return String(v);
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
  useTheme(); // subscribe to theme changes → triggers re-render → CSS vars re-read
  const c1 = readVar("--color-chart-1");
  const c2 = readVar("--color-chart-2");
  const c3 = readVar("--color-chart-3");
  const c4 = readVar("--color-chart-4");
  const C = {
    income:  c2,
    expense: c4,
    net:     c3,
    blue:    c1,
    border:  readVar("--color-border"),
    pie: [c1, "#A78BFA", "#22D3EE", "#F472B6", "#93C5FD", "#6EE7B7", c3, "#C4B5FD"],
  };

  const current = series.find((s) => s.month === focusMonth) ?? (series.length ? series[0] : undefined);
  const totalExpense = categoryBreakdown.reduce((s, x) => s + (x.value || 0), 0);
  const totalIncome = incomeCategoryBreakdown.reduce((s, x) => s + (x.value || 0), 0);

  const plannedNet = current?.plannedNet ?? 0;

  return (
    <div>
      {/* ---- 4 KPI kártya ---- */}
      <div className="mb-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Bevétel */}
        <div className="rounded-2xl border border-border p-4" style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-positive)" }}>
          <div className="text-xs text-text-muted mb-1">Fix bevétel / hó</div>
          <div className="text-xl font-bold tabular-nums text-positive">{formatHuf(current?.plannedIncome ?? 0)}</div>
          {(current?.actualIncome ?? 0) > 0 && (
            <div className="text-xs text-text-muted mt-1">Tényleges: <span className="text-positive">{formatHuf(current!.actualIncome)}</span></div>
          )}
        </div>
        {/* Kiadás */}
        <div className="rounded-2xl border border-border p-4" style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-negative)" }}>
          <div className="text-xs text-text-muted mb-1">Fix kiadás / hó</div>
          <div className="text-xl font-bold tabular-nums text-negative">{formatHuf(current?.plannedExpense ?? 0)}</div>
          {(current?.actualExpense ?? 0) > 0 && (
            <div className="text-xs text-text-muted mt-1">Tényleges: <span className="text-negative">{formatHuf(current!.actualExpense)}</span></div>
          )}
        </div>
        {/* Nettó */}
        <div className="rounded-2xl border border-border p-4" style={{ borderLeftWidth: 4, borderLeftColor: plannedNet >= 0 ? "var(--color-positive)" : "var(--color-negative)" }}>
          <div className="text-xs text-text-muted mb-1">Várható nettó · {focusMonth}</div>
          <div className={`text-xl font-bold tabular-nums ${plannedNet >= 0 ? "text-positive" : "text-negative"}`}>
            {formatHuf(plannedNet)}
          </div>
          {(current?.actualIncome || current?.actualExpense) ? (
            <div className={`text-xs mt-1 ${(current?.actualNet ?? 0) >= 0 ? "text-positive" : "text-negative"}`}>
              Tényleges: {formatHuf(current?.actualNet ?? 0)}
            </div>
          ) : null}
        </div>
        {/* Megtakarítás */}
        <div className="rounded-2xl border border-border p-4" style={{ borderLeftWidth: 4, borderLeftColor: "var(--color-warning)" }}>
          <div className="text-xs text-text-muted mb-1">Megtakarítás / hó</div>
          <div className="text-xl font-bold tabular-nums text-warning">{formatHuf(current?.plannedSavings ?? 0)}</div>
          {activeSavingsCount > 0 && (
            <div className="text-xs text-text-muted mt-1">{activeSavingsCount} aktív keret</div>
          )}
        </div>
      </div>

      {/* ---- Charts + sidebar grid ---- */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <Card className="p-5">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div>
                <div className="text-sm text-text-2">Idősáv</div>
                <div className="text-lg font-semibold">Tervezett vs. Tényleges</div>
              </div>
              <div className="flex items-center gap-2">
                <Field label="Fókusz hónap">
                  <Select value={focusMonth} onChange={(e) => setFocusMonth(e.target.value)}>
                    {monthList.map((m) => <option key={m} value={m}>{m}</option>)}
                  </Select>
                </Field>
              </div>
            </div>
            <div className="mt-4 h-75">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={yFmt} />
                  <Tooltip formatter={(v) => formatHuf(Number(v))} />
                  <Legend />
                  <Bar dataKey="plannedIncome" name="Tervezett bevétel" fill={C.income} />
                  <Bar dataKey="plannedExpense" name="Tervezett kiadás" fill={C.expense} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-2">Nettó trend</div>
                <div className="text-lg font-semibold">Egyenleg alakulása</div>
              </div>
              <div className="text-xs text-text-muted">A tényleges nettó a rögzített tételekből számol.</div>
            </div>
            <div className="mt-4 h-65">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={series} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={C.border} opacity={0.5} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={yFmt} />
                  <Tooltip formatter={(v) => formatHuf(Number(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="plannedNet" name="Tervezett nettó" stroke={C.blue} strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="actualNet" name="Tényleges nettó" stroke={C.net} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-2">Kiadások bontása</div>
                <div className="text-lg font-semibold">Kategória megoszlás</div>
              </div>
              <div className="text-[10px] text-text-muted">tényleges, csak kiadás</div>
            </div>
            {categoryBreakdown.length === 0 ? (
              <div className="mt-4 text-sm text-text-muted">Nincs rögzített kiadás ebben a hónapban.</div>
            ) : null}
            <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
              {categoryBreakdown.slice(0, 10).map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-text-2">
                    <span className="flex items-center gap-2 truncate mr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: C.pie[i % C.pie.length] }} />
                      <span className="truncate">{c.category}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-text-1">{formatHuf(c.value)}</span>
                      <span className="text-text-muted w-8 text-right">{roundTo(percent(c.value, totalExpense), 1)}%</span>
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent(c.value, totalExpense)}%`,
                        backgroundColor: C.pie[i % C.pie.length],
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm text-text-2">Bevételek bontása</div>
                <div className="text-lg font-semibold">Kategória megoszlás</div>
              </div>
              <div className="text-[10px] text-text-muted">tényleges, csak bevétel</div>
            </div>
            {incomeCategoryBreakdown.length === 0 ? (
              <div className="mt-4 text-sm text-text-muted">Nincs rögzített bevétel ebben a hónapban.</div>
            ) : null}
            <div className="mt-3 space-y-2 max-h-64 overflow-auto pr-1">
              {incomeCategoryBreakdown.slice(0, 10).map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-text-2">
                    <span className="flex items-center gap-2 truncate mr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: C.pie[i % C.pie.length] }} />
                      <span className="truncate">{c.category}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-text-1">{formatHuf(c.value)}</span>
                      <span className="text-text-muted w-8 text-right">{roundTo(percent(c.value, totalIncome), 1)}%</span>
                    </span>
                  </div>
                  <div className="h-1 rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${percent(c.value, totalIncome)}%`,
                        backgroundColor: C.pie[i % C.pie.length],
                      }} />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="text-sm text-text-2">Látható időtáv tervezett bevétele</div>
            <div className="text-lg font-semibold">Keresők szerint</div>
            {peopleIncomePlanned.length === 0 ? (
              <div className="mt-3 text-sm text-text-muted">Nincs személyhez rendelt fix bevétel.</div>
            ) : (() => {
              const maxVal = Math.max(...peopleIncomePlanned.map((p) => p.value), 1);
              return (
                <div className="mt-4 space-y-3">
                  {peopleIncomePlanned.map((p, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-text-2">
                        <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[10px] font-bold shrink-0 uppercase">
                          {(p.name || "?")[0]}
                        </span>
                        <span className="flex-1 truncate">{p.name}</span>
                        <span className="text-text-1 shrink-0 tabular-nums">{formatHuf(p.value)}</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-2 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${(p.value / maxVal) * 100}%`, backgroundColor: C.income }} />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </Card>
        </div>
      </div>
    </div>
  );
}

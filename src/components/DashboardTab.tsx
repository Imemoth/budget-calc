import React from "react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  LineChart, Line, PieChart, Pie, ResponsiveContainer, Cell,
} from "recharts";
import { formatHUF, fmtMoney } from "../lib/utils";
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
  currency,
}: {
  monthList: string[];
  focusMonth: string;
  setFocusMonth: React.Dispatch<React.SetStateAction<string>>;
  series: SeriesRow[];
  categoryBreakdown: { category: string; value: number }[];
  incomeCategoryBreakdown: { category: string; value: number }[];
  peopleIncomePlanned: { name: string; value: number }[];
  currency: string;
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

  const latest = series.length ? series[series.length - 1] : undefined;
  const current = series.find((s) => s.month === focusMonth) ?? (series.length ? series[0] : undefined);
  const money = (n: number) => fmtMoney(n, currency);
  const totalExpense = categoryBreakdown.reduce((s, x) => s + (x.value || 0), 0);
  const totalIncome = incomeCategoryBreakdown.reduce((s, x) => s + (x.value || 0), 0);

  return (
    <div>
      {/* ---- Hero summary card ---- */}
      <div className="mb-4 rounded-2xl bg-emerald-950/20 border border-emerald-500/30 border-l-4 border-l-emerald-500 p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs text-text-muted mb-1">Tervezett nettó · {focusMonth}</div>
            <div className={`text-3xl font-bold tabular-nums ${(current?.plannedNet ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {money(current?.plannedNet ?? 0)}
            </div>
          </div>
          <div className="flex gap-6">
            <div>
              <div className="text-[11px] text-text-muted">Bevétel</div>
              <div className="text-sm font-semibold text-emerald-400">{money(current?.plannedIncome ?? 0)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-muted">Kiadás</div>
              <div className="text-sm font-semibold text-red-400">{money(current?.plannedExpense ?? 0)}</div>
            </div>
            <div>
              <div className="text-[11px] text-text-muted">Megtakarítás</div>
              <div className="text-sm font-semibold text-amber-400">{money(current?.plannedSavings ?? 0)}</div>
            </div>
          </div>
        </div>
        {(current?.actualIncome || current?.actualExpense) ? (
          <div className="mt-3 pt-3 border-t border-emerald-500/20 flex flex-wrap gap-x-6 gap-y-1 text-xs text-text-muted">
            <span>Tényleges bevétel: <span className="text-emerald-400">{money(current.actualIncome)}</span></span>
            <span>Tényleges kiadás: <span className="text-red-400">{money(current.actualExpense)}</span></span>
            <span>
              Tényleges nettó:{" "}
              <span className={`font-semibold ${current.actualNet >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {money(current.actualNet)}
              </span>
            </span>
          </div>
        ) : null}
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
                  <Tooltip formatter={(v) => `${formatHUF(Number(v))} ${currency}`} />
                  <Legend />
                  <Bar dataKey="plannedIncome" name="Tervezett bevétel" fill={C.income} />
                  <Bar dataKey="plannedExpense" name="Tervezett kiadás" fill={C.expense} />
                  <Bar dataKey="actualNet" name="Tényleges nettó" fill={C.net} />
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
                  <Tooltip formatter={(v) => `${formatHUF(Number(v))} ${currency}`} />
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
            ) : (
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(v) => `${formatHUF(Number(v))} ${currency}`} />
                    <Pie data={categoryBreakdown} dataKey="value" nameKey="category" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {categoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={C.pie[i % C.pie.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 space-y-2 max-h-48 overflow-auto pr-1">
              {categoryBreakdown.slice(0, 10).map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-text-2">
                    <span className="flex items-center gap-2 truncate mr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: C.pie[i % C.pie.length] }} />
                      <span className="truncate">{c.category}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-text-1">{money(c.value)}</span>
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
            ) : (
              <div className="mt-4 h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip formatter={(v) => `${formatHUF(Number(v))} ${currency}`} />
                    <Pie data={incomeCategoryBreakdown} dataKey="value" nameKey="category" innerRadius={45} outerRadius={75} paddingAngle={2}>
                      {incomeCategoryBreakdown.map((_, i) => (
                        <Cell key={i} fill={C.pie[i % C.pie.length]} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="mt-3 space-y-2 max-h-48 overflow-auto pr-1">
              {incomeCategoryBreakdown.slice(0, 10).map((c, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-text-2">
                    <span className="flex items-center gap-2 truncate mr-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: C.pie[i % C.pie.length] }} />
                      <span className="truncate">{c.category}</span>
                    </span>
                    <span className="flex items-center gap-2 shrink-0">
                      <span className="text-text-1">{money(c.value)}</span>
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
            ) : (
              <div className="mt-4 h-45">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={peopleIncomePlanned} layout="vertical" margin={{ top: 0, right: 0, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={C.border} opacity={0.5} />
                    <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={yFmt} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                    <Tooltip formatter={(v) => `${formatHUF(Number(v))} ${currency}`} />
                    <Bar dataKey="value" name="Tervezett bevétel" fill={C.income} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card className="p-5">
            <div className="text-sm text-text-2">Legutolsó hónap a nézetben</div>
            <div className="text-lg font-semibold">{latest?.month}</div>
            <div className="mt-3 flex gap-6">
              <div>
                <div className="text-[11px] text-text-muted">Tervezett nettó</div>
                <div className={`text-sm font-semibold tabular-nums ${(latest?.plannedNet ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {money(latest?.plannedNet ?? 0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-text-muted">Tényleges nettó</div>
                <div className={`text-sm font-semibold tabular-nums ${(latest?.actualNet ?? 0) >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {money(latest?.actualNet ?? 0)}
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

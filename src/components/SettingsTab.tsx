import { Download } from "lucide-react";
import { useState } from "react";
import { APP_VERSION } from "../lib/version";
import type { Settings, State, SeriesRow } from "../types";
import { Card, Field, Input, Select, SmallButton } from "./ui";
import { normalizeMonthInput, parseNonNegativeInput } from "../lib/domainHelpers";

// ---- CSV helpers ----

function escField(v: string | number | null | undefined): string {
  const s = v == null ? "" : String(v);
  if (s.includes(";") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function buildCSV(rows: (string | number | null | undefined)[][]): string {
  const BOM = "\uFEFF";
  return BOM + rows.map((r) => r.map(escField).join(";")).join("\r\n");
}

function downloadCSV(filename: string, rows: (string | number | null | undefined)[][]): void {
  const blob = new Blob([buildCSV(rows)], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

function exportTransactions(state: State) {
  const catMap = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
  const personMap = Object.fromEntries(state.people.map((p) => [p.id, p.name]));
  const rows: (string | number | null)[][] = [
    ["Dátum", "Megnevezés", "Típus", `Összeg (${state.settings.currency})`, "Kategória", "Személy", "Megjegyzés"],
    ...state.transactions
      .slice()
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((t) => [
        t.date,
        t.name,
        t.type === "income" ? "bevétel" : "kiadás",
        t.amount,
        t.categoryId ? (catMap[t.categoryId] ?? t.categoryId) : "",
        t.personId ? (personMap[t.personId] ?? t.personId) : "",
        t.notes ?? "",
      ]),
  ];
  downloadCSV(`tranzakciok_${todayStr()}.csv`, rows);
}

function exportRecurring(state: State) {
  const catMap = Object.fromEntries(state.categories.map((c) => [c.id, c.name]));
  const personMap = Object.fromEntries(state.people.map((p) => [p.id, p.name]));
  const cadenceLabel: Record<string, string> = {
    monthly: "havi",
    quarterly: "negyedéves",
    yearly: "éves",
  };
  const rows: (string | number | null)[][] = [
    [
      "Megnevezés", "Típus", `Összeg (${state.settings.currency})`, "Cadence",
      "Kezdő hónap", "Záró hónap", "Esedékesség (nap)", "Kategória", "Személy", "Aktív", "Megjegyzés",
    ],
    ...state.recurring.map((r) => [
      r.name,
      r.type === "income" ? "bevétel" : "kiadás",
      r.amount,
      cadenceLabel[r.cadence] ?? r.cadence,
      r.startMonth,
      r.endMonth ?? "",
      r.dayOfMonth,
      r.categoryId ? (catMap[r.categoryId] ?? r.categoryId) : "",
      r.personId ? (personMap[r.personId] ?? r.personId) : "",
      r.enabled ? "igen" : "nem",
      r.notes ?? "",
    ]),
  ];
  downloadCSV(`fix_tetelek_${todayStr()}.csv`, rows);
}

function exportSavings(state: State) {
  const rows: (string | number | null)[][] = [
    [
      "Megnevezés",
      `Célösszeg (${state.settings.currency})`,
      `Havi terv (${state.settings.currency})`,
      "Kezdő hónap", "Záró hónap", "Megjegyzés",
    ],
    ...state.savings.map((s) => [
      s.name,
      s.targetAmount,
      s.monthlyPlanned,
      s.startMonth,
      s.endMonth ?? "",
      s.notes ?? "",
    ]),
  ];
  downloadCSV(`megtakaritasok_${todayStr()}.csv`, rows);
}

function exportSummary(state: State, series: SeriesRow[]) {
  const cur = state.settings.currency;
  const rows: (string | number | null)[][] = [
    [
      "Hónap",
      `Tervezett bevétel (${cur})`,
      `Tervezett kiadás (${cur})`,
      `Tervezett megtakarítás (${cur})`,
      `Tervezett nettó (${cur})`,
      `Tényleges bevétel (${cur})`,
      `Tényleges kiadás (${cur})`,
      `Tényleges nettó (${cur})`,
    ],
    ...series.map((row) => [
      row.month,
      row.plannedIncome,
      row.plannedExpense,
      row.plannedSavings,
      row.plannedNet,
      row.actualIncome,
      row.actualExpense,
      row.actualNet,
    ]),
  ];
  downloadCSV(`havi_osszesito_${todayStr()}.csv`, rows);
}

// ---- Component ----

export function SettingsView({
  settings,
  updateSettings,
  state,
  series,
  changePassword,
}: {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  state: State;
  series: SeriesRow[];
  changePassword: (pw: string) => Promise<{ error: string | null }>;
}) {
  const { startMonth, horizonMonths, currency } = settings;
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwMsg, setPwMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  async function handlePasswordChange() {
    setPwMsg(null);
    if (newPw.length < 8) { setPwMsg({ type: "error", text: "A jelszónak legalább 8 karakter kell." }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "error", text: "A két jelszó nem egyezik." }); return; }
    setPwLoading(true);
    const { error } = await changePassword(newPw);
    setPwLoading(false);
    if (error) { setPwMsg({ type: "error", text: error }); }
    else { setPwMsg({ type: "ok", text: "Jelszó sikeresen megváltoztatva." }); setNewPw(""); setConfirmPw(""); }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="text-sm text-white/60">Időtáv és pénznem</div>
        <div className="text-lg font-semibold">Alap beállítások</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Kezdő hónap" hint="YYYY-MM">
            <Input
              type="month"
              value={startMonth || ""}
              onChange={(e) =>
                updateSettings({
                  startMonth: normalizeMonthInput(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Látható hónapok száma" hint="3-60">
            <Input
              type="number"
              min={3}
              max={60}
              value={horizonMonths ?? 18}
              onChange={(e) => {
                const n = parseNonNegativeInput(e.target.value);
                const clamped = Math.min(60, Math.max(3, n || 18));
                updateSettings({ horizonMonths: clamped });
              }}
            />
          </Field>
          <Field label="Pénznem">
            <Select
              value={currency || "HUF"}
              onChange={(e) => updateSettings({ currency: e.target.value })}
            >
              <option value="HUF">HUF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Megjelenés">
            <Select
              value={settings.theme ?? "dark-neo"}
              onChange={(e) => updateSettings({ theme: e.target.value })}
            >
              <option value="dark-neo">Sötét (Dark Neo)</option>
              <option value="graphite-emerald">Graphite + Emerald</option>
              <option value="light">Világos</option>
              <option value="trust-blue">Trust Blue + Mint</option>
              <option value="teal-slate">Teal + Slate</option>
            </Select>
          </Field>
        </div>

        <div className="mt-4 text-[11px] text-white/40">
          Ha 2026-ra akarsz előretervezni, állítsd a kezdő hónapot 2026-01-re, és a horizontot 12 vagy 18 hónapra.
        </div>
      </Card>

      <Card className="p-5 flex flex-col justify-between">
        <div>
          <div className="text-sm text-white/60">Alkalmazás</div>
          <div className="text-lg font-semibold">Verzió</div>
          <div className="mt-3 text-sm text-white/80">
            Budget planner <span className="font-mono">v{APP_VERSION}</span>
          </div>
        </div>
        <div className="mt-4 text-[11px] text-white/40">
          Az adataid a böngésző <b>localStorage</b>-ében vannak tárolva.
          Ha törlöd a böngésző adatait, a költségvetés is törlődik.
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <div className="text-sm text-white/60">Adatok letöltése</div>
        <div className="text-lg font-semibold">Export (CSV)</div>
        <div className="mt-4 flex flex-wrap gap-3">
          <SmallButton variant="solid" onClick={() => exportTransactions(state)}>
            <Download className="w-3.5 h-3.5" />
            Tranzakciók
          </SmallButton>
          <SmallButton variant="solid" onClick={() => exportRecurring(state)}>
            <Download className="w-3.5 h-3.5" />
            Fix tételek
          </SmallButton>
          <SmallButton variant="solid" onClick={() => exportSavings(state)}>
            <Download className="w-3.5 h-3.5" />
            Megtakarítások
          </SmallButton>
          <SmallButton variant="solid" onClick={() => exportSummary(state, series)}>
            <Download className="w-3.5 h-3.5" />
            Havi összesítő
          </SmallButton>
        </div>
        <div className="mt-3 text-[11px] text-white/40">
          UTF-8 BOM, pontosvessző elválasztó – közvetlenül megnyitható Excelben.
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm text-white/60">Fiók</div>
        <div className="text-lg font-semibold">Jelszó módosítása</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Új jelszó">
            <Input
              type="password"
              value={newPw}
              onChange={(e) => setNewPw(e.target.value)}
              placeholder="min. 8 karakter"
            />
          </Field>
          <Field label="Új jelszó megerősítése">
            <Input
              type="password"
              value={confirmPw}
              onChange={(e) => setConfirmPw(e.target.value)}
              placeholder="ugyanaz még egyszer"
            />
          </Field>
        </div>
        {pwMsg && (
          <div className={`mt-2 text-xs ${pwMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
            {pwMsg.text}
          </div>
        )}
        <div className="mt-3">
          <SmallButton variant="solid" onClick={handlePasswordChange} disabled={pwLoading}>
            {pwLoading ? "Mentés…" : "Jelszó mentése"}
          </SmallButton>
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm text-white/60">Gyors útmutató</div>
        <div className="text-lg font-semibold">Ajánlott használat</div>

        <ol className="mt-4 space-y-2 text-sm text-white/70 list-decimal list-inside">
          <li>Lépj a <b>Keresők & kategóriák</b> fülre, és állítsd be a 2 (vagy később 3) személyt.</li>
          <li>A <b>Fix tételek</b> fülön add meg a 2026-os fix bevételeket és kiadásokat start: 2026-01, end: 2026-12.</li>
          <li>A <b>Megtakarítás</b> fülön állíts be külön keretet (pl. felújítás), havi tervvel.</li>
          <li>A <b>Dashboard</b> azonnal mutatja a tervezett havi nettót.</li>
          <li>A valós költéseket/bevételeket a <b>Tételek</b> fülön rögzítsd.</li>
        </ol>
      </Card>
    </div>
  );
}

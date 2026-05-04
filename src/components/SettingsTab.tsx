import { ChevronDown, Download, Upload, Eye, EyeOff, Mail, Plus, RefreshCw, RotateCcw, User, Building2, Link2, CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import { APP_VERSION } from "../lib/version";
import type { Settings, State, SeriesRow, HouseholdMember, MemberPermissions, MoneyType, Category } from "../types";
import { DEFAULT_PERMISSIONS } from "../types";
import { Card, Field, Input, Select, SmallButton, ConfirmDelete } from "./ui";
import { ThemeSelector } from "./ThemeSelector";
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
  updateProfile,
  currentUserEmail,
  currentUserFirstName,
  currentUserLastName,
  onExportJson,
  onImportClick,
  onReset,
  isAdmin,
  householdMembers,
  membersLoadError,
  isOwner,
  currentUserId,
  myPermissions: _myPermissions, // eslint-disable-line @typescript-eslint/no-unused-vars
  onSendInvite,
  onUpdateMemberPermissions,
  onRemoveMember,
  addCategory,
  updateCategory,
  removeCategory,
  reseedCategories,
}: {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
  state: State;
  series: SeriesRow[];
  changePassword: (currentPw: string, newPw: string) => Promise<{ error: string | null }>;
  updateProfile: (firstName: string, lastName: string) => Promise<{ error: string | null }>;
  currentUserEmail?: string | null;
  currentUserFirstName?: string | null;
  currentUserLastName?: string | null;
  onExportJson: () => void;
  onImportClick: () => void;
  onReset?: () => void;
  isAdmin?: boolean;
  householdMembers: HouseholdMember[];
  membersLoadError: string | null;
  isOwner: boolean;
  currentUserId: string | null;
  myPermissions: MemberPermissions;
  onSendInvite: (email: string, permissions: MemberPermissions) => Promise<{ error: string | null }>;
  onUpdateMemberPermissions: (memberId: string, permissions: MemberPermissions) => Promise<void>;
  onRemoveMember: (memberId: string) => Promise<void>;
  addCategory: (type: MoneyType, parentId?: string) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
  reseedCategories: () => void;
}) {
  const { startMonth, horizonMonths, currency } = settings;

  // ---- Profil (név) — közvetlenül a raw first_name/last_name-ből ----
  const [lastName,  setLastName]  = useState(currentUserLastName  ?? "");
  const [firstName, setFirstName] = useState(currentUserFirstName ?? "");
  const [profileMsg, setProfileMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  async function handleProfileSave() {
    setProfileMsg(null);
    setProfileLoading(true);
    const { error } = await updateProfile(firstName.trim(), lastName.trim());
    setProfileLoading(false);
    if (error) setProfileMsg({ type: "error", text: error });
    else setProfileMsg({ type: "ok", text: "Profil sikeresen mentve." });
  }

  // ---- Jelszó ----
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // ---- Invite state ----
  const [inviteEmail, setInviteEmail] = useState("");
  const [invitePermissions, setInvitePermissions] = useState<MemberPermissions>({ ...DEFAULT_PERMISSIONS });
  const [inviteMsg, setInviteMsg] = useState<{ type: "error" | "ok"; text: string } | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  async function handleSendInvite() {
    setInviteMsg(null);
    if (!inviteEmail.includes("@")) { setInviteMsg({ type: "error", text: "Érvényes email-t adj meg." }); return; }
    setInviteLoading(true);
    const { error } = await onSendInvite(inviteEmail, invitePermissions);
    setInviteLoading(false);
    if (error) { setInviteMsg({ type: "error", text: error }); }
    else { setInviteMsg({ type: "ok", text: "Meghívó sikeresen elküldve!" }); setInviteEmail(""); setInvitePermissions({ ...DEFAULT_PERMISSIONS }); }
  }

  const permLabels: { key: keyof MemberPermissions; label: string }[] = [
    { key: "income", label: "Bevétel" },
    { key: "expense", label: "Kiadás" },
    { key: "savings", label: "Megtakarítás" },
    { key: "categories", label: "Kategóriák" },
  ];

  async function handlePasswordChange() {
    setPwMsg(null);
    if (!currentPw) { setPwMsg({ type: "error", text: "Add meg a jelenlegi jelszót." }); return; }
    if (newPw.length < 8) { setPwMsg({ type: "error", text: "A jelszónak legalább 8 karakter kell." }); return; }
    if (newPw !== confirmPw) { setPwMsg({ type: "error", text: "A két jelszó nem egyezik." }); return; }
    setPwLoading(true);
    const { error } = await changePassword(currentPw, newPw);
    setPwLoading(false);
    if (error) { setPwMsg({ type: "error", text: error }); }
    else { setPwMsg({ type: "ok", text: "Jelszó sikeresen megváltoztatva." }); setCurrentPw(""); setNewPw(""); setConfirmPw(""); }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="text-sm text-text-2">Időtáv és pénznem</div>
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
          <Field label="Havi költségkeret (Ft)" hint="Áttekintésen progress bar-ként jelenik meg">
            <Input
              type="number"
              min={0}
              value={settings.monthlyBudget ?? ""}
              placeholder="pl. 300000"
              onChange={(e) => {
                const n = parseNonNegativeInput(e.target.value);
                updateSettings({ monthlyBudget: n > 0 ? n : undefined });
              }}
            />
          </Field>
        </div>

        <div className="mt-4">
          <div className="text-xs text-text-2 mb-2">Megjelenés</div>
          <ThemeSelector
            value={settings.theme ?? "graphite-emerald"}
            onChange={(id) => updateSettings({ theme: id })}
          />
        </div>

        <div className="mt-4 text-[11px] text-text-muted">
          Ha 2026-ra akarsz előretervezni, állítsd a kezdő hónapot 2026-01-re, és a horizontot 12 vagy 18 hónapra.
        </div>
      </Card>

      <Card className="p-5 flex flex-col justify-between">
        <div>
          <div className="text-sm text-text-2">Alkalmazás</div>
          <div className="text-lg font-semibold">Verzió</div>
          <div className="mt-3 text-sm text-text-1">
            Budget planner <span className="font-mono">v{APP_VERSION}</span>
          </div>
        </div>
        <div className="mt-4 text-[11px] text-text-muted">
          Az adataid a böngésző <b>localStorage</b>-ében vannak tárolva.
          Ha törlöd a böngésző adatait, a költségvetés is törlődik.
        </div>
      </Card>

      <Card className="p-5 xl:col-span-2">
        <div className="text-sm text-text-2">Adatok letöltése</div>
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
        <div className="mt-3 text-[11px] text-text-muted">
          UTF-8 BOM, pontosvessző elválasztó – közvetlenül megnyitható Excelben.
        </div>
      </Card>

      {/* ---- Profil / Név ---- */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <User className="w-4 h-4 text-text-muted" />
          <div className="text-sm text-text-2">Fiók</div>
        </div>
        <div className="text-lg font-semibold mb-1">Profilom</div>
        {currentUserEmail && (
          <div className="text-xs text-text-muted mb-4 flex items-center gap-1.5">
            <Mail className="w-3 h-3" /> {currentUserEmail}
          </div>
        )}
        {/* Magyar névsor: Vezetéknév előbb */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Vezetéknév">
            <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder="pl. Kovács" className="w-full" />
          </Field>
          <Field label="Keresztnév">
            <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="pl. Péter" className="w-full" />
          </Field>
        </div>
        {profileMsg && (
          <div className={`mt-3 text-xs px-3 py-2 rounded-xl border ${profileMsg.type === "ok" ? "text-positive bg-positive/10 border-positive/30" : "text-negative bg-negative/10 border-negative/30"}`}>
            {profileMsg.text}
          </div>
        )}
        <div className="mt-3 flex justify-end">
          <SmallButton variant="primary" onClick={handleProfileSave} disabled={profileLoading}>
            {profileLoading ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : null}
            Mentés
          </SmallButton>
        </div>
      </Card>

      {/* ---- Banki integrációk ---- */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-1">
          <Building2 className="w-4 h-4 text-text-muted" />
          <div className="text-sm text-text-2">Importálás</div>
        </div>
        <div className="text-lg font-semibold mb-1">Banki integrációk</div>
        <p className="text-xs text-text-muted mb-4">
          Kapcsold össze bankszámládat az alkalmazással — tranzakcióid automatikusan importálódnak.
          PSD2 Open Banking szabványon keresztül, GoCardless aggregátoron át.
        </p>

        {/* Támogatott magyar bankok */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-text-2 mb-2">Támogatott magyar bankok</div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {[
              { name: "OTP Bank", status: "available" },
              { name: "K&H Bank", status: "available" },
              { name: "Erste Bank", status: "available" },
              { name: "UniCredit", status: "available" },
              { name: "Raiffeisen", status: "available" },
              { name: "MBH Bank", status: "available" },
              { name: "CIB Bank", status: "available" },
              { name: "Revolut", status: "csv" },
            ].map((bank) => (
              <div key={bank.name}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border text-xs"
                style={{ background: "var(--color-surface-2)" }}>
                {bank.status === "available" ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-positive)" }} />
                ) : (
                  <Download className="w-3.5 h-3.5 shrink-0" style={{ color: "var(--color-primary)" }} />
                )}
                <span className="text-text-2 font-medium truncate">{bank.name}</span>
                {bank.status === "csv" && (
                  <span className="ml-auto text-[9px] text-text-muted shrink-0">CSV</span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Aktív kapcsolatok placeholder */}
        <div className="mb-4">
          <div className="text-xs font-semibold text-text-2 mb-2">Kapcsolt bankok</div>
          <div className="rounded-xl border border-border px-4 py-6 text-center"
            style={{ background: "var(--color-surface-2)40" }}>
            <Link2 className="w-6 h-6 mx-auto mb-2 text-text-muted" />
            <div className="text-sm font-medium text-text-2">Nincs kapcsolt bankszámla</div>
            <div className="text-xs text-text-muted mt-1">
              Hamarosan: bankszámla összekapcsolás GoCardless-en keresztül
            </div>
          </div>
        </div>

        {/* Gombok */}
        <div className="flex items-center gap-2 flex-wrap">
          <SmallButton variant="primary" onClick={() => {
            // TODO: GoCardless OAuth flow indítása
            window.open("https://bankaccountdata.gocardless.com/", "_blank");
          }}>
            <Link2 className="w-3.5 h-3.5" /> Bank összekapcsolása
            <span className="ml-1 text-[9px] px-1.5 py-0.5 rounded-full font-bold"
              style={{ background: "rgba(255,255,255,0.2)" }}>HAMAROSAN</span>
          </SmallButton>
        </div>

        <div className="mt-3 flex items-start gap-1.5 text-[11px] text-text-muted">
          <Clock className="w-3 h-3 shrink-0 mt-0.5" />
          <span>
            A banki integráció fejlesztés alatt áll. GoCardless (ex-Nordigen) PSD2 Open Banking API-t fogunk használni,
            ami az összes nagy magyar bankot támogatja. Revolut adatait már most importálhatod CSV-vel a Tranzakciók oldalon.
          </span>
        </div>
      </Card>

      {/* ---- Adatok: Export / Import / Reset ---- */}
      <Card className="p-5">
        <div className="text-sm text-text-2">Fiók</div>
        <div className="text-lg font-semibold mb-4">Adatok kezelése</div>
        <div className="flex items-center gap-2 flex-wrap">
          <SmallButton variant="solid" onClick={onExportJson}>
            <Download className="w-3.5 h-3.5" /> JSON export
          </SmallButton>
          <SmallButton variant="solid" onClick={onImportClick}>
            <Upload className="w-3.5 h-3.5" /> JSON import
          </SmallButton>
          {isAdmin && onReset && (
            <SmallButton variant="danger" onClick={onReset}>
              Adatok visszaállítása
            </SmallButton>
          )}
        </div>
        <div className="mt-3 text-[11px] text-text-muted">
          Az export/import az összes háztartási adatot tartalmazza JSON formátumban.
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm text-text-2">Fiók</div>
        <div className="text-lg font-semibold">Jelszó módosítása</div>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Jelenlegi jelszó">
            <div className="relative">
              <Input
                type={showCurrentPw ? "text" : "password"}
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                placeholder="jelenlegi jelszó"
                className="pr-9 w-full"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-2 transition"
                tabIndex={-1}
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <div />
          <Field label="Új jelszó">
            <div className="relative">
              <Input
                type={showNewPw ? "text" : "password"}
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder="min. 8 karakter"
                className="pr-9 w-full"
              />
              <button
                type="button"
                onClick={() => setShowNewPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-2 transition"
                tabIndex={-1}
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </Field>
          <Field label="Új jelszó megerősítése">
            <div className="relative">
              <Input
                type={showConfirmPw ? "text" : "password"}
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder="ugyanaz még egyszer"
                className="pr-9 w-full"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-2 transition"
                tabIndex={-1}
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
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

      <Card className="p-5 xl:col-span-2">
        <div className="text-sm text-text-2">Közös háztartás</div>
        <div className="text-lg font-semibold">Megosztás</div>

        {/* Tagok listája */}
        {householdMembers.length > 0 && (
          <div className="mt-4 space-y-2">
            {householdMembers.map((m) => (
              <div key={m.id} className="flex flex-wrap items-start gap-3 p-3 rounded-xl bg-surface-2 border border-border">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{m.email ?? m.userId}</div>
                  <div className="text-xs text-text-muted mt-0.5">
                    {m.role === "OWNER" ? "Tulajdonos" : "Tag"}
                  </div>
                  {m.role === "MEMBER" && isOwner && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {permLabels.map(({ key, label }) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => onUpdateMemberPermissions(m.id, { ...m.permissions, [key]: !m.permissions[key] })}
                          className={`text-xs px-2 py-0.5 rounded-full border transition ${
                            m.permissions[key]
                              ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                              : "bg-surface-2 border-border text-text-muted"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {/* Eltávolítás (csak MEMBER, csak tulajdonos látja) */}
                {m.role === "MEMBER" && isOwner && (
                  <ConfirmDelete onConfirm={() => onRemoveMember(m.id)} />
                )}
                {/* Kilépés (saját MEMBER sor) */}
                {m.role === "MEMBER" && m.userId === currentUserId && (
                  <ConfirmDelete onConfirm={() => onRemoveMember(m.id)} title="Kilépés" />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Meghívó form – csak tulajdonosnak */}
        {isOwner && (
          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-sm font-medium mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-text-muted" />
              Meghívó küldése
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Email">
                <Input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="partner@email.com"
                />
              </Field>
              <div className="flex flex-col justify-end gap-2">
                <div className="text-xs text-text-muted mb-1">Jogosultságok az új tagnak:</div>
                <div className="flex flex-wrap gap-1.5">
                  {permLabels.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setInvitePermissions((p) => ({ ...p, [key]: !p[key] }))}
                      className={`text-xs px-2 py-0.5 rounded-full border transition ${
                        invitePermissions[key]
                          ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300"
                          : "bg-surface-2 border-border text-text-muted"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {inviteMsg && (
              <div className={`mt-2 text-xs ${inviteMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
                {inviteMsg.text}
              </div>
            )}
            <div className="mt-3">
              <SmallButton variant="solid" onClick={handleSendInvite} disabled={inviteLoading}>
                <RefreshCw className={`w-3.5 h-3.5 ${inviteLoading ? "animate-spin" : ""}`} />
                {inviteLoading ? "Küldés…" : "Meghívó küldése"}
              </SmallButton>
            </div>
          </div>
        )}

        {!isOwner && householdMembers.length > 0 && (
          <div className="mt-3 text-xs text-text-muted">
            Csak a háztartás tulajdonosa küldhet meghívókat.
          </div>
        )}

        {membersLoadError && (
          <div className="mt-3 text-xs text-rose-400">
            Tagok betöltési hiba: {membersLoadError}
          </div>
        )}

        {!membersLoadError && householdMembers.length === 0 && (
          <div className="mt-3 text-xs text-text-muted">
            Betöltés folyamatban…
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="text-sm text-text-2">Gyors útmutató</div>
        <div className="text-lg font-semibold">Ajánlott használat</div>

        <ol className="mt-4 space-y-2 text-sm text-text-2 list-decimal list-inside">
          <li>Lépj a <b>Keresők</b> fülre, és állítsd be a 2 (vagy később 3) személyt.</li>
          <li>A <b>Fix tételek</b> fülön add meg a 2026-os fix bevételeket és kiadásokat start: 2026-01, end: 2026-12.</li>
          <li>A <b>Megtakarítás</b> fülön állíts be külön keretet (pl. felújítás), havi tervvel.</li>
          <li>A <b>Dashboard</b> azonnal mutatja a tervezett havi nettót.</li>
          <li>A valós költéseket/bevételeket a <b>Tételek</b> fülön rögzítsd.</li>
        </ol>
      </Card>

      {/* Kategóriák — full width */}
      <Card className="p-5 xl:col-span-2">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-text-2">Rendszerezés</div>
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
            parents={state.categories.filter((c) => c.type === "income" && !c.parentId)}
            childrenOf={(parentId) => state.categories.filter((c) => c.parentId === parentId)}
            addCategory={addCategory}
            updateCategory={updateCategory}
            removeCategory={removeCategory}
          />
          <CategorySection
            title="Kiadás"
            type="expense"
            parents={state.categories.filter((c) => c.type === "expense" && !c.parentId)}
            childrenOf={(parentId) => state.categories.filter((c) => c.parentId === parentId)}
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
            <div className="flex items-center gap-2 p-2 pl-3">
              <button type="button" onClick={() => toggle(parent.id)} className="shrink-0 text-text-muted hover:text-text-2 transition min-w-9 min-h-9 flex items-center justify-center" title={isCollapsed ? "Kinyit" : "Összecsuk"}>
                <ChevronDown className={`w-4 h-4 transition-transform ${isCollapsed ? "-rotate-90" : ""}`} />
              </button>
              <Input value={parent.name} onChange={(e) => updateCategory(parent.id, { name: e.target.value })} className="flex-1 font-medium" />
              <SmallButton variant="ghost" onClick={() => addCategory(type, parent.id)} title="Alkategória hozzáadása">
                <Plus className="w-3 h-3" />
              </SmallButton>
              <ConfirmDelete onConfirm={() => removeCategory(parent.id)} />
            </div>
            {!isCollapsed && hasChildren && (
              <div className="border-t border-border bg-bg">
                {children.map((child) => (
                  <div key={child.id} className="flex items-center gap-2 px-3 py-2 pl-9 border-b border-border last:border-b-0">
                    <span className="text-text-muted text-xs shrink-0">↳</span>
                    <Input value={child.name} onChange={(e) => updateCategory(child.id, { name: e.target.value })} className="flex-1 text-sm" />
                    <ConfirmDelete onConfirm={() => removeCategory(child.id)} />
                  </div>
                ))}
              </div>
            )}
            {!isCollapsed && !hasChildren && (
              <div className="border-t border-border px-9 py-2">
                <button type="button" onClick={() => addCategory(type, parent.id)} className="text-xs text-text-muted hover:text-text-2 transition flex items-center gap-1">
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

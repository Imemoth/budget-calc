import React, { useEffect, useMemo, useRef, useState } from "react";
import { APP_VERSION } from "./lib/version";
import { AnimatePresence, motion } from "framer-motion";
import { uid, monthKey, monthsBetweenInclusive } from "./lib/utils";
import { Wallet, BarChart3, Repeat, PiggyBank, Users, Settings2, Download, Upload, Info, LogOut } from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";
import { AuthScreen } from "./authscreen";
import { loadFullStateForUser, saveStatePatch, deletePerson, deleteCategory, deleteRecurring, deleteTransaction, deleteSavings } from "./dataClient";

// Types
export type { Settings, Person, Category, RecurringItem, Transaction, SavingsBucket, State, MoneyType, TabKey, SeriesRow } from "./types";
import type { Settings, Person, Category, RecurringItem, Transaction, SavingsBucket, State, MoneyType, TabKey } from "./types";

// Components
import { TabButton, SmallButton } from "./components/ui";
import { ChangelogModal } from "./components/ChangelogModal";
import { DashboardView } from "./components/DashboardTab";
import { TransactionsView } from "./components/TransactionsTab";
import { RecurringView } from "./components/RecurringTab";
import { SavingsView } from "./components/SavingsTab";
import { PeopleCategoriesView } from "./components/PeopleTab";
import { SettingsView } from "./components/SettingsTab";

// Domain helpers
import { monthBoundsFromSettings, expandRecurringForMonth, isMonthInRange } from "./lib/domainHelpers";

// -------------------- storage --------------------

const STORAGE_KEY = "household-budget-planner-v1";

const defaultState = (): State => {
  const now = new Date();
  const year = now.getFullYear();
  return {
    settings: { currency: "HUF", horizonMonths: 18, startMonth: monthKey(new Date(year, 0, 1)), theme: "dark-neo" },
    people: [
      { id: uid(), name: "Péter", colorIndex: 0 },
      { id: uid(), name: "Partner", colorIndex: 1 },
    ],
    categories: [
      { id: uid(), name: "Fizetés", type: "income" },
      { id: uid(), name: "Egyéb bevétel", type: "income" },
      { id: uid(), name: "Lakhatás", type: "expense" },
      { id: uid(), name: "Rezsi", type: "expense" },
      { id: uid(), name: "Élelmiszer", type: "expense" },
      { id: uid(), name: "Közlekedés", type: "expense" },
      { id: uid(), name: "Egészség", type: "expense" },
      { id: uid(), name: "Szórakozás", type: "expense" },
      { id: uid(), name: "Előfizetések", type: "expense" },
      { id: uid(), name: "Háziállat", type: "expense" },
      { id: uid(), name: "Felújítás", type: "expense" },
      { id: uid(), name: "Egyéb", type: "expense" },
    ],
    recurring: [],
    transactions: [],
    savings: [
      {
        id: uid(),
        name: "Felújítási keret",
        targetAmount: 0,
        startMonth: monthKey(new Date(year, 0, 1)),
        endMonth: monthKey(new Date(year, 11, 1)),
        monthlyPlanned: 0,
        notes: "",
      },
    ],
  };
};

function useUserLocalState(
  userId: string | null
): [State, React.Dispatch<React.SetStateAction<State>>] {
  const storageKey = userId ? `${STORAGE_KEY}-${userId}` : STORAGE_KEY;

  const load = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return defaultState();
      const parsed = JSON.parse(raw);
      return { ...defaultState(), ...parsed } as State;
    } catch {
      return defaultState();
    }
  };

  const [state, setState] = useState<State>(load);

  useEffect(() => {
    setState(load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // silent fail
    }
  }, [storageKey, state]);

  return [state, setState];
}

// -------------------- Supabase helpers --------------------

async function ensureDefaultHousehold(userId: string): Promise<string> {
  const memberRes = await supabase
    .from("household_members").select("household_id").eq("user_id", userId).limit(1).maybeSingle();
  if (memberRes.error) throw memberRes.error;
  if (memberRes.data?.household_id) return memberRes.data.household_id as string;

  const ownedRes = await supabase
    .from("households").select("id").eq("owner_user_id", userId).limit(1).maybeSingle();
  if (ownedRes.error) throw ownedRes.error;

  let householdId = ownedRes.data?.id as string | undefined;

  if (!householdId) {
    const createRes = await supabase
      .from("households").insert({ owner_user_id: userId, name: "Saját háztartás", currency: "HUF" }).select("id").single();
    if (createRes.error) throw createRes.error;
    householdId = createRes.data.id as string;
  }

  const basePayload = { household_id: householdId!, user_id: userId };
  const withRole = await supabase.from("household_members").insert({ ...basePayload, role: "OWNER" });

  if (withRole.error) {
    const msg = (withRole.error.message || "").toLowerCase();
    if (msg.includes("role") && (msg.includes("column") || msg.includes("does not exist"))) {
      const withoutRole = await supabase.from("household_members").insert(basePayload);
      if (withoutRole.error) throw withoutRole.error;
    } else {
      throw withRole.error;
    }
  }

  return householdId!;
}

// -------------------- main app --------------------

export default function App() {
  const { user, loading } = useAuth();

  const handleLogout = async () => {
    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    if (activeHouseholdId) {
      try { await saveStatePatch(activeHouseholdId, state); } catch (err) { console.error("Logout előtti mentés sikertelen:", err); }
    }
    try { await supabase.auth.signOut(); } catch (e) { console.error(e); }
    finally {
      setTab("dashboard");
      setIsChangelogOpen(false);
      setActiveHouseholdId(null);
      setIsProvisioning(false);
    }
  };

  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const localScopeId = activeHouseholdId ?? user?.id ?? null;
  const [state, setState] = useUserLocalState(localScopeId);
  const [tab, setTab] = useState<TabKey>("dashboard");
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "error">("idle");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
    .split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const [remoteReady, setRemoteReady] = useState(false);

  const { start, end } = useMemo(() => monthBoundsFromSettings(state.settings), [state.settings]);
  const monthList = useMemo(() => monthsBetweenInclusive(start, end).map(monthKey), [start, end]);

  const catById = useMemo(
    () => Object.fromEntries(state.categories.map((c) => [c.id, c])) as Record<string, Category>,
    [state.categories]
  );
  const personById = useMemo(
    () => Object.fromEntries(state.people.map((p) => [p.id, p])) as Record<string, Person>,
    [state.people]
  );

  // 1) Provisioning
  useEffect(() => {
    const userId = user?.id;
    if (!userId) { setActiveHouseholdId(null); setRemoteReady(false); setSavingStatus("idle"); setSaveError(null); return; }
    let cancelled = false;
    (async () => {
      try {
        setIsProvisioning(true);
        const hid = await ensureDefaultHousehold(userId);
        if (!cancelled) setActiveHouseholdId(hid);
      } catch (err) {
        console.error("Household provisioning hiba:", err);
        if (!cancelled) setActiveHouseholdId(null);
      } finally {
        if (!cancelled) setIsProvisioning(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id]);

  // 2) Supabase load
  useEffect(() => {
    if (!activeHouseholdId) return;
    let cancelled = false;
    setRemoteReady(false);
    (async () => {
      try {
        const remote = await loadFullStateForUser(activeHouseholdId);
        if (!cancelled && remote) setState(remote);
      } catch (err) {
        console.error("Nem sikerült betölteni az állapotot Supabase-ből:", err);
      } finally {
        if (!cancelled) setRemoteReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeHouseholdId, setState]);

  // 3) Supabase autosave
  useEffect(() => {
    if (!activeHouseholdId || !remoteReady) return;
    if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = window.setTimeout(async () => {
      try {
        setSavingStatus("saving"); setSaveError(null);
        await saveStatePatch(activeHouseholdId, state);
        setSavingStatus("idle");
      } catch (err) {
        console.error("Nem sikerült menteni Supabase-be:", err);
        setSavingStatus("error"); setSaveError("Nem sikerült menteni Supabase-be.");
      }
    }, 1500);
    return () => { if (saveTimerRef.current != null) window.clearTimeout(saveTimerRef.current); };
  }, [state, activeHouseholdId, remoteReady]);

  useEffect(() => {
    if (!user) { setSavingStatus("idle"); setSaveError(null); setRemoteReady(false); setActiveHouseholdId(null); }
  }, [user]);

  // Computed data
  const plannedByMonth = useMemo(() => {
    const map: Record<string, { income: number; expense: number; savingsPlanned: number }> =
      Object.fromEntries(monthList.map((k) => [k, { income: 0, expense: 0, savingsPlanned: 0 }]));
    for (const rec of state.recurring) {
      for (const k of monthList) {
        const ex = expandRecurringForMonth(rec, k);
        if (!ex) continue;
        if (ex.type === "income") map[k].income += ex.amount;
        else map[k].expense += ex.amount;
      }
    }
    for (const s of state.savings) {
      for (const k of monthList) {
        if (!isMonthInRange(k, s.startMonth, s.endMonth)) continue;
        map[k].savingsPlanned += Number(s.monthlyPlanned) || 0;
      }
    }
    return map;
  }, [state.recurring, state.savings, monthList]);

  const actualByMonth = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> =
      Object.fromEntries(monthList.map((k) => [k, { income: 0, expense: 0 }]));
    for (const t of state.transactions) {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) continue;
      const k = monthKey(d);
      if (!map[k]) continue;
      if (t.type === "income") map[k].income += Number(t.amount) || 0;
      else map[k].expense += Number(t.amount) || 0;
    }
    return map;
  }, [state.transactions, monthList]);

  const dashboardSeries = useMemo(() => {
    return monthList.map((k) => {
      const planned = plannedByMonth[k] || { income: 0, expense: 0, savingsPlanned: 0 };
      const actual = actualByMonth[k] || { income: 0, expense: 0 };
      return {
        month: k,
        plannedIncome: planned.income,
        plannedExpense: planned.expense,
        plannedSavings: planned.savingsPlanned,
        plannedNet: planned.income - planned.expense - planned.savingsPlanned,
        actualIncome: actual.income,
        actualExpense: actual.expense,
        actualNet: actual.income - actual.expense,
      };
    });
  }, [monthList, plannedByMonth, actualByMonth]);

  const [focusMonth, setFocusMonth] = useState(() =>
    monthList.length ? monthList[monthList.length - 1] : monthKey(new Date())
  );
  useEffect(() => {
    if (!monthList.length) return;
    if (!focusMonth || !monthList.includes(focusMonth)) setFocusMonth(monthList[monthList.length - 1]);
  }, [monthList, focusMonth]);

  const categoryBreakdown = useMemo(() => {
    const items = state.transactions.filter((t) => {
      const d = new Date(t.date);
      return !Number.isNaN(d.getTime()) && monthKey(d) === focusMonth && t.type === "expense";
    });
    const sums = new Map<string, number>();
    for (const t of items) {
      const key = t.categoryId || "uncat";
      sums.set(key, (sums.get(key) || 0) + (Number(t.amount) || 0));
    }
    const out = Array.from(sums.entries()).map(([cid, value]) => ({
      category: cid === "uncat" ? "Nincs kategória" : catById[cid]?.name || "Ismeretlen",
      value,
    }));
    out.sort((a, b) => b.value - a.value);
    return out;
  }, [state.transactions, focusMonth, catById]);

  const incomeCategoryBreakdown = useMemo(() => {
    const items = state.transactions.filter((t) => {
      const d = new Date(t.date);
      return !Number.isNaN(d.getTime()) && monthKey(d) === focusMonth && t.type === "income";
    });
    const sums = new Map<string, number>();
    for (const t of items) {
      const key = t.categoryId || "uncat";
      sums.set(key, (sums.get(key) || 0) + (Number(t.amount) || 0));
    }
    const out = Array.from(sums.entries()).map(([cid, value]) => ({
      category: cid === "uncat" ? "Nincs kategória" : catById[cid]?.name || "Ismeretlen",
      value,
    }));
    out.sort((a, b) => b.value - a.value);
    return out;
  }, [state.transactions, focusMonth, catById]);

  const peopleIncomePlanned = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of state.people) map.set(p.id, 0);
    for (const rec of state.recurring) {
      if (!rec.enabled || rec.type !== "income" || !rec.personId) continue;
      for (const k of monthList) {
        const ex = expandRecurringForMonth(rec, k);
        if (!ex) continue;
        map.set(rec.personId, (map.get(rec.personId) || 0) + ex.amount);
      }
    }
    return Array.from(map.entries()).map(([pid, value]) => ({
      name: personById[pid]?.name || "Ismeretlen",
      value,
    }));
  }, [state.recurring, state.people, monthList, personById]);

  // -------------------- actions --------------------

  const updateSettings = (patch: Partial<Settings>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const addPerson = () =>
    setState((s) => ({
      ...s,
      people: [...s.people, { id: uid(), name: `Személy ${s.people.length + 1}`, colorIndex: s.people.length }],
    }));

  const updatePerson = (id: string, patch: Partial<Person>) =>
    setState((s) => ({ ...s, people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)) }));

  const removePerson = async (id: string) => {
    setState((s) => ({
      ...s,
      people: s.people.filter((p) => p.id !== id),
      recurring: s.recurring.map((r) => r.personId === id ? { ...r, personId: null } : r),
      transactions: s.transactions.map((t) => t.personId === id ? { ...t, personId: null } : t),
    }));
    if (activeHouseholdId) {
      try { await deletePerson(id); } catch (err) { console.error("Nem sikerült törölni a személyt a DB-ből:", err); }
    }
  };

  const addCategory = (type: MoneyType) =>
    setState((s) => ({
      ...s,
      categories: [...s.categories, { id: uid(), name: type === "income" ? "Új bevétel kategória" : "Új kiadás kategória", type }],
    }));

  const updateCategory = (id: string, patch: Partial<Category>) =>
    setState((s) => ({ ...s, categories: s.categories.map((c) => c.id === id ? { ...c, ...patch } : c) }));

  const removeCategory = async (id: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      recurring: s.recurring.map((r) => r.categoryId === id ? { ...r, categoryId: null } : r),
      transactions: s.transactions.map((t) => t.categoryId === id ? { ...t, categoryId: null } : t),
    }));
    if (activeHouseholdId) {
      try { await deleteCategory(id); } catch (err) { console.error("Nem sikerült törölni a kategóriát a DB-ből:", err); }
    }
  };

  const addRecurring = (type: MoneyType) =>
    setState((s) => ({
      ...s,
      recurring: [...s.recurring, {
        id: uid(),
        name: type === "income" ? "Fix bevétel" : "Fix kiadás",
        amount: 0, type,
        categoryId: s.categories.find((c) => c.type === type)?.id || null,
        cadence: "monthly",
        startMonth: monthKey(new Date(new Date().getFullYear(), 0, 1)),
        endMonth: null, dayOfMonth: 5, personId: null, enabled: true, notes: "",
      }],
    }));

  const updateRecurring = (id: string, patch: Partial<RecurringItem>) =>
    setState((s) => ({ ...s, recurring: s.recurring.map((r) => r.id === id ? { ...r, ...patch } : r) }));

  const removeRecurring = async (id: string) => {
    setState((s) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) }));
    if (activeHouseholdId) {
      try { await deleteRecurring(id); } catch (err) { console.error("Nem sikerült törölni a fix tételt a DB-ből:", err); }
    }
  };

  const addTransaction = () =>
    setState((s) => ({
      ...s,
      transactions: [{
        id: uid(),
        date: new Date().toISOString().slice(0, 10),
        name: "Új tétel", amount: 0, type: "expense",
        categoryId: s.categories.find((c) => c.type === "expense")?.id || null,
        personId: null, notes: "",
      }, ...s.transactions],
    }));

  const updateTransaction = (id: string, patch: Partial<Transaction>) =>
    setState((s) => ({ ...s, transactions: s.transactions.map((t) => t.id === id ? { ...t, ...patch } : t) }));

  const removeTransaction = async (id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
    if (activeHouseholdId) {
      try { await deleteTransaction(id); } catch (err) { console.error("Nem sikerült törölni a tranzakciót a DB-ből:", err); }
    }
  };

  const addSavings = () =>
    setState((s) => ({
      ...s,
      savings: [...s.savings, {
        id: uid(),
        name: `Megtakarítás ${s.savings.length + 1}`,
        targetAmount: 0,
        startMonth: monthKey(new Date(new Date().getFullYear(), 0, 1)),
        endMonth: monthKey(new Date(new Date().getFullYear(), 11, 1)),
        monthlyPlanned: 0, notes: "",
      }],
    }));

  const updateSavings = (id: string, patch: Partial<SavingsBucket>) =>
    setState((s) => ({ ...s, savings: s.savings.map((x) => x.id === id ? { ...x, ...patch } : x) }));

  const removeSavings = async (id: string) => {
    setState((s) => ({ ...s, savings: s.savings.filter((x) => x.id !== id) }));
    if (activeHouseholdId) {
      try { await deleteSavings(id); } catch (err) { console.error("Nem sikerült törölni a megtakarítást a DB-ből:", err); }
    }
  };

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haztartasi_koltsegvetes_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      setImportError(null);
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") { setImportError("A kiválasztott fájl nem érvényes JSON struktúra."); return; }
      setState({ ...defaultState(), ...parsed } as State);
    } catch (err) {
      console.error("Nem sikerült importálni a JSON fájlt:", err);
      setImportError("Nem sikerült beolvasni a JSON fájlt. Ellenőrizd, hogy érvényes Budget Planner export-e.");
    }
  };

  const quickCreateYearTemplate = (year: number) => {
    const startK = `${year}-01`;
    const endK = `${year}-12`;
    setState((s) => {
      const incomeCat = s.categories.find((c) => c.type === "income")?.id ?? null;
      const expenseCat = s.categories.find((c) => c.type === "expense")?.id ?? null;
      const housingCat = s.categories.find((c) => c.type === "expense" && c.name.toLowerCase().includes("lakhat"))?.id ?? expenseCat;
      const subsCat = s.categories.find((c) => c.type === "expense" && c.name.toLowerCase().includes("előfiz"))?.id ?? expenseCat;
      const p1 = s.people[0]?.id ?? null;
      const p2 = s.people[1]?.id ?? null;
      const items: RecurringItem[] = [
        { id: uid(), name: `${year} – Fizetés (1)`, amount: 0, type: "income", categoryId: incomeCat, cadence: "monthly", startMonth: startK, endMonth: endK, dayOfMonth: 5, personId: p1, enabled: true, notes: "" },
        { id: uid(), name: `${year} – Fizetés (2)`, amount: 0, type: "income", categoryId: incomeCat, cadence: "monthly", startMonth: startK, endMonth: endK, dayOfMonth: 5, personId: p2, enabled: true, notes: "" },
        { id: uid(), name: `${year} – Lakhatás`, amount: 0, type: "expense", categoryId: housingCat, cadence: "monthly", startMonth: startK, endMonth: endK, dayOfMonth: 5, personId: null, enabled: true, notes: "" },
        { id: uid(), name: `${year} – Előfizetések`, amount: 0, type: "expense", categoryId: subsCat, cadence: "monthly", startMonth: startK, endMonth: endK, dayOfMonth: 5, personId: null, enabled: true, notes: "" },
      ];
      return { ...s, recurring: [...items, ...s.recurring] };
    });
  };

  // -------------------- auth gating --------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-sm text-white/60">Betöltés...</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // -------------------- layout --------------------

  return (
    <div className="min-h-screen bg-linear-to-b from-[#0b0f14] via-[#0b0f14] to-black text-white">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/10 border border-white/10 flex items-center justify-center">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xl font-semibold tracking-tight">Háztartási költségvetés</div>
              <div className="text-xs text-white/50">Több kereső • Fix tételek • Megtakarítási keretek • 2026 előretervezés</div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SmallButton variant="ghost" onClick={exportJson} title="Exportálás JSON-ba">
              <Download className="w-3.5 h-3.5" /> Export
            </SmallButton>
            <SmallButton variant="ghost" onClick={() => fileInputRef.current?.click()} title="Importálás korábbi JSON mentésből">
              <Upload className="w-3.5 h-3.5" /> Import
            </SmallButton>
            {isAdmin && (
              <SmallButton variant="danger" onClick={() => {
                if (window.confirm("Biztosan visszaállítod az alkalmazást alapértelmezett állapotra? Minden jelenlegi adat törlődik erről a háztartásról.")) {
                  const storageKey = localScopeId ? `${STORAGE_KEY}-${localScopeId}` : STORAGE_KEY;
                  try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
                  setState(defaultState());
                }
              }} title="Alaphelyzetbe állítás">
                Reset
              </SmallButton>
            )}
            {user && (
              <div className="hidden md:flex items-center gap-2 pl-2 ml-2 border-l border-white/10">
                <div className="text-xs text-white/50 max-w-55 truncate" title={user.email ?? ""}>{user.email}</div>
                <SmallButton variant="ghost" onClick={handleLogout} title="Kijelentkezés">
                  <LogOut className="w-3.5 h-3.5" /> Kilépés
                </SmallButton>
              </div>
            )}
            {user && (
              <div className="md:hidden">
                <SmallButton variant="ghost" onClick={handleLogout} title="Kijelentkezés">
                  <LogOut className="w-3.5 h-3.5" />
                </SmallButton>
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="application/json" className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
          </div>
        </div>

        {importError && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5" />
            <div className="flex-1">
              {importError}
              <button type="button" className="ml-3 underline decoration-rose-300/80 hover:decoration-rose-100" onClick={() => setImportError(null)}>Bezár</button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          <TabButton active={tab === "dashboard"} onClick={() => setTab("dashboard")} icon={BarChart3}>Dashboard</TabButton>
          <TabButton active={tab === "transactions"} onClick={() => setTab("transactions")} icon={Wallet}>Tételek</TabButton>
          <TabButton active={tab === "recurring"} onClick={() => setTab("recurring")} icon={Repeat}>Fix tételek</TabButton>
          <TabButton active={tab === "savings"} onClick={() => setTab("savings")} icon={PiggyBank}>Megtakarítás</TabButton>
          <TabButton active={tab === "people"} onClick={() => setTab("people")} icon={Users}>Keresők & kategóriák</TabButton>
          <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={Settings2}>Beállítások</TabButton>
        </div>

        {/* Content */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {tab === "dashboard" && (
              <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <DashboardView monthList={monthList} focusMonth={focusMonth} setFocusMonth={setFocusMonth}
                  series={dashboardSeries} categoryBreakdown={categoryBreakdown}
                  incomeCategoryBreakdown={incomeCategoryBreakdown} peopleIncomePlanned={peopleIncomePlanned}
                  currency={state.settings.currency} />
              </motion.div>
            )}
            {tab === "transactions" && (
              <motion.div key="tx" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <TransactionsView state={state} setTab={setTab} addTransaction={addTransaction}
                  updateTransaction={updateTransaction} removeTransaction={removeTransaction} />
              </motion.div>
            )}
            {tab === "recurring" && (
              <motion.div key="rec" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <RecurringView state={state} addRecurring={addRecurring} updateRecurring={updateRecurring}
                  removeRecurring={removeRecurring} quickCreateYearTemplate={quickCreateYearTemplate} />
              </motion.div>
            )}
            {tab === "savings" && (
              <motion.div key="sav" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <SavingsView state={state} addSavings={addSavings} updateSavings={updateSavings} removeSavings={removeSavings} />
              </motion.div>
            )}
            {tab === "people" && (
              <motion.div key="people" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <PeopleCategoriesView state={state} addPerson={addPerson} updatePerson={updatePerson} removePerson={removePerson}
                  addCategory={addCategory} updateCategory={updateCategory} removeCategory={removeCategory} />
              </motion.div>
            )}
            {tab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => setIsChangelogOpen(true)}
                    className="text-xs text-white/50 hover:text-white/80 underline underline-offset-4">
                    v{APP_VERSION} – frissítések megtekintése
                  </button>
                </div>
                <SettingsView settings={state.settings} updateSettings={updateSettings} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ChangelogModal open={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />

        {/* Footer */}
        <div className="mt-10 text-[11px] text-white/40 space-y-1">
          <div>Tipp: a fix tételeket a "Fix tételek" fülön vedd fel, és állítsd be a start/end hónapot. Így a 2026-os bevételek/kiadások előre modellezhetők a dashboardon.</div>
          {user && (
            <div>
              {isProvisioning && "Household előkészítés..."}
              {!isProvisioning && activeHouseholdId && !remoteReady && "Betöltés Supabase-ből..."}
              {!isProvisioning && activeHouseholdId && remoteReady && savingStatus === "saving" && "Mentés Supabase-be..."}
              {!isProvisioning && activeHouseholdId && remoteReady && savingStatus === "idle" && !saveError && "Mentve Supabase-be."}
              {!isProvisioning && activeHouseholdId && remoteReady && savingStatus === "error" && (
                <span className="text-rose-300">Nem sikerült menteni Supabase-be – az adataid most csak a böngészőben vannak elmentve.</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

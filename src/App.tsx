import React, { useEffect, useMemo, useRef, useState } from "react";
import { APP_VERSION, CHANGELOG } from "./lib/version";
import { AnimatePresence, motion } from "framer-motion";
import { uid, monthKey, parseMonthKey, addMonths, monthsBetweenInclusive, formatHUF, fmtMoney, clampDateToMonth, percent, roundTo,} from "./lib/utils";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, LineChart, Line, PieChart, Pie, ResponsiveContainer, Cell,} from "recharts";
import { Wallet, BarChart3, Repeat, PiggyBank, Users, Settings2, Plus, Trash2, Download, Upload, ChevronDown, Info, LogOut,} from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";
import { AuthScreen } from "./authscreen";
import {
  loadFullStateForUser,
  saveStatePatch,
  deletePerson,
  deleteCategory,
  deleteRecurring,
  deleteTransaction,
  deleteSavings,
} from "./dataClient";

//-------------------- chart colors --------------------
// Soft, high-contrast palette that works on dark UI
const CHART_COLORS = [
  "#60A5FA", // blue
  "#34D399", // green
  "#F472B6", // pink
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#22D3EE", // cyan
  "#F87171", // red
  "#93C5FD", // light blue
];

/**
 * Household Budget Planner – single-file React app
 * - Multiple earners (1..N people)
 * - Recurring (fixed) incomes/expenses, definable for future years (e.g., 2026)
 * - Optional per-person assignment
 * - Savings buckets/targets
 * - Monthly dashboard + plan vs actual
 * - Local-first (localStorage)
 */

// -------------------- types --------------------

type MoneyType = "income" | "expense";

type TabKey =
  | "dashboard"
  | "transactions"
  | "recurring"
  | "savings"
  | "people"
  | "settings";

type Settings = {
  currency: "HUF" | "EUR" | "USD" | string;
  horizonMonths: number;
  startMonth: string; // YYYY-MM
  theme?: string;
};

type Person = {
  id: string;
  name: string;
  colorIndex: number;
};

type Category = {
  id: string;
  name: string;
  type: MoneyType;
};

type RecurringItem = {
  id: string;
  name: string;
  amount: number;
  type: MoneyType;
  categoryId: string | null;
  cadence: "monthly";
  startMonth: string; // YYYY-MM
  endMonth: string | null; // YYYY-MM | null
  dayOfMonth: number;
  personId: string | null;
  enabled: boolean;
  notes?: string;
};

type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  amount: number;
  type: MoneyType;
  categoryId: string | null;
  personId: string | null;
  notes?: string;
};

type SavingsBucket = {
  id: string;
  name: string;
  targetAmount: number;
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
  monthlyPlanned: number;
  notes?: string;
};

type State = {
  settings: Settings;
  people: Person[];
  categories: Category[];
  recurring: RecurringItem[];
  transactions: Transaction[];
  savings: SavingsBucket[];
};

export type {
  Settings,
  Person,
  Category,
  RecurringItem,
  Transaction,
  SavingsBucket,
  State,
};

// -------------------- storage --------------------

const STORAGE_KEY = "household-budget-planner-v1";

const defaultState = (): State => {
  const now = new Date();
  const year = now.getFullYear();
  return {
    settings: {
      currency: "HUF",
      horizonMonths: 18,
      startMonth: monthKey(new Date(year, 0, 1)),
      theme: "dark-neo",
    },
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

  // csak akkor töltünk újra, ha a storageKey tényleg megváltozik (user váltás)
  useEffect(() => {
    setState(load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  // mentés
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // localStorage nem elérhető (pl. private mode) – silent fail
    }
  }, [storageKey, state]);

  return [state, setState];
}


// -------------------- domain helpers --------------------

// Date/month normalizálás – ha üres vagy invalid, üres string lesz
const normalizeDateInput = (value: string): string => {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
};

const normalizeMonthInput = (value: string): string => {
  if (!value) return "";
  return /^\d{4}-\d{2}$/.test(value) ? value : "";
};

// Számmezők biztonságos parse-ja
const parseNumberInput = (value: string): number => {
  const n = Number((value || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

const parseNonNegativeInput = (value: string): number => {
  const n = parseNumberInput(value);
  return n < 0 ? 0 : n;
};

const isValidMonthKey = (value: string | null | undefined): boolean =>
  !!value && /^\d{4}-\d{2}$/.test(value);

const isMonthInRange = (
  key: string,
  startKey?: string | null,
  endKey?: string | null
) => {
  const m = parseMonthKey(key).getTime();
  const s =
    startKey && isValidMonthKey(startKey)
      ? parseMonthKey(startKey).getTime()
      : -Infinity;
  const e =
    endKey && isValidMonthKey(endKey)
      ? parseMonthKey(endKey).getTime()
      : Infinity;
  return m >= s && m <= e;
};

const expandRecurringForMonth = (rec: RecurringItem, key: string) => {
  if (!rec.enabled) return null;
  if (!isMonthInRange(key, rec.startMonth, rec.endMonth)) return null;
  if (rec.cadence !== "monthly") return null;
  return {
    id: `rec-${rec.id}-${key}`,
    sourceRecurringId: rec.id,
    month: key,
    name: rec.name,
    amount: Number(rec.amount) || 0,
    type: rec.type,
    categoryId: rec.categoryId,
    personId: rec.personId || null,
  };
};

const monthBoundsFromSettings = (settings: Settings) => {
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), 0, 1);

  const start = isValidMonthKey(settings.startMonth)
    ? parseMonthKey(settings.startMonth)
    : defaultStart;

  const rawH = Number(settings.horizonMonths);
  const safeH = Number.isFinite(rawH) ? Math.max(1, Math.min(rawH, 120)) : 18;

  const end = addMonths(start, safeH - 1);
  return { start, end };
};

const dueDateForMonth = (month: string, dayOfMonth: number) => {
  const m = parseMonthKey(month); // YYYY-MM → Date (hó eleje)
  const raw = new Date(m.getFullYear(), m.getMonth(), dayOfMonth);
  const clamped = clampDateToMonth(raw, m); // 31 → 28/29, stb.
  const y = clamped.getFullYear();
  const mm = String(clamped.getMonth() + 1).padStart(2, "0");
  const dd = String(clamped.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
};

// -------------------- changelog modal --------------------

function ChangelogModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const entry = CHANGELOG[APP_VERSION];

  return (
    <div className="fixed inset-0 z-50">
      {/* overlay */}
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Bezárás"
      />
      {/* panel */}
      <div className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#0b0f14] p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-white/50">Verzió</div>
            <div className="text-lg font-semibold">v{APP_VERSION}</div>
            {entry?.date && (
              <div className="text-xs text-white/40 mt-1">{entry.date}</div>
            )}
          </div>

          <SmallButton variant="ghost" onClick={onClose}>
            Bezárás
          </SmallButton>
        </div>

        <div className="mt-4">
          <div className="text-sm text-white/70 mb-2">
            Újdonságok ebben a verzióban
          </div>

          {entry?.changes?.length ? (
            <ul className="space-y-2">
              {(entry.changes as string[]).map((c: string, i: number) => (
                <li key={i} className="text-sm text-white/80 flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-white/40 shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-white/40">
              Nincs bejegyzés ehhez a verzióhoz.
            </div>
          )}

          {/* opcionális: régebbi verziók listája */}
          <div className="mt-5 pt-4 border-t border-white/10">
            <div className="text-xs text-white/50 mb-2">Korábbi verziók</div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CHANGELOG)
                .sort((a, b) => (a < b ? 1 : -1))
                .map((v) => (
                  <span
                    key={v}
                    className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70"
                  >
                    v{v}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------- UI primitives --------------------

const TabButton = ({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={
      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition " +
      (active
        ? "bg-white/10 text-white shadow"
        : "text-white/70 hover:text-white hover:bg-white/5")
    }
  >
    {Icon ? <Icon className="w-4 h-4" /> : null}
    <span>{children}</span>
  </button>
);

const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl bg-white/5 border border-white/10 shadow-sm ${className}`}
  >
    {children}
  </div>
);

const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block">
    <div className="text-xs text-white/60 mb-1 flex items-center gap-2">
      <span>{label}</span>
      {hint ? (
        <span className="text-[10px] text-white/40">{hint}</span>
      ) : null}
    </div>
    {children}
  </label>
);

const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={
      "w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 " +
      (props.className || "")
    }
  />
);

const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={
      "w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10 " +
      (props.className || "")
    }
  />
);

const SmallButton = ({
  variant = "ghost",
  children,
  ...rest
}: {
  variant?: "ghost" | "solid" | "danger";
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const base =
    "px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1";
  const styles =
    variant === "solid"
      ? "bg-white/10 hover:bg-white/15 text-white"
      : variant === "danger"
      ? "bg-red-500/10 hover:bg-red-500/20 text-red-200"
      : "bg-white/0 hover:bg-white/5 text-white/70 hover:text-white";
  return (
    <button className={`${base} ${styles}`} {...rest}>
      {children}
    </button>
  );
};

// -------------------- Supabase helpers (household provisioning) --------------------

/**
 * RLS mellett a mentés/betöltés scope-ja a household.
 * - ha van household_members rekord a usernek -> azt használjuk
 * - különben: owner_user_id alapján keresünk / létrehozunk householdot
 * - végül létrehozzuk a membership-et is
 */
async function ensureDefaultHousehold(userId: string): Promise<string> {
  // 1) Van már membership?
  const memberRes = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (memberRes.error) throw memberRes.error;
  if (memberRes.data?.household_id) return memberRes.data.household_id as string;

  // 2) Van olyan household, ahol ő a tulaj?
  const ownedRes = await supabase
    .from("households")
    .select("id")
    .eq("owner_user_id", userId)
    .limit(1)
    .maybeSingle();

  if (ownedRes.error) throw ownedRes.error;

  let householdId = ownedRes.data?.id as string | undefined;

  // 3) Ha nincs, létrehozunk egyet
  if (!householdId) {
    const createRes = await supabase
      .from("households")
      .insert({
        owner_user_id: userId,
        name: "Saját háztartás",
        currency: "HUF",
      })
      .select("id")
      .single();

    if (createRes.error) throw createRes.error;
    householdId = createRes.data.id as string;
  }

  // 4) Létrehozzuk a membership-et (role csak akkor, ha létezik az oszlop)
  const basePayload: { household_id: string; user_id: string } = {
    household_id: householdId!,
    user_id: userId,
  };

  const withRole = await supabase
    .from("household_members")
    .insert({ ...basePayload, role: "OWNER" });

  if (withRole.error) {
    const msg = (withRole.error.message || "").toLowerCase();
    // ha a 'role' oszlop nem létezik, újrapróbáljuk role nélkül
    if (msg.includes("role") && (msg.includes("column") || msg.includes("does not exist"))) {
      const withoutRole = await supabase
        .from("household_members")
        .insert(basePayload);
      if (withoutRole.error) throw withoutRole.error;
    } else {
      throw withRole.error;
    }
  }

  return householdId!;
}

// -------------------- main app --------------------

export default function App() {
  const { user, loading, } = useAuth();

const handleLogout = async () => {
  // Pending autosave flush: cancel the debounce timer and save immediately
  if (saveTimerRef.current != null) {
    window.clearTimeout(saveTimerRef.current);
    saveTimerRef.current = null;
  }
  if (activeHouseholdId) {
    try {
      await saveStatePatch(activeHouseholdId, state);
    } catch (err) {
      console.error("Logout előtti mentés sikertelen:", err);
    }
  }
  try {
    await supabase.auth.signOut();
  } catch (e) {
    console.error(e);
  } finally {
    setTab("dashboard");
    setIsChangelogOpen(false);
    setActiveHouseholdId(null);
    setIsProvisioning(false);
  }
};

  // -------------------- household provisioning (RLS scope) --------------------
  // Bejelentkezés után megkeressük / létrehozzuk a user aktív householdját,
  // és csak ezután fut a Supabase load/save (race condition ellen).
  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);

  // A localStorage kulcsot is household-szintre igazítjuk (fallback marad hibák esetén).
  const localScopeId = activeHouseholdId ?? user?.id ?? null;
  const [state, setState] = useUserLocalState(localScopeId);

  const [tab, setTab] = useState<TabKey>("dashboard");
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  // Supabase sync státusz
  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "error">(
    "idle"
  );
  const [saveError, setSaveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

   // admin email lista .env-ből (pl: VITE_ADMIN_EMAILS="a@b.com,c@d.com")
  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
    .split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean);

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  // jelzi, hogy a remote load már lefutott (akár sikerrel, akár hibával)
  const [remoteReady, setRemoteReady] = useState(false);

  const { start, end } = useMemo(
    () => monthBoundsFromSettings(state.settings),
    [state.settings]
  );
  const monthList = useMemo(
    () => monthsBetweenInclusive(start, end).map(monthKey),
    [start, end]
  );


  // Quick lookup maps
  const catById = useMemo(
    () =>
      Object.fromEntries(state.categories.map((c) => [c.id, c])) as Record<
        string,
        Category
      >,
    [state.categories]
  );
  const personById = useMemo(
    () =>
      Object.fromEntries(state.people.map((p) => [p.id, p])) as Record<
        string,
        Person
      >,
    [state.people]
  );

  // 1) Provisioning: activeHouseholdId beállítása (RLS-hez szükséges scope)
  useEffect(() => {
    const userId = user?.id;

    // kijelentkezés / nincs session
    if (!userId) {
      setActiveHouseholdId(null);
      setRemoteReady(false);
      setSavingStatus("idle");
      setSaveError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        setIsProvisioning(true);
        const hid = await ensureDefaultHousehold(userId);
        if (cancelled) return;
        setActiveHouseholdId(hid);
      } catch (err) {
        console.error("Household provisioning hiba:", err);
        if (cancelled) return;
        setActiveHouseholdId(null);
      } finally {
        if (!cancelled) setIsProvisioning(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  // 2) Supabase: load state (csak ha már van activeHouseholdId)
  useEffect(() => {
    if (!activeHouseholdId) return;

    let cancelled = false;
    setRemoteReady(false); // új household -> új load

    (async () => {
      try {
        const remote = await loadFullStateForUser(activeHouseholdId);
        if (cancelled || !remote) return;
        setState(remote);
      } catch (err) {
        console.error("Nem sikerült betölteni az állapotot Supabase-ből:", err);
        // localStorage-ből marad az állapot
      } finally {
        if (!cancelled) setRemoteReady(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [activeHouseholdId, setState]);

  // 3) Supabase: autosave (debounce) – csak ha van activeHouseholdId és a load már lefutott
  useEffect(() => {
    if (!activeHouseholdId) return;
    if (!remoteReady) return; // ne írjunk rá a remote-ra load előtt

    if (saveTimerRef.current != null) {
      window.clearTimeout(saveTimerRef.current);
    }

    saveTimerRef.current = window.setTimeout(async () => {
      try {
        setSavingStatus("saving");
        setSaveError(null);
        // Fontos: householdId-vel mentünk, nem userId-vel
        await saveStatePatch(activeHouseholdId, state);
        setSavingStatus("idle");
      } catch (err) {
        console.error("Nem sikerült menteni Supabase-be:", err);
        setSavingStatus("error");
        setSaveError("Nem sikerült menteni Supabase-be.");
      }
    }, 1500);

    return () => {
      if (saveTimerRef.current != null) {
        window.clearTimeout(saveTimerRef.current);
      }
    };
  }, [state, activeHouseholdId, remoteReady]);

  // ha kijelentkezik a user, töröljük a státuszt
  useEffect(() => {
    if (!user) {
      setSavingStatus("idle");
      setSaveError(null);
      setRemoteReady(false);
      setActiveHouseholdId(null);
    }
  }, [user]);

  // Expand recurring entries into plan per month
  const plannedByMonth = useMemo(() => {
    const map: Record<
      string,
      { income: number; expense: number; savingsPlanned: number }
    > = Object.fromEntries(
      monthList.map((k) => [k, { income: 0, expense: 0, savingsPlanned: 0 }])
    );

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

  // Actuals per month from transactions
  const actualByMonth = useMemo(() => {
    const map: Record<string, { income: number; expense: number }> =
      Object.fromEntries(
        monthList.map((k) => [k, { income: 0, expense: 0 }])
      );
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
      const planned = plannedByMonth[k] || {
        income: 0,
        expense: 0,
        savingsPlanned: 0,
      };
      const actual = actualByMonth[k] || { income: 0, expense: 0 };
      const plannedNet =
        planned.income - planned.expense - planned.savingsPlanned;
      const actualNet = actual.income - actual.expense;
      return {
        month: k,
        plannedIncome: planned.income,
        plannedExpense: planned.expense,
        plannedSavings: planned.savingsPlanned,
        plannedNet,
        actualIncome: actual.income,
        actualExpense: actual.expense,
        actualNet,
      };
    });
  }, [monthList, plannedByMonth, actualByMonth]);

  // Focus month
  const [focusMonth, setFocusMonth] = useState(() =>
    monthList.length ? monthList[monthList.length - 1] : monthKey(new Date())
  );

  useEffect(() => {
    if (!monthList.length) return;

    // ha nincs beállítva vagy kiesett az idősávból → állítsuk a legutolsóra
    if (!focusMonth || !monthList.includes(focusMonth)) {
      setFocusMonth(monthList[monthList.length - 1]);
    }
  }, [monthList, focusMonth]);

  // Category breakdown (expense) for selected month
  const categoryBreakdown = useMemo(() => {
    const items = state.transactions.filter((t) => {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return false;
      return monthKey(d) === focusMonth && t.type === "expense";
    });
    const sums = new Map<string, number>();
    for (const t of items) {
      const key = t.categoryId || "uncat";
      sums.set(key, (sums.get(key) || 0) + (Number(t.amount) || 0));
    }
    const out = Array.from(sums.entries()).map(([cid, value]) => ({
      category:
        cid === "uncat" ? "Nincs kategória" : catById[cid]?.name || "Ismeretlen",
      value,
    }));
    out.sort((a, b) => b.value - a.value);
    return out;
  }, [state.transactions, focusMonth, catById]);

  // Category breakdown (income) for selected month
  const incomeCategoryBreakdown = useMemo(() => {
    const items = state.transactions.filter((t) => {
      const d = new Date(t.date);
      if (Number.isNaN(d.getTime())) return false;
      return monthKey(d) === focusMonth && t.type === "income";
    });
    const sums = new Map<string, number>();
    for (const t of items) {
      const key = t.categoryId || "uncat";
      sums.set(key, (sums.get(key) || 0) + (Number(t.amount) || 0));
    }
    const out = Array.from(sums.entries()).map(([cid, value]) => ({
      category:
        cid === "uncat" ? "Nincs kategória" : catById[cid]?.name || "Ismeretlen",
      value,
    }));
    out.sort((a, b) => b.value - a.value);
    return out;
  }, [state.transactions, focusMonth, catById]);

  // -------------------- actions --------------------

  const updateSettings = (patch: Partial<Settings>) =>
    setState((s) => ({ ...s, settings: { ...s.settings, ...patch } }));

  const addPerson = () =>
    setState((s) => ({
      ...s,
      people: [
        ...s.people,
        {
          id: uid(),
          name: `Személy ${s.people.length + 1}`,
          colorIndex: s.people.length,
        },
      ],
    }));

  const updatePerson = (id: string, patch: Partial<Person>) =>
    setState((s) => ({
      ...s,
      people: s.people.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    }));

  const removePerson = async (id: string) => {
    setState((s) => ({
      ...s,
      people: s.people.filter((p) => p.id !== id),
      recurring: s.recurring.map((r) =>
        r.personId === id ? { ...r, personId: null } : r
      ),
      transactions: s.transactions.map((t) =>
        t.personId === id ? { ...t, personId: null } : t
      ),
    }));
    if (activeHouseholdId) {
      try {
        await deletePerson(id);
      } catch (err) {
        console.error("Nem sikerült törölni a személyt a DB-ből:", err);
      }
    }
  };

  const addCategory = (type: MoneyType) =>
    setState((s) => ({
      ...s,
      categories: [
        ...s.categories,
        {
          id: uid(),
          name:
            type === "income"
              ? "Új bevétel kategória"
              : "Új kiadás kategória",
          type,
        },
      ],
    }));

  const updateCategory = (id: string, patch: Partial<Category>) =>
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) =>
        c.id === id ? { ...c, ...patch } : c
      ),
    }));

  const removeCategory = async (id: string) => {
    setState((s) => ({
      ...s,
      categories: s.categories.filter((c) => c.id !== id),
      recurring: s.recurring.map((r) =>
        r.categoryId === id ? { ...r, categoryId: null } : r
      ),
      transactions: s.transactions.map((t) =>
        t.categoryId === id ? { ...t, categoryId: null } : t
      ),
    }));
    if (activeHouseholdId) {
      try {
        await deleteCategory(id);
      } catch (err) {
        console.error("Nem sikerült törölni a kategóriát a DB-ből:", err);
      }
    }
  };

  const addRecurring = (type: MoneyType) =>
    setState((s) => ({
      ...s,
      recurring: [
        ...s.recurring,
        {
          id: uid(),
          name: type === "income" ? "Fix bevétel" : "Fix kiadás",
          amount: 0,
          type,
          categoryId: s.categories.find((c) => c.type === type)?.id || null,
          cadence: "monthly",
          startMonth: monthKey(new Date(new Date().getFullYear(), 0, 1)),
          endMonth: null,
          dayOfMonth: 5,
          personId: null,
          enabled: true,
          notes: "",
        },
      ],
    }));

  const updateRecurring = (id: string, patch: Partial<RecurringItem>) =>
    setState((s) => ({
      ...s,
      recurring: s.recurring.map((r) =>
        r.id === id ? { ...r, ...patch } : r
      ),
    }));

  const removeRecurring = async (id: string) => {
    setState((s) => ({
      ...s,
      recurring: s.recurring.filter((r) => r.id !== id),
    }));
    if (activeHouseholdId) {
      try {
        await deleteRecurring(id);
      } catch (err) {
        console.error("Nem sikerült törölni a fix tételt a DB-ből:", err);
      }
    }
  };

  const addTransaction = () =>
    setState((s) => ({
      ...s,
      transactions: [
        {
          id: uid(),
          date: new Date().toISOString().slice(0, 10),
          name: "Új tétel",
          amount: 0,
          type: "expense",
          categoryId:
            s.categories.find((c) => c.type === "expense")?.id || null,
          personId: null,
          notes: "",
        },
        ...s.transactions,
      ],
    }));

  const updateTransaction = (id: string, patch: Partial<Transaction>) =>
    setState((s) => ({
      ...s,
      transactions: s.transactions.map((t) =>
        t.id === id ? { ...t, ...patch } : t
      ),
    }));

  const removeTransaction = async (id: string) => {
    setState((s) => ({
      ...s,
      transactions: s.transactions.filter((t) => t.id !== id),
    }));
    if (activeHouseholdId) {
      try {
        await deleteTransaction(id);
      } catch (err) {
        console.error("Nem sikerült törölni a tranzakciót a DB-ből:", err);
      }
    }
  };

  const addSavings = () =>
    setState((s) => ({
      ...s,
      savings: [
        ...s.savings,
        {
          id: uid(),
          name: `Megtakarítás ${s.savings.length + 1}`,
          targetAmount: 0,
          startMonth: monthKey(new Date(new Date().getFullYear(), 0, 1)),
          endMonth: monthKey(new Date(new Date().getFullYear(), 11, 1)),
          monthlyPlanned: 0,
          notes: "",
        },
      ],
    }));

  const updateSavings = (id: string, patch: Partial<SavingsBucket>) =>
    setState((s) => ({
      ...s,
      savings: s.savings.map((x) =>
        x.id === id ? { ...x, ...patch } : x
      ),
    }));

  const removeSavings = async (id: string) => {
    setState((s) => ({
      ...s,
      savings: s.savings.filter((x) => x.id !== id),
    }));
    if (activeHouseholdId) {
      try {
        await deleteSavings(id);
      } catch (err) {
        console.error("Nem sikerült törölni a megtakarítást a DB-ből:", err);
      }
    }
  };

  // Export / Import
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const exportJson = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `haztartasi_koltsegvetes_${new Date()
      .toISOString()
      .slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importJson = async (file: File) => {
    try {
      setImportError(null);
      const text = await file.text();
      const parsed = JSON.parse(text);
      if (!parsed || typeof parsed !== "object") {
        setImportError("A kiválasztott fájl nem érvényes JSON struktúra.");
        return;
      }
      setState({ ...defaultState(), ...parsed } as State);
    } catch (err) {
      console.error("Nem sikerült importálni a JSON fájlt:", err);
      setImportError(
        "Nem sikerült beolvasni a JSON fájlt. Ellenőrizd, hogy érvényes Budget Planner export-e."
      );
    }
  };

  // Bulk helper: set up a full year's recurring items quickly
  const quickCreateYearTemplate = (year: number) => {
    const startK = `${year}-01`;
    const endK = `${year}-12`;

    setState((s) => {
      const incomeCat = s.categories.find((c) => c.type === "income")?.id ?? null;
      const expenseCat = s.categories.find((c) => c.type === "expense")?.id ?? null;

      const housingCat =
        s.categories.find(
          (c) =>
            c.type === "expense" && c.name.toLowerCase().includes("lakhat")
        )?.id ?? expenseCat;

      const subsCat =
        s.categories.find(
          (c) =>
            c.type === "expense" &&
            c.name.toLowerCase().includes("előfiz")
        )?.id ?? expenseCat;

      const p1 = s.people[0]?.id ?? null;
      const p2 = s.people[1]?.id ?? null;

      const items: RecurringItem[] = [
        {
          id: uid(),
          name: `${year} – Fizetés (1)`,
          amount: 0,
          type: "income",
          categoryId: incomeCat,
          cadence: "monthly",
          startMonth: startK,
          endMonth: endK,
          dayOfMonth: 5,
          personId: p1,
          enabled: true,
          notes: "",
        },
        {
          id: uid(),
          name: `${year} – Fizetés (2)`,
          amount: 0,
          type: "income",
          categoryId: incomeCat,
          cadence: "monthly",
          startMonth: startK,
          endMonth: endK,
          dayOfMonth: 5,
          personId: p2,
          enabled: true,
          notes: "",
        },
        {
          id: uid(),
          name: `${year} – Lakhatás`,
          amount: 0,
          type: "expense",
          categoryId: housingCat,
          cadence: "monthly",
          startMonth: startK,
          endMonth: endK,
          dayOfMonth: 5,
          personId: null,
          enabled: true,
          notes: "",
        },
        {
          id: uid(),
          name: `${year} – Előfizetések`,
          amount: 0,
          type: "expense",
          categoryId: subsCat,
          cadence: "monthly",
          startMonth: startK,
          endMonth: endK,
          dayOfMonth: 5,
          personId: null,
          enabled: true,
          notes: "",
        },
      ];

      // új elemek felülre kerülnek (mint az addTransaction nálad)
      return { ...s, recurring: [...items, ...s.recurring] };
    });
  };

  // -------------------- derived views --------------------

  const peopleIncomePlanned = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of state.people) map.set(p.id, 0);
    for (const rec of state.recurring) {
      if (!rec.enabled || rec.type !== "income") continue;
      if (!rec.personId) continue;
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

  // -------------------- auth gating --------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-sm text-white/60">Betöltés...</div>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

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
              <div className="text-xl font-semibold tracking-tight">
                Háztartási költségvetés
              </div>
              <div className="text-xs text-white/50">
                Több kereső • Fix tételek • Megtakarítási keretek • 2026
                előretervezés
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <SmallButton
              variant="ghost"
              onClick={exportJson}
              title="Exportálás JSON-ba"
            >
              <Download className="w-3.5 h-3.5" /> Export
            </SmallButton>
            <SmallButton
              variant="ghost"
              onClick={() => fileInputRef.current?.click()}
              title="Importálás korábbi JSON mentésből"
            >
              <Upload className="w-3.5 h-3.5" /> Import
            </SmallButton>
            {isAdmin && (
              <SmallButton
                variant="danger"
                onClick={() => {
                  if (
                    window.confirm(
                      "Biztosan visszaállítod az alkalmazást alapértelmezett állapotra? Minden jelenlegi adat törlődik erről a háztartásról."
                    )
                  ) {
                    const storageKey = localScopeId
                      ? `${STORAGE_KEY}-${localScopeId}`
                      : STORAGE_KEY;
                    try {
                      localStorage.removeItem(storageKey);
                    } catch {
                      // ignore
                    }
                    setState(defaultState());
                  }
                }}
                title="Alaphelyzetbe állítás"
              >
                Reset
              </SmallButton>
            )}

            {/* user info + logout */}
            {user && (
              <div className="hidden md:flex items-center gap-2 pl-2 ml-2 border-l border-white/10">
                <div className="text-xs text-white/50 max-w-55 truncate" title={user.email ?? ""}>
                  {user.email}
                </div>
                <SmallButton variant="ghost" onClick={handleLogout} title="Kijelentkezés">
                  <LogOut className="w-3.5 h-3.5" /> Kilépés
                </SmallButton>
              </div>
            )}

            {/* mobilon csak ikon/gomb */}
            {user && (
              <div className="md:hidden">
                <SmallButton variant="ghost" onClick={handleLogout} title="Kijelentkezés">
                  <LogOut className="w-3.5 h-3.5" />
                </SmallButton>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importJson(f);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        {importError && (
          <div className="mt-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 flex items-start gap-2">
            <Info className="w-3.5 h-3.5 mt-0.5" />
            <div className="flex-1">
              {importError}
              <button
                type="button"
                className="ml-3 underline decoration-rose-300/80 hover:decoration-rose-100"
                onClick={() => setImportError(null)}
              >
                Bezár
              </button>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mt-6 flex flex-wrap gap-2">
          <TabButton
            active={tab === "dashboard"}
            onClick={() => setTab("dashboard")}
            icon={BarChart3}
          >
            Dashboard
          </TabButton>
          <TabButton
            active={tab === "transactions"}
            onClick={() => setTab("transactions")}
            icon={Wallet}
          >
            Tételek
          </TabButton>
          <TabButton
            active={tab === "recurring"}
            onClick={() => setTab("recurring")}
            icon={Repeat}
          >
            Fix tételek
          </TabButton>
          <TabButton
            active={tab === "savings"}
            onClick={() => setTab("savings")}
            icon={PiggyBank}
          >
            Megtakarítás
          </TabButton>
          <TabButton
            active={tab === "people"}
            onClick={() => setTab("people")}
            icon={Users}
          >
            Keresők & kategóriák
          </TabButton>
          <TabButton
            active={tab === "settings"}
            onClick={() => setTab("settings")}
            icon={Settings2}
          >
            Beállítások
          </TabButton>
        </div>

        {/* Content */}
        <div className="mt-6">
          <AnimatePresence mode="wait">
            {tab === "dashboard" && (
              <motion.div
                key="dash"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <DashboardView
                  monthList={monthList}
                  focusMonth={focusMonth}
                  setFocusMonth={setFocusMonth}
                  series={dashboardSeries}
                  categoryBreakdown={categoryBreakdown}
                  incomeCategoryBreakdown={incomeCategoryBreakdown}
                  peopleIncomePlanned={peopleIncomePlanned}
                  currency={state.settings.currency}
                />
              </motion.div>
            )}

            {tab === "transactions" && (
              <motion.div
                key="tx"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <TransactionsView
                  state={state}
                  setTab={setTab}
                  addTransaction={addTransaction}
                  updateTransaction={updateTransaction}
                  removeTransaction={removeTransaction}
                />
              </motion.div>
            )}

            {tab === "recurring" && (
              <motion.div
                key="rec"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <RecurringView
                  state={state}
                  addRecurring={addRecurring}
                  updateRecurring={updateRecurring}
                  removeRecurring={removeRecurring}
                  quickCreateYearTemplate={quickCreateYearTemplate}
                />
              </motion.div>
            )}

            {tab === "savings" && (
              <motion.div
                key="sav"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <SavingsView
                  state={state}
                  addSavings={addSavings}
                  updateSavings={updateSavings}
                  removeSavings={removeSavings}
                />
              </motion.div>
            )}

            {tab === "people" && (
              <motion.div
                key="people"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <PeopleCategoriesView
                  state={state}
                  addPerson={addPerson}
                  updatePerson={updatePerson}
                  removePerson={removePerson}
                  addCategory={addCategory}
                  updateCategory={updateCategory}
                  removeCategory={removeCategory}
                />
              </motion.div>
            )}

            {tab === "settings" && (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.18 }}
              >
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsChangelogOpen(true)}
                    className="text-xs text-white/50 hover:text-white/80 underline underline-offset-4"
                    title="Kattints a frissítésekhez"
                  >
                    v{APP_VERSION} – frissítések megtekintése
                  </button>
                </div>
                <SettingsView
                  settings={state.settings}
                  updateSettings={updateSettings}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <ChangelogModal
          open={isChangelogOpen}
          onClose={() => setIsChangelogOpen(false)}
        />

        {/* Footer */}
        <div className="mt-10 text-[11px] text-white/40 space-y-1">
          <div>
            Tipp: a fix tételeket a "Fix tételek" fülön vedd fel, és állítsd be
            a start/end hónapot. Így a 2026-os bevételek/kiadások előre
            modellezhetők a dashboardon.
          </div>

          {user && (
            <div>
              {isProvisioning && "Household előkészítés..."}
              {!isProvisioning &&
                activeHouseholdId &&
                !remoteReady &&
                "Betöltés Supabase-ből..."}
              {!isProvisioning &&
                activeHouseholdId &&
                remoteReady &&
                savingStatus === "saving" &&
                "Mentés Supabase-be..."}
              {!isProvisioning &&
                activeHouseholdId &&
                remoteReady &&
                savingStatus === "idle" &&
                !saveError &&
                "Mentve Supabase-be."}
              {!isProvisioning &&
                activeHouseholdId &&
                remoteReady &&
                savingStatus === "error" && (
                  <span className="text-rose-300">
                    Nem sikerült menteni Supabase-be – az adataid most csak a
                    böngészőben vannak elmentve.
                  </span>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// -------------------- Dashboard view --------------------

type SeriesRow = {
  month: string;
  plannedIncome: number;
  plannedExpense: number;
  plannedSavings: number;
  plannedNet: number;
  actualIncome: number;
  actualExpense: number;
  actualNet: number;
};

function DashboardView({
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
  const latest = series.length ? series[series.length - 1] : undefined;
  const current =
    series.find((s) => s.month === focusMonth) ??
    (series.length ? series[0] : undefined);
  const money = (n: number) => fmtMoney(n, currency);

  const totalExpense = categoryBreakdown.reduce(
    (s, x) => s + (x.value || 0),
    0
  );
  const totalIncome = incomeCategoryBreakdown.reduce(
    (s, x) => s + (x.value || 0),
    0
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <div className="xl:col-span-2 space-y-4">
        <Card className="p-5">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <div className="text-sm text-white/60">Idősáv</div>
              <div className="text-lg font-semibold">Tervezett vs. Tényleges</div>
            </div>
            <div className="flex items-center gap-2">
              <Field label="Fókusz hónap">
                <Select
                  value={focusMonth}
                  onChange={(e) => setFocusMonth(e.target.value)}
                >
                  {monthList.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>

          <div className="mt-4 h-75">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={series}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => `${formatHUF(Number(v))} ${currency}`}
                />
                <Legend />
                <Bar
                  dataKey="plannedIncome"
                  name="Tervezett bevétel"
                  fill={CHART_COLORS[0]}
                />
                <Bar
                  dataKey="plannedExpense"
                  name="Tervezett kiadás"
                  fill={CHART_COLORS[6]}
                />
                <Bar
                  dataKey="plannedSavings"
                  name="Tervezett megtakarítás"
                  fill={CHART_COLORS[4]}
                />
                <Bar
                  dataKey="actualIncome"
                  name="Tényleges bevétel"
                  fill={CHART_COLORS[1]}
                />
                <Bar
                  dataKey="actualExpense"
                  name="Tényleges kiadás"
                  fill={CHART_COLORS[3]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Nettó trend</div>
              <div className="text-lg font-semibold">Egyenleg alakulása</div>
            </div>
            <div className="text-xs text-white/50">
              A tényleges nettó a rögzített tételekből számol.
            </div>
          </div>
          <div className="mt-4 h-65">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={series}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(v) => `${formatHUF(Number(v))} ${currency}`}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="plannedNet"
                  name="Tervezett nettó"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="actualNet"
                  name="Tényleges nettó"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-5">
          <div className="text-sm text-white/60">Fókusz hónap összegzés</div>
          <div className="text-lg font-semibold">{focusMonth}</div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Metric
              label="Tervezett bevétel"
              value={`${formatHUF(current?.plannedIncome || 0)} ${currency}`}
            />
            <Metric
              label="Tervezett kiadás"
              value={`${formatHUF(current?.plannedExpense || 0)} ${currency}`}
            />
            <Metric
              label="Tervezett megtak."
              value={`${formatHUF(current?.plannedSavings || 0)} ${currency}`}
            />
            <Metric
              label="Tervezett nettó"
              value={`${formatHUF(current?.plannedNet || 0)} ${currency}`}
              strong
            />
            <Metric
              label="Tényleges bevétel"
              value={`${formatHUF(current?.actualIncome || 0)} ${currency}`}
            />
            <Metric
              label="Tényleges kiadás"
              value={`${formatHUF(current?.actualExpense || 0)} ${currency}`}
            />
            <Metric
              label="Tényleges nettó"
              value={`${formatHUF(current?.actualNet || 0)} ${currency}`}
              strong
            />
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Kiadások bontása</div>
              <div className="text-lg font-semibold">Kategória megoszlás</div>
            </div>
            <div className="text-[10px] text-white/40">
              tényleges, csak kiadás
            </div>
          </div>

          {categoryBreakdown.length === 0 ? (
            <div className="mt-4 text-sm text-white/40">
              Nincs rögzített kiadás ebben a hónapban.
            </div>
          ) : (
            <div className="mt-4 h-55">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(v) => `${formatHUF(Number(v))} ${currency}`}
                  />
                  <Pie
                    data={categoryBreakdown}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {categoryBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 space-y-1 max-h-40 overflow-auto pr-1">
            {categoryBreakdown.slice(0, 10).map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs text-white/70"
              >
                <span className="truncate mr-2 flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                  <span className="truncate">{c.category}</span>
                </span>
                <span className="text-white flex items-center gap-2">
                  <span>{money(c.value)}</span>
                  <span className="text-white/40">
                    {roundTo(percent(c.value, totalExpense), 1)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/60">Bevételek bontása</div>
              <div className="text-lg font-semibold">Kategória megoszlás</div>
            </div>
            <div className="text-[10px] text-white/40">
              tényleges, csak bevétel
            </div>
          </div>

          {incomeCategoryBreakdown.length === 0 ? (
            <div className="mt-4 text-sm text-white/40">
              Nincs rögzített bevétel ebben a hónapban.
            </div>
          ) : (
            <div className="mt-4 h-55">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip
                    formatter={(v) => `${formatHUF(Number(v))} ${currency}`}
                  />
                  <Pie
                    data={incomeCategoryBreakdown}
                    dataKey="value"
                    nameKey="category"
                    innerRadius={45}
                    outerRadius={80}
                    paddingAngle={2}
                  >
                    {incomeCategoryBreakdown.map((_, i) => (
                      <Cell
                        key={i}
                        fill={CHART_COLORS[i % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="mt-3 space-y-1 max-h-40 overflow-auto pr-1">
            {incomeCategoryBreakdown.slice(0, 10).map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between text-xs text-white/70"
              >
                <span className="truncate mr-2 flex items-center gap-2">
                  <span
                    className="inline-block w-2 h-2 rounded-full"
                    style={{
                      backgroundColor:
                        CHART_COLORS[i % CHART_COLORS.length],
                    }}
                  />
                  <span className="truncate">{c.category}</span>
                </span>
                <span className="text-white flex items-center gap-2">
                  <span>{money(c.value)}</span>
                  <span className="text-white/40">
                    {roundTo(percent(c.value, totalIncome), 1)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm text-white/60">
            Látható időtáv tervezett bevétele
          </div>
          <div className="text-lg font-semibold">Keresők szerint</div>
          {peopleIncomePlanned.length === 0 ? (
            <div className="mt-3 text-sm text-white/40">
              Nincs személyhez rendelt fix bevétel.
            </div>
          ) : (
            <div className="mt-4 h-45">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={peopleIncomePlanned}
                  layout="vertical"
                  margin={{ top: 0, right: 0, left: 10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis type="number" tick={{ fontSize: 10 }} />
                  <YAxis
                    type="category"
                    dataKey="name"
                    tick={{ fontSize: 10 }}
                    width={80}
                  />
                  <Tooltip
                    formatter={(v) => `${formatHUF(Number(v))} ${currency}`}
                  />
                  <Bar
                    dataKey="value"
                    name="Tervezett bevétel"
                    fill={CHART_COLORS[0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="text-sm text-white/60">
            Legutolsó hónap a nézetben
          </div>
          <div className="text-lg font-semibold">{latest?.month}</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <Metric
              label="Tervezett nettó"
              value={`${formatHUF(latest?.plannedNet || 0)} ${currency}`}
              strong
            />
            <Metric
              label="Tényleges nettó"
              value={`${formatHUF(latest?.actualNet || 0)} ${currency}`}
              strong
            />
          </div>
        </Card>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-white/10 bg-white/5 p-3 ${
        strong ? "" : ""
      }`}
    >
      <div className="text-[10px] text-white/50">{label}</div>
      <div className={`text-sm ${strong ? "font-semibold" : "font-medium"}`}>
        {value}
      </div>
    </div>
  );
}

// -------------------- Transactions view --------------------

function TransactionsView({
  state,
  setTab,
  addTransaction,
  updateTransaction,
  removeTransaction,
}: {
  state: State;
  setTab: React.Dispatch<React.SetStateAction<TabKey>>;
  addTransaction: () => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
}) {
  const [filterMonth, setFilterMonth] = useState<string>(""); // "" = összes
  const [search, setSearch] = useState("");

  const catsIncome = state.categories.filter((c) => c.type === "income");
  const catsExpense = state.categories.filter((c) => c.type === "expense");

  const catById = useMemo(() => {
    const m = new Map<string, Category>();
    state.categories.forEach((c) => m.set(c.id, c));
    return m;
  }, [state.categories]);

  const monthOf = (isoDate: string) => (isoDate || "").slice(0, 7); // YYYY-MM (gyors, timezone-biztos)
  const isIsoDate = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return state.transactions.filter((t) => {
      if (filterMonth) {
        if (monthOf(t.date) !== filterMonth) return false;
      }
      if (q) {
        const hay = `${t.name ?? ""} ${t.notes ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [state.transactions, filterMonth, search]);

  // napok szerint csoportosítunk: kulcs = t.date (YYYY-MM-DD)
  const groups = useMemo(() => {
    const map = new Map<string, Transaction[]>();

    for (const t of filtered) {
      const key = isIsoDate(t.date) ? t.date : "nincs-datum";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }

    const arr = Array.from(map.entries()).map(([date, items]) => ({
      date,
      items,
    }));

    arr.sort((a, b) => {
      if (a.date === "nincs-datum") return 1;
      if (b.date === "nincs-datum") return -1;
      return b.date.localeCompare(a.date); // ISO string → jól rendez
    });

    return arr;
  }, [filtered]);

  // dropdown állapot napokra
  const [openDays, setOpenDays] = useState<Record<string, boolean>>({});

  const toggleDay = (d: string) =>
    setOpenDays((s) => ({
      ...s,
      [d]: !s[d],
    }));

  const fmt = (n: number) => `${formatHUF(n)} ${state.settings.currency}`;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Tényleges bevételek és kiadások</div>
            <div className="text-lg font-semibold">Tételek rögzítése</div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Hónap szűrő (month picker)">
              <Input
                type="month"
                value={filterMonth}
                onChange={(e) =>
                  setFilterMonth(normalizeMonthInput(e.target.value))
                }
                className="w-44"
              />
            </Field>

            <SmallButton
              variant="ghost"
              onClick={() => setFilterMonth("")}
              title="Szűrés törlése"
            >
              Összes
            </SmallButton>

            <Field label="Keresés">
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="pl. bevásárlás"
                className="w-56"
              />
            </Field>

            <div className="flex flex-wrap items-center gap-2 mr-2">
              <SmallButton variant="ghost" onClick={() => setTab("recurring")}>
                Fix tételek
              </SmallButton>
              <SmallButton variant="ghost" onClick={() => setTab("people")}>
                Keresők & kategóriák
              </SmallButton>
              <SmallButton variant="ghost" onClick={() => setTab("settings")}>
                Beállítások
              </SmallButton>
            </div>

            <SmallButton variant="solid" onClick={addTransaction}>
              <Plus className="w-3.5 h-3.5" /> Új tétel
            </SmallButton>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {groups.length === 0 ? (
          <Card className="p-6">
            <div className="text-sm text-white/40">Nincs találat.</div>
          </Card>
        ) : (
          groups.map(({ date, items }) => {
            const isOpen = !!openDays[date];

            // napi összegzés
            let income = 0;
            let expense = 0;
            const byCat = new Map<string, number>();

            for (const t of items) {
              const a = Number(t.amount ?? 0);
              if (t.type === "income") income += a;
              else expense += a;

              if (t.categoryId) byCat.set(t.categoryId, (byCat.get(t.categoryId) ?? 0) + a);
            }

            const total = income - expense;

            // top 3 kategória (összeg alapján)
            const topCats = Array.from(byCat.entries())
              .map(([cid, sum]) => ({ cid, sum, name: catById.get(cid)?.name ?? "Ismeretlen" }))
              .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum))
              .slice(0, 3);

            return (
              <Card key={date} className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => toggleDay(date)}
                    className="flex items-center gap-2 text-left"
                  >
                    <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                    <div>
                      <div className="text-sm text-white/60">Nap</div>
                      <div className="text-lg font-semibold">
                        {date === "nincs-datum" ? "(nincs dátum)" : date}
                      </div>
                    </div>
                  </button>

                  <div className="flex flex-col items-start md:items-end gap-1">
                    <div className="text-sm">
                      <span className="text-white/60">Bevétel:</span> {fmt(income)}{" "}
                      <span className="text-white/40">•</span>{" "}
                      <span className="text-white/60">Kiadás:</span> {fmt(expense)}{" "}
                      <span className="text-white/40">•</span>{" "}
                      <span className="text-white/60">Egyenleg:</span>{" "}
                      <span className={total >= 0 ? "text-emerald-300" : "text-rose-300"}>
                        {fmt(total)}
                      </span>
                    </div>

                    {topCats.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {topCats.map((c) => (
                          <span
                            key={c.cid}
                            className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70"
                            title="Top kategória (abszolút összeg szerint)"
                          >
                            {c.name}: {fmt(c.sum)}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {!isOpen ? (
                  <div className="mt-3 text-xs text-white/40">
                    Kattints a napra a tételek megnyitásához.
                  </div>
                ) : (
                  <div className="mt-4 space-y-3">
                    {items.map((t) => (
                      <div key={t.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                          <div className="md:col-span-3 min-w-0">
                            <Field label="Dátum">
                              <Input
                                type="date"
                                value={t.date || ""}
                                onChange={(e) =>
                                  updateTransaction(t.id, {
                                    date: normalizeDateInput(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-4 min-w-0">
                            <Field label="Megnevezés">
                              <Input
                                value={t.name || ""}
                                onChange={(e) =>
                                  updateTransaction(t.id, { name: e.target.value })
                                }
                                className="w-full"
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-2 min-w-0">
                            <Field label="Típus">
                              <Select
                                value={t.type}
                                onChange={(e) => {
                                  const type = e.target.value as MoneyType;
                                  updateTransaction(t.id, {
                                    type,
                                    categoryId:
                                      (type === "income" ? catsIncome[0]?.id : catsExpense[0]?.id) || null,
                                  });
                                }}
                                className="w-full"
                              >
                                <option value="expense">Kiadás</option>
                                <option value="income">Bevétel</option>
                              </Select>
                            </Field>
                          </div>

                          <div className="md:col-span-3 min-w-0">
                            <Field label="Kategória">
                              <Select
                                value={t.categoryId || ""}
                                onChange={(e) =>
                                  updateTransaction(t.id, {
                                    categoryId: e.target.value || null,
                                  })
                                }
                                className="w-full"
                              >
                                <option value="">(nincs)</option>
                                {(t.type === "income" ? catsIncome : catsExpense).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                          </div>

                          <div className="md:col-span-3 min-w-0">
                            <Field label="Személy">
                              <Select
                                value={t.personId || ""}
                                onChange={(e) =>
                                  updateTransaction(t.id, {
                                    personId: e.target.value || null,
                                  })
                                }
                                className="w-full"
                              >
                                <option value="">Háztartás</option>
                                {state.people.map((p) => (
                                  <option key={p.id} value={p.id}>
                                    {p.name}
                                  </option>
                                ))}
                              </Select>
                            </Field>
                          </div>

                          <div className="md:col-span-2 min-w-0">
                            <Field label="Összeg">
                              <Input
                                type="number"
                                value={t.amount ?? 0}
                                onChange={(e) =>
                                  updateTransaction(t.id, {
                                    amount: parseNumberInput(e.target.value),
                                  })
                                }
                                className="w-full"
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-12 min-w-0">
                            <Field label="Megjegyzés">
                              <Input
                                value={t.notes || ""}
                                onChange={(e) =>
                                  updateTransaction(t.id, {
                                    notes: e.target.value,
                                  })
                                }
                                className="w-full"
                              />
                            </Field>
                          </div>

                          <div className="md:col-span-12 flex justify-end">
                            <SmallButton variant="danger" onClick={() => removeTransaction(t.id)}>
                              <Trash2 className="w-3.5 h-3.5" /> Törlés
                            </SmallButton>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}

// -------------------- Recurring view (FIX) --------------------

function RecurringView({
  state,
  addRecurring,
  updateRecurring,
  removeRecurring,
  quickCreateYearTemplate,
}: {
  state: State;
  addRecurring: (type: MoneyType) => void;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
  quickCreateYearTemplate: (year: number) => void;
}) {
  const [yearQuick, setYearQuick] = useState<number>(2026);
  const [previewMonth, setPreviewMonth] = useState(state.settings.startMonth || monthKey(new Date()));
  const incomes = state.recurring.filter((r) => r.type === "income");
  const expenses = state.recurring.filter((r) => r.type === "expense");

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="text-sm text-white/60">Tervezett, ismétlődő tételek</div>
            <div className="text-lg font-semibold">Fix bevételek és kiadások</div>
            <div className="text-xs text-white/40 mt-1">
              A kezdő/záró hónappal előre be tudsz állítani akár teljes éveket (pl. 2026).
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <Field label="Gyors 12 hónapos sablon">
              <Input
                type="number"
                min={2000}
                max={2100}
                value={yearQuick}
                onChange={(e) => {
                  const n = parseNumberInput(e.target.value);
                  const clamped = Math.min(
                    2100,
                    Math.max(2000, n || yearQuick)
                  );
                  setYearQuick(clamped);
                }}
                className="w-28"
              />
            </Field>
            <Field label="Előnézet hónap">
              <Input
                type="month"
                value={previewMonth}
                onChange={(e) => setPreviewMonth(e.target.value)}
                className="w-40"
              />
            </Field>


            <SmallButton variant="solid" onClick={() => quickCreateYearTemplate(yearQuick)}>
              <Plus className="w-3.5 h-3.5" /> {yearQuick} sablon hozzáadása
            </SmallButton>

            <SmallButton variant="ghost" onClick={() => addRecurring("income")}>
              <Plus className="w-3.5 h-3.5" /> Fix bevétel
            </SmallButton>

            <SmallButton variant="ghost" onClick={() => addRecurring("expense")}>
              <Plus className="w-3.5 h-3.5" /> Fix kiadás
            </SmallButton>
          </div>
        </div>
      </Card>

      {/* egymás alatt (szebb, nem csúszik szét) */}
      <div className="space-y-4">
        <RecurringList
          title="Fix bevételek"
          items={incomes}
          state={state}
          previewMonth={previewMonth}
          updateRecurring={updateRecurring}
          removeRecurring={removeRecurring}
        />

        <RecurringList
          title="Fix kiadások"
          items={expenses}
          state={state}
          previewMonth={previewMonth}
          updateRecurring={updateRecurring}
          removeRecurring={removeRecurring}
        />
      </div>
    </div>
  );
}

function RecurringList({
  title,
  items,
  state,
  previewMonth,
  updateRecurring,
  removeRecurring,
}: {
  title: string;
  items: RecurringItem[];
  state: State;
  previewMonth: string;
  updateRecurring: (id: string, patch: Partial<RecurringItem>) => void;
  removeRecurring: (id: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false); // ⬅ alapból zárva

  const type: MoneyType = items[0]?.type || "expense";
  const cats = state.categories.filter((c) => c.type === type);

  const money = (n: number) => `${formatHUF(n || 0)} ${state.settings.currency}`;

  // összegzés: összes aktív / hó + kategória bontás (top 4)
  const summary = useMemo(() => {
    let total = 0;
    const byCat = new Map<string, number>();

    for (const r of items) {
      if (!r.enabled) continue;
      const a = Number(r.amount ?? 0);
      total += a;

      const cid = r.categoryId || "";
      if (cid) byCat.set(cid, (byCat.get(cid) ?? 0) + a);
    }

    const catList = Array.from(byCat.entries())
      .map(([cid, sum]) => ({
        cid,
        sum,
        name: state.categories.find((c) => c.id === cid)?.name ?? "Ismeretlen",
      }))
      .sort((a, b) => Math.abs(b.sum) - Math.abs(a.sum))
      .slice(0, 4);

    return { total, catList };
  }, [items, state.categories]);

  return (
    <Card className="p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <button
          type="button"
          onClick={() => setIsOpen((v) => !v)}
          className="flex items-center gap-2 text-left"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          <div>
            <div className="text-lg font-semibold">{title}</div>
            <div className="text-xs text-white/40">{items.length} tétel</div>
          </div>
        </button>

        <div className="flex flex-col md:items-end gap-1">
          <div className="text-sm text-white/80">
            <span className="text-white/50">Aktív összesen / hó:</span>{" "}
            <span className={type === "income" ? "text-emerald-300" : "text-rose-300"}>
              {money(summary.total)}
            </span>
          </div>

          {summary.catList.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {summary.catList.map((c) => (
                <span
                  key={c.cid}
                  className="text-xs rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/70"
                  title="Top kategória (összeg alapján)"
                >
                  {c.name}: {money(c.sum)}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {!isOpen ? (
        <div className="mt-3 text-xs text-white/40">
          Kattints a fejlécre a részletek megnyitásához.
        </div>
      ) : items.length === 0 ? (
        <div className="mt-4 text-sm text-white/40">Még nincs itt semmi.</div>
      ) : (
        <div className="mt-4 space-y-3">
          {items.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-4 min-w-0">
                  <Field label="Megnevezés">
                    <Input
                      value={r.name || ""}
                      onChange={(e) => updateRecurring(r.id, { name: e.target.value })}
                      className="w-full"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2 min-w-0">
                  <Field label="Összeg / hó">
                    <Input
                      type="number"
                      value={r.amount ?? 0}
                      onChange={(e) =>
                        updateRecurring(r.id, {
                          amount: parseNumberInput(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>

                <div className="md:col-span-3 min-w-0">
                  <Field label="Kategória">
                    <Select
                      value={r.categoryId || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, {
                          categoryId: e.target.value || null,
                        })
                      }
                      className="w-full"
                    >
                      <option value="">(nincs)</option>
                      {cats.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="md:col-span-3 min-w-0">
                  <Field label="Személy (opcionális)">
                    <Select
                      value={r.personId || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, {
                          personId: e.target.value || null,
                        })
                      }
                      className="w-full"
                    >
                      <option value="">Háztartás</option>
                      {state.people.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>

                <div className="md:col-span-3 min-w-0">
                  <Field label="Kezdő hónap" hint="YYYY-MM">
                    <Input
                      type="month"
                      value={r.startMonth || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, {
                          startMonth: normalizeMonthInput(e.target.value),
                        })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>

                <div className="md:col-span-3 min-w-0">
                  <Field label="Záró hónap" hint="üres = nincs vége">
                    <Input
                      type="month"
                      value={r.endMonth || ""}
                      onChange={(e) => {
                        const v = normalizeMonthInput(e.target.value);
                        updateRecurring(r.id, {
                          endMonth: v || null,
                        });
                      }}
                      className="w-full"
                    />
                  </Field>
                </div>

                <div className="md:col-span-2 min-w-0">
                  <Field label="Gyakoriság">
                    <Select
                      value={r.cadence}
                      onChange={(e) =>
                        updateRecurring(r.id, {
                          cadence: e.target.value as RecurringItem["cadence"],
                        })
                      }
                      className="w-full"
                    >
                      <option value="monthly">Havi</option>
                    </Select>
                  </Field>
                </div>

                <div className="md:col-span-2 min-w-0">
                  <Field label="Esedékes nap">
                    <Input
                      type="number"
                      min={1}
                      max={31}
                      value={r.dayOfMonth ?? 5}
                      onChange={(e) => {
                        const n = parseNonNegativeInput(e.target.value);
                        const clamped = Math.min(
                          31,
                          Math.max(1, n || 1)
                        );
                        updateRecurring(r.id, { dayOfMonth: clamped });
                      }}
                      className="w-full"
                    />
                     {/* ✅ előnézet – így dueDateForMonth már nem unused */}
                    <div className="mt-1 text-[11px] text-white/50">
                      Előnézet ebben a hónapban:{" "}
                      <span className="text-white/70">
                        {dueDateForMonth(previewMonth, r.dayOfMonth ?? 5)}
                      </span>
                    </div>
                  </Field>
                </div>

                <div className="md:col-span-2 min-w-0">
                  <Field label="Aktív">
                    <Select
                      value={r.enabled ? "yes" : "no"}
                      onChange={(e) =>
                        updateRecurring(r.id, {
                          enabled: e.target.value === "yes",
                        })
                      }
                      className="w-full"
                    >
                      <option value="yes">Igen</option>
                      <option value="no">Nem</option>
                    </Select>
                  </Field>
                </div>

                <div className="md:col-span-12 min-w-0">
                  <Field label="Megjegyzés">
                    <Input
                      value={r.notes || ""}
                      onChange={(e) =>
                        updateRecurring(r.id, { notes: e.target.value })
                      }
                      className="w-full"
                    />
                  </Field>
                </div>

                <div className="md:col-span-12 flex justify-end">
                  <SmallButton variant="danger" onClick={() => removeRecurring(r.id)}>
                    <Trash2 className="w-3.5 h-3.5" /> Törlés
                  </SmallButton>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

// -------------------- Savings view --------------------

function SavingsView({
  state,
  addSavings,
  updateSavings,
  removeSavings,
}: {
  state: State;
  addSavings: () => void;
  updateSavings: (id: string, patch: Partial<SavingsBucket>) => void;
  removeSavings: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Tervezett megtakarítási célok és keretek</div>
            <div className="text-lg font-semibold">Megtakarítás</div>
          </div>
          <div className="flex items-center gap-2">
            <SmallButton variant="solid" onClick={addSavings}>
              <Plus className="w-3.5 h-3.5" /> Új megtakarítási keret
            </SmallButton>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <div className="grid min-w-225 grid-cols-1 gap-3">
          {state.savings.length === 0 ? (
            <Card className="p-6">
              <div className="text-sm text-white/40">Még nincs megtakarítási keret.</div>
            </Card>
          ) : (
            state.savings.map((s) => (
              <Card key={s.id} className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-4">
                    <Field label="Név">
                      <Input
                        value={s.name || ""}
                        onChange={(e) =>
                          updateSavings(s.id, { name: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Célösszeg">
                      <Input
                        type="number"
                        value={s.targetAmount ?? 0}
                        onChange={(e) =>
                          updateSavings(s.id, {
                            targetAmount: parseNonNegativeInput(
                              e.target.value
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Havi terv">
                      <Input
                        type="number"
                        value={s.monthlyPlanned ?? 0}
                        onChange={(e) =>
                          updateSavings(s.id, {
                            monthlyPlanned: parseNonNegativeInput(
                              e.target.value
                            ),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Kezdő hónap" hint="YYYY-MM">
                      <Input
                        type="month"
                        value={s.startMonth || ""}
                        onChange={(e) =>
                          updateSavings(s.id, {
                            startMonth: normalizeMonthInput(e.target.value),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Záró hónap" hint="YYYY-MM">
                      <Input
                        type="month"
                        value={s.endMonth || ""}
                        onChange={(e) =>
                          updateSavings(s.id, {
                            endMonth: normalizeMonthInput(e.target.value),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-12">
                    <Field label="Megjegyzés">
                      <Input
                        value={s.notes || ""}
                        onChange={(e) =>
                          updateSavings(s.id, { notes: e.target.value })
                        }
                      />
                    </Field>
                  </div>
                  <div className="md:col-span-12 flex justify-end">
                    <SmallButton variant="danger" onClick={() => removeSavings(s.id)}>
                      <Trash2 className="w-3.5 h-3.5" /> Törlés
                    </SmallButton>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        <Card className="p-5">
          <div className="text-sm text-white/60">Megjegyzés</div>
          <div className="text-xs text-white/40 mt-1">
            A dashboard jelenleg a megtakarítási kereteket <b>tervezett levonásként</b> kezeli. Ha szeretnéd a tényleges megtakarítást is külön vezetni,
            hozz létre egy "Megtakarítás" kiadás kategóriát, és rögzítsd a valós átvezetéseket tételként.
          </div>
        </Card>
      </div>  
    </div>
  );
}

// -------------------- People & Categories view --------------------

function PeopleCategoriesView({
  state,
  addPerson,
  updatePerson,
  removePerson,
  addCategory,
  updateCategory,
  removeCategory,
}: {
  state: State;
  addPerson: () => void;
  updatePerson: (id: string, patch: Partial<Person>) => void;
  removePerson: (id: string) => void;
  addCategory: (type: MoneyType) => void;
  updateCategory: (id: string, patch: Partial<Category>) => void;
  removeCategory: (id: string) => void;
}) {
  const incomeCats = state.categories.filter((c) => c.type === "income");
  const expenseCats = state.categories.filter((c) => c.type === "expense");

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm text-white/60">Bevételek bővíthetősége</div>
            <div className="text-lg font-semibold">Keresők / személyek</div>
          </div>
          <SmallButton variant="solid" onClick={addPerson}>
            <Plus className="w-3.5 h-3.5" /> Új személy
          </SmallButton>
        </div>

        <div className="mt-4 space-y-3">
          {state.people.map((p, idx) => (
            <div key={p.id} className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                <div className="md:col-span-8">
                  <Field label={`Név (#${idx + 1})`}>
                    <Input
                      value={p.name || ""}
                      onChange={(e) =>
                        updatePerson(p.id, { name: e.target.value })
                      }
                    />
                  </Field>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <SmallButton
                    variant="danger"
                    onClick={() => removePerson(p.id)}
                    disabled={state.people.length <= 1}
                    title={
                      state.people.length <= 1
                        ? "Legalább 1 személy szükséges"
                        : ""
                    }
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Törlés
                  </SmallButton>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 text-[11px] text-white/40">
          Tipp: ha később 3. jövedelemforrás belép, itt egy kattintással bővítheted a listát, majd a fix bevételeknél hozzárendelheted.
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <div className="text-sm text-white/60">Kategória-rendszer</div>
            <div className="text-lg font-semibold">Bevétel- és kiadás kategóriák</div>
          </div>
          <div className="flex items-center gap-2">
            <SmallButton variant="ghost" onClick={() => addCategory("income")}> 
              <Plus className="w-3.5 h-3.5" /> Bevétel kategória
            </SmallButton>
            <SmallButton variant="ghost" onClick={() => addCategory("expense")}> 
              <Plus className="w-3.5 h-3.5" /> Kiadás kategória
            </SmallButton>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="text-sm font-semibold">Bevétel</div>
            {incomeCats.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                />
                <SmallButton variant="danger" onClick={() => removeCategory(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </SmallButton>
              </div>
            ))}
            {incomeCats.length === 0 && <div className="text-xs text-white/40">Nincs bevétel kategória.</div>}
          </div>
          <div className="space-y-2">
            <div className="text-sm font-semibold">Kiadás</div>
            {expenseCats.map((c) => (
              <div key={c.id} className="rounded-xl border border-white/10 bg-white/5 p-3 flex items-center gap-2">
                <Input
                  value={c.name}
                  onChange={(e) => updateCategory(c.id, { name: e.target.value })}
                />
                <SmallButton variant="danger" onClick={() => removeCategory(c.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </SmallButton>
              </div>
            ))}
            {expenseCats.length === 0 && <div className="text-xs text-white/40">Nincs kiadás kategória.</div>}
          </div>
        </div>
      </Card>
    </div>
  );
}

// -------------------- Settings view --------------------

function SettingsView({
  settings,
  updateSettings,
}: {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}) {
  const { startMonth, horizonMonths, currency } = settings;

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
        </div>

        <div className="mt-4 text-[11px] text-white/40">
          Ha 2026-ra akarsz előretervezni, állítsd a kezdő hónapot 2026-01-re, és a horizontot 12 vagy 18 hónapra.
        </div>
      </Card>
      
      {/* ÚJ: verzió kártya */}
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

// -------------------- tiny non-fatal self-checks --------------------
// These help catch accidental regressions in date utilities during editing.
// They run once in the browser and only warn to console on failure.

(function selfCheck() {
  if (typeof window === "undefined") return;
  try {
    const assert = (cond: boolean, msg: string) => {
      if (!cond) throw new Error(msg);
    };

    const d = new Date(2026, 0, 15);
    assert(monthKey(d) === "2026-01", "monthKey should format YYYY-MM");
    assert(monthKey(parseMonthKey("2026-12")) === "2026-12", "parseMonthKey should parse YYYY-MM");
    assert(isMonthInRange("2026-06", "2026-01", "2026-12"), "isMonthInRange basic in-range case");
    assert(!isMonthInRange("2025-12", "2026-01", "2026-12"), "isMonthInRange basic out-of-range case");
  } catch (err) {
    console.warn("Budget Planner self-check failed:", err);
  }
})();

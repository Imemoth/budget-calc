import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "./context/ThemeContext";
import { DEFAULT_THEME, type ThemeId } from "./lib/themes";
import { APP_VERSION } from "./lib/version";
import { AnimatePresence, motion } from "framer-motion";
import { uid, isUUID, monthKey, monthsBetweenInclusive } from "./lib/utils";
import { Wallet, PiggyBank, Users, Settings2, Info, LogOut, Receipt, Home, LineChart, Repeat } from "lucide-react";
import { supabase } from "./supabaseClient";
import { useAuth } from "./auth";
import { AuthScreen } from "./authscreen";
import { loadFullStateForUser, saveStatePatch, seedDefaultCategories, deletePerson, deleteCategory, deleteAllCategories, deleteRecurring, deleteTransaction, deleteSavings, getHouseholdMembers, acceptInvite, updateMemberPermissions, removeMember, sendInvite } from "./dataClient";

// Types
export type { Settings, Person, Category, RecurringItem, Transaction, SavingsBucket, State, MoneyType, TabKey, SeriesRow, HouseholdMember, MemberPermissions } from "./types";
import type { Settings, Person, Category, RecurringItem, Transaction, SavingsBucket, State, MoneyType, TabKey, HouseholdMember, MemberPermissions } from "./types";
import { DEFAULT_PERMISSIONS } from "./types";

// Components
import { MobileNavBtn, Skeleton } from "./components/ui";
import { ChangelogModal } from "./components/ChangelogModal";
import { DashboardView } from "./components/DashboardTab";
import { MoneyTab } from "./components/MoneyTab";
import { TransactionsTab } from "./components/TransactionsTab";
import { RecurringTab } from "./components/RecurringTab";
import { SavingsView } from "./components/SavingsTab";
import { PeopleCategoriesView } from "./components/PeopleTab";
import { SettingsView } from "./components/SettingsTab";

// Domain helpers
import { monthBoundsFromSettings, expandRecurringForMonth, isMonthInRange, dueDateForMonth } from "./lib/domainHelpers";

// -------------------- storage --------------------

const STORAGE_KEY = "household-budget-planner-v1";

/**
 * Régi sessions-ökben az uid() Math.random().toString(36) stringeket generált,
 * nem valid UUID-kat. Ez a migráció minden nem-UUID ID-t felváltja crypto.randomUUID()-val,
 * megtartva az összes belső referenciát (categoryId, personId, parentId).
 */
function migrateStateIds(state: State): State {
  const anyNonUUID = [
    ...state.people.map((p) => p.id),
    ...state.categories.map((c) => c.id),
    ...state.recurring.map((r) => r.id),
    ...state.transactions.map((t) => t.id),
    ...state.savings.map((s) => s.id),
  ].some((id) => !isUUID(id));

  if (!anyNonUUID) return state; // Már mind UUID → nincs teendő

  const idMap = new Map<string, string>();
  const remap = (id: string | null | undefined): string | null => {
    if (!id) return null;
    if (isUUID(id)) return id;
    if (!idMap.has(id)) idMap.set(id, crypto.randomUUID());
    return idMap.get(id)!;
  };
  const remapRequired = (id: string): string => remap(id) as string;

  return {
    ...state,
    people: state.people.map((p) => ({ ...p, id: remapRequired(p.id) })),
    categories: state.categories.map((c) => ({
      ...c,
      id: remapRequired(c.id),
      parentId: remap(c.parentId),
    })),
    recurring: state.recurring.map((r) => ({
      ...r,
      id: remapRequired(r.id),
      categoryId: remap(r.categoryId),
      personId: remap(r.personId),
    })),
    transactions: state.transactions.map((t) => ({
      ...t,
      id: remapRequired(t.id),
      categoryId: remap(t.categoryId),
      personId: remap(t.personId),
    })),
    savings: state.savings.map((s) => ({ ...s, id: remapRequired(s.id) })),
  };
}

const defaultState = (): State => {
  const now = new Date();
  const year = now.getFullYear();

  // Szülő ID-k (local fallback – DB seed a seedDefaultCategories végzi)
  const ip0 = uid(), ip1 = uid(), ip2 = uid(), ip3 = uid(), ip4 = uid();
  const ep0 = uid(), ep1 = uid(), ep2 = uid(), ep3 = uid(), ep4 = uid();
  const ep5 = uid(), ep6 = uid(), ep7 = uid(), ep8 = uid(), ep9 = uid();
  const ep10 = uid(), ep11 = uid(), ep12 = uid(), ep13 = uid(), ep14 = uid();

  return {
    settings: { currency: "HUF", horizonMonths: 18, startMonth: monthKey(new Date(year, 0, 1)), theme: "dark-neo" },
    people: [
      { id: uid(), name: "Péter", colorIndex: 0 },
      { id: uid(), name: "Partner", colorIndex: 1 },
    ],
    categories: [
      // Bevétel szülők
      { id: ip0, name: "Munkabér", type: "income", parentId: null },
      { id: ip1, name: "Vállalkozás / mellékes", type: "income", parentId: null },
      { id: ip2, name: "Állami / családi támogatás", type: "income", parentId: null },
      { id: ip3, name: "Pénzügyi bevételek", type: "income", parentId: null },
      { id: ip4, name: "Egyéb bevétel", type: "income", parentId: null },
      // Bevétel alkategóriák
      { id: uid(), name: "Nettó fizetés", type: "income", parentId: ip0 },
      { id: uid(), name: "Bónusz / prémium", type: "income", parentId: ip0 },
      { id: uid(), name: "Cafeteria / juttatások", type: "income", parentId: ip0 },
      { id: uid(), name: "Szabadúszás / projektmunka", type: "income", parentId: ip1 },
      { id: uid(), name: "Online bevétel", type: "income", parentId: ip1 },
      { id: uid(), name: "Egyéb vállalkozói bevétel", type: "income", parentId: ip1 },
      { id: uid(), name: "Családtámogatás / ellátások", type: "income", parentId: ip2 },
      { id: uid(), name: "Nyugdíj / ösztöndíj / segély", type: "income", parentId: ip2 },
      { id: uid(), name: "Kamat", type: "income", parentId: ip3 },
      { id: uid(), name: "Osztalék", type: "income", parentId: ip3 },
      { id: uid(), name: "Árfolyamnyereség", type: "income", parentId: ip3 },
      { id: uid(), name: "Ajándék pénz", type: "income", parentId: ip4 },
      { id: uid(), name: "Visszatérítés", type: "income", parentId: ip4 },
      { id: uid(), name: "Eladásból bevétel", type: "income", parentId: ip4 },
      // Kiadás szülők
      { id: ep0, name: "Lakhatás 🏠", type: "expense", parentId: null },
      { id: ep1, name: "Rezsi ⚡", type: "expense", parentId: null },
      { id: ep2, name: "Élelmiszer & háztartás 🛒", type: "expense", parentId: null },
      { id: ep3, name: "Étkezésen kívül 🍽️", type: "expense", parentId: null },
      { id: ep4, name: "Közlekedés 🚗", type: "expense", parentId: null },
      { id: ep5, name: "Egészség 🩺", type: "expense", parentId: null },
      { id: ep6, name: "Biztosítások 🛡️", type: "expense", parentId: null },
      { id: ep7, name: "Adók & díjak 🧾", type: "expense", parentId: null },
      { id: ep8, name: "Előfizetések & digitális 🧩", type: "expense", parentId: null },
      { id: ep9, name: "Szórakozás & hobbi 🎮", type: "expense", parentId: null },
      { id: ep10, name: "Ruházat & személyes 👕", type: "expense", parentId: null },
      { id: ep11, name: "Család & gyerek 👶", type: "expense", parentId: null },
      { id: ep12, name: "Ajándék & jótékony 🎁", type: "expense", parentId: null },
      { id: ep13, name: "Utazás ✈️", type: "expense", parentId: null },
      { id: ep14, name: "Egyéb / váratlan 🧯", type: "expense", parentId: null },
      // Kiadás alkategóriák
      { id: uid(), name: "Lakbér / hiteltörlesztő", type: "expense", parentId: ep0 },
      { id: uid(), name: "Közös költség", type: "expense", parentId: ep0 },
      { id: uid(), name: "Lakásbiztosítás", type: "expense", parentId: ep0 },
      { id: uid(), name: "Karbantartás / javítás / felújítás", type: "expense", parentId: ep0 },
      { id: uid(), name: "Villany / gáz / víz", type: "expense", parentId: ep1 },
      { id: uid(), name: "Internet / mobil", type: "expense", parentId: ep1 },
      { id: uid(), name: "TV / streaming", type: "expense", parentId: ep1 },
      { id: uid(), name: "Bevásárlás (élelmiszer)", type: "expense", parentId: ep2 },
      { id: uid(), name: "Háztartási vegyi / papír", type: "expense", parentId: ep2 },
      { id: uid(), name: "Étterem / rendelés", type: "expense", parentId: ep3 },
      { id: uid(), name: "Kávé / pékség / útközbeni", type: "expense", parentId: ep3 },
      { id: uid(), name: "Üzemanyag / töltés", type: "expense", parentId: ep4 },
      { id: uid(), name: "Bérlet / tömegközlekedés", type: "expense", parentId: ep4 },
      { id: uid(), name: "Parkolás / autópálya / taxi", type: "expense", parentId: ep4 },
      { id: uid(), name: "Szerviz / gumi / alkatrész", type: "expense", parentId: ep4 },
      { id: uid(), name: "Gyógyszertár", type: "expense", parentId: ep5 },
      { id: uid(), name: "Magánorvos / vizsgálat", type: "expense", parentId: ep5 },
      { id: uid(), name: "Fogászat", type: "expense", parentId: ep5 },
      { id: uid(), name: "KGFB / Casco", type: "expense", parentId: ep6 },
      { id: uid(), name: "Élet- / baleset- / egészségbiztosítás", type: "expense", parentId: ep6 },
      { id: uid(), name: "Helyi adók / illetékek", type: "expense", parentId: ep7 },
      { id: uid(), name: "Banki költségek / számladíj", type: "expense", parentId: ep7 },
      { id: uid(), name: "Bírságok / késedelmi díjak", type: "expense", parentId: ep7 },
      { id: uid(), name: "Streaming", type: "expense", parentId: ep8 },
      { id: uid(), name: "Szoftver / felhő / app", type: "expense", parentId: ep8 },
      { id: uid(), name: "Tagságok (edzőterem, klub)", type: "expense", parentId: ep8 },
      { id: uid(), name: "Mozi / programok", type: "expense", parentId: ep9 },
      { id: uid(), name: "Hobbi eszközök / játékok", type: "expense", parentId: ep9 },
      { id: uid(), name: "Ruházat / cipő", type: "expense", parentId: ep10 },
      { id: uid(), name: "Kozmetikum / fodrász", type: "expense", parentId: ep10 },
      { id: uid(), name: "Bölcsi / ovi / iskola", type: "expense", parentId: ep11 },
      { id: uid(), name: "Gyerekruha / felszerelés", type: "expense", parentId: ep11 },
      { id: uid(), name: "Különórák", type: "expense", parentId: ep11 },
      { id: uid(), name: "Ajándékok", type: "expense", parentId: ep12 },
      { id: uid(), name: "Adomány", type: "expense", parentId: ep12 },
      { id: uid(), name: "Szállás", type: "expense", parentId: ep13 },
      { id: uid(), name: "Közlekedés (utazás)", type: "expense", parentId: ep13 },
      { id: uid(), name: "Napi költés (utazás)", type: "expense", parentId: ep13 },
      { id: uid(), name: "Váratlan kiadás / misc", type: "expense", parentId: ep14 },
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
      const merged = { ...defaultState(), ...parsed } as State;
      return migrateStateIds(merged);
    } catch {
      return defaultState();
    }
  };

  const [state, setState] = useState<State>(load);

  useEffect(() => {
     
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

async function ensureDefaultHousehold(userId: string, userEmail?: string | null): Promise<string> {
  // Step 1: existing membership – order by created_at for a consistent result across devices
  const memberRes = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (memberRes.error) throw memberRes.error;
  if (memberRes.data?.household_id) {
    const hid = memberRes.data.household_id as string;
    // Email frissítése ha még nincs mentve (meglévő tagok migrálása)
    if (userEmail) {
      await supabase
        .from("household_members")
        .update({ email: userEmail })
        .eq("household_id", hid)
        .eq("user_id", userId)
        .is("email", null);
    }
    return hid;
  }

  // Step 2: household owned by user
  const ownedRes = await supabase
    .from("households")
    .select("id")
    .eq("owner_user_id", userId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (ownedRes.error) throw ownedRes.error;

  let householdId = ownedRes.data?.id as string | undefined;

  // Step 3: create household if none exists
  if (!householdId) {
    const createRes = await supabase
      .from("households")
      .insert({ owner_user_id: userId, name: "Saját háztartás", currency: "HUF", start_month: new Date().toISOString().slice(0, 7) })
      .select("id")
      .single();
    if (createRes.error) throw createRes.error;
    householdId = createRes.data.id as string;
  }

  // Step 4: upsert membership – idempotent, safe to call repeatedly
  const insertRes = await supabase
    .from("household_members")
    .upsert(
      { household_id: householdId!, user_id: userId, role: "OWNER" },
      { onConflict: "household_id,user_id", ignoreDuplicates: true }
    );
  // Step 4b: update owner email if provided (column added in 20260310140000 migration)
  if (userEmail) {
    await supabase
      .from("household_members")
      .update({ email: userEmail })
      .eq("household_id", householdId!)
      .eq("user_id", userId)
      .is("email", null);
  }
  if (insertRes.error) {
    const msg = (insertRes.error.message || "").toLowerCase();
    // Swallow duplicate/conflict errors – the row already exists which is fine
    if (!msg.includes("duplicate") && !msg.includes("unique") && !msg.includes("conflict")) {
      throw insertRes.error;
    }
  }

  return householdId!;
}

// -------------------- sidebar nav item --------------------

function NavItem({
  icon: Icon,
  label,
  active,
  onClick,
  badge,
  soon,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  active: boolean;
  onClick: () => void;
  badge?: number;
  soon?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 text-left mb-0.5"
      style={active ? {
        background: "var(--color-primary)",
        color: "#fff",
        boxShadow: "0 2px 8px var(--color-primary)44",
      } : {
        color: "var(--color-text-2)",
      }}
      onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "var(--color-surface-2)"; }}
      onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = ""; }}
    >
      <Icon className="w-4 h-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {soon && !badge && (
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
          style={{ background: "var(--color-surface-2)", color: "var(--color-text-muted)" }}>
          hamarosan
        </span>
      )}
      {badge !== undefined && badge > 0 && (
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center"
          style={active
            ? { background: "rgba(255,255,255,0.25)", color: "#fff" }
            : { background: "var(--color-primary)", color: "#fff" }}>
          {badge}
        </span>
      )}
    </button>
  );
}

// -------------------- sidebar user button --------------------

function SidebarUserButton({
  displayName,
  email,
  savingStatus,
  isProvisioning,
  remoteReady,
  memberCount,
  onLogout,
}: {
  displayName: string | null;
  email: string;
  savingStatus: "idle" | "saving" | "error";
  isProvisioning: boolean;
  remoteReady: boolean;
  memberCount: number;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const initial = (displayName ?? email ?? "?").charAt(0).toUpperCase();
  const statusText = isProvisioning ? "Előkészítés..."
    : !remoteReady ? "Betöltés..."
    : savingStatus === "saving" ? "Mentés..."
    : savingStatus === "error" ? "Mentési hiba"
    : memberCount > 1 ? `${memberCount} fő a háztartásban`
    : "Mentve ✓";
  const statusColor = savingStatus === "error" ? "var(--color-negative)"
    : savingStatus === "saving" ? "var(--color-warning)"
    : "var(--color-text-muted)";

  return (
    <div ref={ref} className="border-t border-border mt-3 pt-3 relative">
      {/* Felugró dropdown — felfele, fix z-index */}
      {open && (
        <div
          className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border py-1.5 z-[200]"
          style={{
            background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
            boxShadow: "0 -8px 32px rgba(0,0,0,0.35), 0 -2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <div className="px-3 py-2 border-b border-border">
            <div className="text-[11px] text-text-muted">Bejelentkezve</div>
            <div className="text-xs font-semibold text-text-1 truncate mt-0.5">{displayName ?? email}</div>
            <div className="text-[10px] text-text-muted truncate">{email}</div>
          </div>
          <button
            type="button"
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Kijelentkezés
          </button>
        </div>
      )}

      {/* Kattintható user sor */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-surface-2"
        style={{ background: open ? "var(--color-surface-2)" : "transparent" }}
      >
        {/* Avatar kör */}
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border"
          style={{
            background: "var(--color-primary)22",
            color: "var(--color-primary)",
            borderColor: "var(--color-primary)40",
          }}
        >
          {initial}
        </div>
        {/* Név + státusz */}
        <div className="flex-1 min-w-0 text-left">
          <div className="text-xs font-semibold text-text-1 truncate">{displayName ?? email}</div>
          <div className="text-[10px] leading-tight mt-0.5" style={{ color: statusColor }}>
            {statusText}
          </div>
        </div>
      </button>
    </div>
  );
}

// -------------------- user menu --------------------

function UserMenu({ email, displayName, onLogout, dropUp = false }: { email: string; displayName?: string | null; onLogout: () => void; dropUp?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);
  const initial = (displayName ?? email ?? "?").charAt(0).toUpperCase();
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center text-sm font-semibold text-primary hover:bg-primary/30 transition-colors"
        title={email}
      >
        {initial}
      </button>
      {open && (
        <div
          className={`absolute right-0 w-52 rounded-xl border border-border py-1.5 z-50 ${
            dropUp ? "bottom-full mb-2" : "top-full mt-2"
          }`}
          style={{
            background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
            boxShadow: "0 8px 32px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.2)",
          }}
        >
          <div className="px-3 py-2">
            <div className="text-[11px] text-text-muted">Bejelentkezve</div>
            <div className="text-xs text-text-2 truncate mt-0.5" title={email}>{email}</div>
          </div>
          <div className="border-t border-border my-1" />
          <button
            onClick={() => { setOpen(false); onLogout(); }}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-text-2 hover:bg-surface-2 hover:text-text-1 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            Kijelentkezés
          </button>
        </div>
      )}
    </div>
  );
}

// -------------------- main app --------------------

export default function App() {
  const { user, loading, changePassword, updateProfile, displayName, firstName, lastName } = useAuth();

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
      setHouseholdMembers([]);
    }
  };

  const [activeHouseholdId, setActiveHouseholdId] = useState<string | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const localScopeId = activeHouseholdId ?? user?.id ?? null;
  const [state, setState] = useUserLocalState(localScopeId);
  const [tab, setTab] = useState<TabKey>(() => {
    // Backward compat: map old tab keys stored in localStorage
    try {
      const stored = localStorage.getItem("household-budget-planner-tab");
      if (stored === "transactions" || stored === "recurring") return "expense";
      if (stored && ["dashboard", "income", "expense", "savings", "people", "settings"].includes(stored))
        return stored as TabKey;
    } catch { /* ignore */ }
    return "dashboard";
  });
  const [isChangelogOpen, setIsChangelogOpen] = useState(false);

  const [savingStatus, setSavingStatus] = useState<"idle" | "saving" | "error">("idle");
  const [, setSaveError] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const saveTimerRef = useRef<number | null>(null);

  const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAILS ?? "")
    .split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());
  const [remoteReady, setRemoteReady] = useState(false);
  const [remoteLoadSuccess, setRemoteLoadSuccess] = useState(false);
  const [householdMembers, setHouseholdMembers] = useState<HouseholdMember[]>([]);
  const [membersLoadError, setMembersLoadError] = useState<string | null>(null);

  // Invite token kiolvasása URL-ből mountkor
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("invite");
    if (token) {
      sessionStorage.setItem("pendingInviteToken", token);
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, []);

  // Téma szinkronizálása a dokumentumra
  const { setTheme } = useTheme();
  useEffect(() => {
    setTheme((state.settings.theme as ThemeId) ?? DEFAULT_THEME);
  }, [state.settings.theme]); // eslint-disable-line react-hooks/exhaustive-deps

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
     
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!userId) { setActiveHouseholdId(null); setRemoteReady(false); setRemoteLoadSuccess(false); setSavingStatus("idle"); setSaveError(null); setHouseholdMembers([]); return; }
    let cancelled = false;
    (async () => {
      try {
        setIsProvisioning(true);
        let hid = await ensureDefaultHousehold(userId, user?.email);

        // Pending invite feldolgozása (pl. meghívó link megnyitása után)
        const pending = sessionStorage.getItem("pendingInviteToken");
        if (pending) {
          sessionStorage.removeItem("pendingInviteToken");
          try {
            const invitedHid = await acceptInvite(pending);
            if (invitedHid) hid = invitedHid; // átváltunk a meghívott háztartásba
          } catch (err) {
            console.warn("Meghívó elfogadása sikertelen:", err);
          }
        }

        if (!cancelled) setActiveHouseholdId(hid);
      } catch (err) {
        console.error("Household provisioning hiba:", err);
        if (!cancelled) setActiveHouseholdId(null);
      } finally {
        if (!cancelled) setIsProvisioning(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.id, user?.email]);

  // 2) Supabase load
  useEffect(() => {
    if (!activeHouseholdId) return;
    let cancelled = false;
     
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemoteReady(false);
     
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRemoteLoadSuccess(false);
    (async () => {
      try {
        const remote = await loadFullStateForUser(activeHouseholdId);
        if (!cancelled && remote) {
          // Ha Supabase üres (nincs people/recurring/transactions/savings) de localStorage-ban
          // van adat, tartsuk meg a localst – az autosave majd visszaszinkronizál Supabase-be.
          const remoteIsEmpty =
            remote.people.length === 0 &&
            remote.recurring.length === 0 &&
            remote.transactions.length === 0 &&
            remote.savings.length === 0;
          if (!remoteIsEmpty) {
            setState(remote);
          }
          // Ha remoteIsEmpty, a setState nem fut le → a localStorage-ból betöltött state marad,
          // és az autosave (remoteLoadSuccess=true után) visszatölti azt Supabase-be.
        }
        if (!cancelled) { setRemoteLoadSuccess(true); setRemoteReady(true); }

        // Tagok betöltése
        try {
          const members = await getHouseholdMembers(activeHouseholdId);
          if (!cancelled) { setHouseholdMembers(members); setMembersLoadError(null); }
        } catch (err) {
          console.error("Tagok betöltése sikertelen:", err);
          if (!cancelled) setMembersLoadError(err instanceof Error ? err.message : String(err));
        }
      } catch (err) {
        console.error("Nem sikerült betölteni az állapotot Supabase-ből:", err);
        // remoteLoadSuccess=false marad → autosave nem fut; remoteReady=true → skeleton eltűnik
        if (!cancelled) setRemoteReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, [activeHouseholdId, setState]);

  // 3) Supabase autosave
  useEffect(() => {
    if (!activeHouseholdId || !remoteReady || !remoteLoadSuccess) return;
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
  }, [state, activeHouseholdId, remoteReady, remoteLoadSuccess]);

  useEffect(() => {
     
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!user) { setSavingStatus("idle"); setSaveError(null); setRemoteReady(false); setRemoteLoadSuccess(false); setActiveHouseholdId(null); }
  }, [user]);

  useEffect(() => {
    try { localStorage.setItem("household-budget-planner-tab", tab); } catch { /* ignore */ }
  }, [tab]);

  // Navigáló wrapper
  const handleNavigate = (newTab: TabKey) => {
    setTab(newTab);
  };

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

  const [focusMonth, setFocusMonth] = useState(() => {
    const now = monthKey(new Date());
    if (!monthList.length) return now;
    return monthList.includes(now) ? now : monthList[0];
  });
  useEffect(() => {
    if (!monthList.length) return;
    if (!focusMonth || !monthList.includes(focusMonth)) {
      const now = monthKey(new Date());
       
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setFocusMonth(monthList.includes(now) ? now : monthList[0]);
    }
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

  const addCategory = (type: MoneyType, parentId?: string) =>
    setState((s) => ({
      ...s,
      categories: [
        ...s.categories,
        {
          id: uid(),
          name: parentId ? "Új alkategória" : type === "income" ? "Új bevétel kategória" : "Új kiadás kategória",
          type,
          parentId: parentId ?? null,
        },
      ],
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

  const reseedCategories = async () => {
    if (!activeHouseholdId) return;
    if (!window.confirm("Ez törli az összes jelenlegi kategóriát és visszaállítja az alapértelmezetteket. Biztosan folytatod?")) return;
    try {
      await deleteAllCategories(activeHouseholdId);
      const defaultCategories = await seedDefaultCategories(activeHouseholdId);
      setState((s) => ({
        ...s,
        categories: defaultCategories,
        recurring: s.recurring.map((r) => ({ ...r, categoryId: null })),
        transactions: s.transactions.map((t) => ({ ...t, categoryId: null })),
      }));
    } catch (err) {
      console.error("Nem sikerült visszaállítani a kategóriákat:", err);
    }
  };

  const addRecurringFull = (patch: Partial<RecurringItem> & { type: MoneyType }): string => {
    const id = uid();
    setState((s) => ({
      ...s,
      recurring: [...s.recurring, {
        name: patch.type === "income" ? "Fix bevétel" : "Fix kiadás",
        amount: 0,
        categoryId: s.categories.find((c) => c.type === patch.type)?.id || null,
        cadence: "monthly" as const,
        startMonth: monthKey(new Date(new Date().getFullYear(), 0, 1)),
        endMonth: null, dayOfMonth: 5, personId: null, enabled: true, notes: "",
        ...patch,
        id,
      }],
    }));
    return id;
  };

  const updateRecurring = (id: string, patch: Partial<RecurringItem>) =>
    setState((s) => ({ ...s, recurring: s.recurring.map((r) => r.id === id ? { ...r, ...patch } : r) }));

  const removeRecurring = async (id: string) => {
    setState((s) => ({ ...s, recurring: s.recurring.filter((r) => r.id !== id) }));
    if (activeHouseholdId) {
      try { await deleteRecurring(id); } catch (err) { console.error("Nem sikerült törölni a fix tételt a DB-ből:", err); }
    }
  };

  const addTransactionFull = (patch: Partial<Transaction> & { type: MoneyType }): string => {
    const id = uid();
    setState((s) => ({
      ...s,
      transactions: [{
        id,
        date: new Date().toISOString().slice(0, 10),
        name: "", amount: 0, notes: "",
        categoryId: s.categories.find((c) => c.type === patch.type)?.id || null,
        personId: null,
        ...patch,
      }, ...s.transactions],
    }));
    return id;
  };

  const updateTransaction = (id: string, patch: Partial<Transaction>) =>
    setState((s) => ({ ...s, transactions: s.transactions.map((t) => t.id === id ? { ...t, ...patch } : t) }));

  const removeTransaction = async (id: string) => {
    setState((s) => ({ ...s, transactions: s.transactions.filter((t) => t.id !== id) }));
    if (activeHouseholdId) {
      try { await deleteTransaction(id); } catch (err) { console.error("Nem sikerült törölni a tranzakciót a DB-ből:", err); }
    }
  };

  const convertRecurring = (r: RecurringItem, month: string) => {
    setState((s) => ({
      ...s,
      transactions: [{
        id: uid(),
        date: dueDateForMonth(month, r.dayOfMonth ?? 5),
        name: r.name,
        amount: r.amount,
        type: r.type,
        categoryId: r.categoryId,
        personId: r.personId,
        notes: r.notes || "",
      }, ...s.transactions],
    }));
  };

  // Saját jogosultságok
  const myMember = householdMembers.find((m) => m.userId === user?.id);
  const isOwner = myMember?.role === "OWNER";
  const myPermissions: MemberPermissions = myMember?.permissions ?? DEFAULT_PERMISSIONS;

  // Household member handlers
  const handleUpdateMemberPermissions = async (memberId: string, permissions: MemberPermissions) => {
    try {
      await updateMemberPermissions(memberId, permissions);
      setHouseholdMembers((prev) =>
        prev.map((m) => m.id === memberId ? { ...m, permissions } : m)
      );
    } catch (err) {
      console.error("Jogosultság frissítése sikertelen:", err);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    try {
      await removeMember(memberId);
      setHouseholdMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error("Tag eltávolítása sikertelen:", err);
    }
  };

  const handleSendInvite = async (email: string, permissions: MemberPermissions): Promise<{ error: string | null }> => {
    if (!activeHouseholdId || !user?.id) return { error: "Nincs bejelentkezve." };
    return sendInvite(email, activeHouseholdId, user.id, permissions);
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

  // -------------------- auth gating --------------------

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bg text-text-1">
        <div className="text-sm text-text-2">Betöltés...</div>
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  // -------------------- layout --------------------


  const TAB_META: Record<TabKey, { title: string; subtitle: string }> = {
    dashboard:    { title: "Áttekintés",     subtitle: "Pénzügyi összefoglaló" },
    transactions: { title: "Tranzakciók",   subtitle: "Összes bevétel & kiadás" },
    recurring:    { title: "Fix tételek",   subtitle: "Ismétlődő bevételek & kiadások" },
    income:       { title: "Fix bevételek", subtitle: "Tervezett fix tételek" },
    expense:      { title: "Fix kiadások",  subtitle: "Tervezett fix tételek" },
    savings:      { title: "Megtakarítás",  subtitle: "Célok & keretek" },
    people:       { title: "Személyek",     subtitle: "Keresők & kategóriák" },
    settings:     { title: "Beállítások",   subtitle: "Fiók & preferenciák" },
  };

  return (
    <div className="min-h-screen bg-bg text-text-1 lg:grid lg:grid-cols-[220px_1fr]">
      {/* Sidebar — desktop only */}
      <aside className="hidden lg:flex flex-col bg-surface border-r border-border p-4 sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-5 px-1">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
            style={{ background: "var(--color-primary)", boxShadow: "0 2px 8px var(--color-primary)50" }}>
            <img src="/logo.png" alt="" className="w-9 h-9 object-cover"
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
            <Wallet className="w-4 h-4 text-white" style={{ marginTop: "-36px" }} />
          </div>
          <div>
            <div className="text-sm font-bold text-text-1 leading-tight">
              <span style={{ color: "var(--color-primary)" }}>Költség</span>radar
            </div>
            <div className="text-[10px] text-text-muted">háztartási tervező</div>
          </div>
        </div>

        {/* Nav items */}
        <nav className="flex flex-col flex-1 overflow-y-auto">

          {/* ── FŐMENÜ szekció ── */}
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] px-2 pb-1.5 pt-0.5">
            Főmenü
          </div>

          <NavItem icon={Home} label="Áttekintés" active={tab === "dashboard"} onClick={() => handleNavigate("dashboard")} />
          <NavItem
            icon={Receipt}
            label="Tranzakciók"
            active={tab === "transactions"}
            onClick={() => handleNavigate("transactions")}
            badge={state.transactions.length > 0 && tab === "transactions" ? state.transactions.length : undefined}
          />
          <NavItem icon={LineChart} label="Elemzés" active={false} onClick={() => handleNavigate("dashboard")} soon />
          <NavItem icon={PiggyBank} label="Megtakarítás" active={tab === "savings"} onClick={() => handleNavigate("savings")} />
          <NavItem icon={Repeat} label="Fix tételek" active={tab === "recurring"} onClick={() => handleNavigate("recurring")} />

          {/* ── HÁZTARTÁS szekció ── */}
          <div className="text-[10px] font-bold text-text-muted uppercase tracking-[0.1em] px-2 pb-1.5 pt-4">
            Háztartás
          </div>

          <NavItem icon={Users} label="Személyek" active={tab === "people"} onClick={() => handleNavigate("people")} />
          <NavItem icon={Settings2} label="Beállítások" active={tab === "settings"} onClick={() => handleNavigate("settings")} />

          <div className="flex-1" />
        </nav>

        {/* Sidebar footer — kattintható user sor, felfele nyíló dropdown */}
        {user && (
          <SidebarUserButton
            displayName={displayName}
            email={user.email ?? ""}
            savingStatus={savingStatus}
            isProvisioning={isProvisioning}
            remoteReady={remoteReady}
            memberCount={householdMembers.length}
            onLogout={handleLogout}
          />
        )}
      </aside>

      {/* Main */}
      <main className="min-h-screen flex flex-col">
        {/* Sticky header */}
        <header className="sticky top-0 z-20 border-b border-border bg-surface/90 backdrop-blur px-6 py-3 flex items-center justify-between">
          <div>
            <div className="text-xs text-text-muted uppercase tracking-wider mb-0.5">
              {TAB_META[tab].subtitle}
            </div>
            <h1 className="text-lg font-bold text-text-1">{TAB_META[tab].title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {user && <div className="lg:hidden"><UserMenu email={user.email ?? ""} displayName={displayName} onLogout={handleLogout} /></div>}
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 px-4 lg:px-6 py-6 pb-20 lg:pb-6">
          {importError && (
            <div className="mb-4 rounded-xl border border-rose-500/40 bg-rose-500/10 px-3 py-2 text-xs text-rose-100 flex items-start gap-2">
              <Info className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <div className="flex-1">
                {importError}
                <button type="button" className="ml-3 underline decoration-rose-300/80 hover:decoration-rose-100" onClick={() => setImportError(null)}>Bezár</button>
              </div>
            </div>
          )}

          {(isProvisioning || (!!activeHouseholdId && !remoteReady)) && (
            <div className="space-y-4">
              <div className="rounded-2xl bg-surface border border-border p-5 space-y-3">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-6 w-72" />
                <div className="flex gap-3 mt-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-8 w-32" />
                </div>
              </div>
              <div className="rounded-2xl bg-surface border border-border p-5 space-y-3">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-4 w-4/6" />
              </div>
              <div className="rounded-2xl bg-surface border border-border p-5 space-y-3">
                <Skeleton className="h-5 w-44" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {tab === "dashboard" && (
              <motion.div key="dash" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <DashboardView monthList={monthList} focusMonth={focusMonth} setFocusMonth={setFocusMonth}
                  series={dashboardSeries} categoryBreakdown={categoryBreakdown}
                  incomeCategoryBreakdown={incomeCategoryBreakdown} peopleIncomePlanned={peopleIncomePlanned}
                  currency={state.settings.currency}
                  activeSavingsCount={state.savings.filter((s) => (s.targetAmount ?? 0) > 0 && s.startMonth).length}
                  state={state}
                  onNavigateTransactions={() => handleNavigate("transactions")} />
              </motion.div>
            )}
            {tab === "transactions" && (
              <motion.div key="transactions" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <TransactionsTab state={state}
                  addTransactionFull={addTransactionFull}
                  updateTransaction={updateTransaction}
                  removeTransaction={removeTransaction} />
              </motion.div>
            )}
            {tab === "recurring" && (
              <motion.div key="recurring" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <RecurringTab state={state}
                  addRecurringFull={addRecurringFull}
                  updateRecurring={updateRecurring}
                  removeRecurring={removeRecurring}
                  convertRecurring={convertRecurring} />
              </motion.div>
            )}
            {tab === "income" && (
              <motion.div key="income" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <MoneyTab type="income" state={state}
                  addRecurringFull={addRecurringFull} updateRecurring={updateRecurring} removeRecurring={removeRecurring}
                  addTransactionFull={addTransactionFull} updateTransaction={updateTransaction} removeTransaction={removeTransaction}
                  convertRecurring={convertRecurring} />
              </motion.div>
            )}
            {tab === "expense" && (
              <motion.div key="expense" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <MoneyTab type="expense" state={state}
                  addRecurringFull={addRecurringFull} updateRecurring={updateRecurring} removeRecurring={removeRecurring}
                  addTransactionFull={addTransactionFull} updateTransaction={updateTransaction} removeTransaction={removeTransaction}
                  convertRecurring={convertRecurring} />
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
                  onNavigate={setTab}
                  addRecurringFull={addRecurringFull} updateRecurring={updateRecurring} removeRecurring={removeRecurring}
                  addTransactionFull={addTransactionFull} updateTransaction={updateTransaction} removeTransaction={removeTransaction} />
              </motion.div>
            )}
            {tab === "settings" && (
              <motion.div key="settings" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.18 }}>
                <div className="mt-2 flex justify-end">
                  <button type="button" onClick={() => setIsChangelogOpen(true)}
                    className="text-xs text-text-muted hover:text-text-2 underline underline-offset-4">
                    v{APP_VERSION} – frissítések megtekintése
                  </button>
                </div>
                <SettingsView
                  settings={state.settings}
                  updateSettings={updateSettings}
                  state={state}
                  series={dashboardSeries}
                  changePassword={changePassword}
                  updateProfile={updateProfile}
                  currentUserEmail={user?.email}
                  currentUserFirstName={firstName}
                  currentUserLastName={lastName}
                  onExportJson={exportJson}
                  onImportClick={() => fileInputRef.current?.click()}
                  onReset={isAdmin ? () => {
                    if (window.confirm("Biztosan visszaállítod az alkalmazást alapértelmezett állapotra? Minden jelenlegi adat törlődik erről a háztartásról.")) {
                      const storageKey = localScopeId ? `${STORAGE_KEY}-${localScopeId}` : STORAGE_KEY;
                      try { localStorage.removeItem(storageKey); } catch { /* ignore */ }
                      setState(defaultState());
                    }
                  } : undefined}
                  isAdmin={isAdmin}
                  householdMembers={householdMembers}
                  membersLoadError={membersLoadError}
                  isOwner={isOwner}
                  currentUserId={user?.id ?? null}
                  myPermissions={myPermissions}
                  onSendInvite={handleSendInvite}
                  onUpdateMemberPermissions={handleUpdateMemberPermissions}
                  onRemoveMember={handleRemoveMember}
                  addCategory={addCategory}
                  updateCategory={updateCategory}
                  removeCategory={removeCategory}
                  reseedCategories={reseedCategories}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Bottom nav – mobile only */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50"
        style={{ background: "var(--color-surface)", borderTop: "1px solid var(--color-border)" }}>
        {/* Felső fény csík */}
        <div className="absolute top-0 left-0 right-0 h-px pointer-events-none"
          style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }} />
        <div className="flex justify-around px-1 py-1">
          <MobileNavBtn active={tab === "dashboard"} icon={Home} label="Áttekintés" onClick={() => handleNavigate("dashboard")} />
          <MobileNavBtn active={tab === "transactions"} icon={Receipt} label="Tételek" onClick={() => handleNavigate("transactions")} />
          {/* Középső + FAB gomb */}
          <div className="flex flex-col items-center justify-center px-1 py-2">
            <button
              type="button"
              onClick={() => handleNavigate("transactions")}
              className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95"
              style={{ background: "var(--color-primary)", boxShadow: "0 4px 16px var(--color-primary)66" }}
            >
              <span className="text-2xl leading-none font-light">+</span>
            </button>
          </div>
          <MobileNavBtn active={tab === "savings"} icon={PiggyBank} label="Célok" onClick={() => handleNavigate("savings")} />
          <MobileNavBtn active={tab === "settings" || tab === "people" || tab === "recurring"} icon={Settings2} label="Több" onClick={() => handleNavigate("settings")} />
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="application/json" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importJson(f); e.target.value = ""; }} />
      <ChangelogModal open={isChangelogOpen} onClose={() => setIsChangelogOpen(false)} />
    </div>
  );
}

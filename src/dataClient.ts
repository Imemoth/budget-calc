// src/dataClient.ts

import { supabase } from "./supabaseClient";
import type { Database } from "./lib/database.types";
import type {
  Settings,
  Person,
  Category,
  RecurringItem,
  Transaction,
  SavingsBucket,
  State,
} from "./App";

// =========================
// Helper: közös Supabase error kezelés
// =========================

function handleError<T>(
  ctx: string,
  error: { message: string } | null,
  data: T | null
): T {
  if (error) {
    console.error(`[dataClient] ${ctx} – Supabase error:`, error);
    throw new Error(`${ctx} failed: ${error.message}`);
  }
  if (data == null) {
    console.error(`[dataClient] ${ctx} – no data returned`);
    throw new Error(`${ctx} failed: no data returned`);
  }
  return data;
}

// =========================
// DB row típusok – Supabase generált típusokból
// =========================

type Tables = Database["public"]["Tables"];
type HouseholdRow = Tables["households"]["Row"];
type PersonRow = Tables["people"]["Row"];
type CategoryRow = Tables["categories"]["Row"];
type RecurringRow = Tables["recurring_items"]["Row"];
type TransactionRow = Tables["transactions"]["Row"];
type SavingsRow = Tables["savings_buckets"]["Row"];

// =========================
// Mapperek: DB row -> front típusok
// =========================

function mapHouseholdRowToSettings(row: HouseholdRow): Settings {
  return {
    currency: row.currency ?? "HUF",
    horizonMonths: row.horizon_months ?? 18,
    startMonth: row.start_month ?? "2025-01",
    theme: row.theme ?? undefined,
  };
}

function mapPersonRow(row: PersonRow): Person {
  return {
    id: row.id,
    name: row.name,
    colorIndex: row.color_index ?? 0,
  };
}

function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    type: row.type as Category["type"],
    parentId: row.parent_id ?? null,
  };
}

function mapRecurringRow(row: RecurringRow): RecurringItem {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount) || 0,
    type: row.type as RecurringItem["type"],
    categoryId: row.category_id ?? null,
    cadence: (row.cadence as RecurringItem["cadence"]) ?? "monthly",
    startMonth: row.start_month,
    endMonth: row.end_month ?? null,
    dayOfMonth: row.day_of_month ?? 1,
    personId: row.person_id ?? null,
    enabled: row.enabled ?? true,
    notes: row.notes ?? undefined,
  };
}

function mapTransactionRow(row: TransactionRow): Transaction {
  return {
    id: row.id,
    date: row.date,
    name: row.name,
    amount: row.amount,
    type: row.type as Transaction["type"],
    categoryId: row.category_id ?? null,
    personId: row.person_id ?? null,
    notes: row.note ?? undefined,
  };
}

function mapSavingsRow(row: SavingsRow): SavingsBucket {
  return {
    id: row.id,
    name: row.name,
    targetAmount: Number(row.target_amount) || 0,
    startMonth: row.start_month,
    endMonth: row.end_month,
    monthlyPlanned: Number(row.monthly_planned) || 0,
    notes: row.notes ?? undefined,
  };
}

// =========================
// Mapperek: front típus -> DB row
// =========================

function mapSettingsToUpdate(settings: Settings) {
  return {
    currency: settings.currency,
    horizon_months: settings.horizonMonths,
    start_month: settings.startMonth,
    theme: settings.theme ?? null,
  };
}

function mapPersonToRow(p: Person, householdId: string) {
  return {
    id: p.id,
    household_id: householdId,
    name: p.name,
    color_index: p.colorIndex,
  };
}

function mapCategoryToRow(c: Category, householdId: string) {
  return {
    id: c.id,
    household_id: householdId,
    name: c.name,
    type: c.type,
    parent_id: c.parentId ?? null,
  };
}

function mapRecurringToRow(r: RecurringItem, householdId: string) {
  return {
    id: r.id,
    household_id: householdId,
    name: r.name,
    amount: r.amount,
    type: r.type,
    category_id: r.categoryId,
    cadence: r.cadence,
    start_month: r.startMonth,
    end_month: r.endMonth,
    day_of_month: r.dayOfMonth,
    person_id: r.personId,
    enabled: r.enabled,
    notes: r.notes ?? null,
  };
}

function mapTransactionToRow(t: Transaction, householdId: string) {
  return {
    id: t.id,
    household_id: householdId,
    date: t.date, // 'YYYY-MM-DD'
    name: t.name,
    amount: t.amount,
    type: t.type,
    category_id: t.categoryId,
    person_id: t.personId,
    note: t.notes ?? null,
  };
}

function mapSavingsToRow(s: SavingsBucket, householdId: string) {
  return {
    id: s.id,
    household_id: householdId,
    name: s.name,
    target_amount: s.targetAmount,
    start_month: s.startMonth,
    end_month: s.endMonth,
    monthly_planned: s.monthlyPlanned,
    notes: s.notes ?? null,
  };
}

// =========================
// Helper: household lekérés rugalmasan
//  - elsőként household ID-ként próbálja (households.id)
//  - ha nincs találat, akkor owner_user_id-ként (régi működés)
// =========================

async function getHouseholdForKey(householdIdOrUserId: string): Promise<HouseholdRow> {
  // 1) Try as household id
  const byId = await supabase
    .from("households")
    .select("*")
    .eq("id", householdIdOrUserId)
    .maybeSingle();

  if (byId.error) {
    console.error("[dataClient] getHouseholdForKey (by id) error:", byId.error);
    throw new Error(`Failed to load household (by id): ${byId.error.message}`);
  }
  if (byId.data) return byId.data as HouseholdRow;

  // 2) Fallback: try as owner_user_id
  const byOwner = await supabase
    .from("households")
    .select("*")
    .eq("owner_user_id", householdIdOrUserId)
    .maybeSingle();

  if (byOwner.error) {
    console.error(
      "[dataClient] getHouseholdForKey (by owner_user_id) error:",
      byOwner.error
    );
    throw new Error(
      `Failed to load household (by owner_user_id): ${byOwner.error.message}`
    );
  }
  if (!byOwner.data) {
    throw new Error("No household found for this key.");
  }
  return byOwner.data as HouseholdRow;
}

// =========================
// Public API
// =========================

/**
 * Betölti a teljes State-et az adott householdból.
 *
 * Kompatibilitás miatt a paraméter lehet householdId *vagy* userId is,
 * de householdId használata javasolt (App provisioning után).
 */
export async function loadFullStateForUser(
  householdIdOrUserId: string
): Promise<State> {
  const household = await getHouseholdForKey(householdIdOrUserId);
  const householdId: string = household.id;

  const settings: Settings = mapHouseholdRowToSettings(household);

  const [
    { data: peopleData, error: peopleError },
    { data: categoriesData, error: categoriesError },
    { data: recurringData, error: recurringError },
    { data: txData, error: txError },
    { data: savingsData, error: savingsError },
  ] = await Promise.all([
    supabase
      .from("people")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true }),
    supabase
      .from("categories")
      .select("*")
      .eq("household_id", householdId)
      .order("order_index", { ascending: true }),
    supabase
      .from("recurring_items")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("*")
      .eq("household_id", householdId)
      .order("date", { ascending: false }),
    supabase
      .from("savings_buckets")
      .select("*")
      .eq("household_id", householdId)
      .order("created_at", { ascending: true }),
  ]);

  const peopleRows = handleError<PersonRow[]>("load people", peopleError, (peopleData as PersonRow[] | null) ?? []);
  const categoryRows = handleError<CategoryRow[]>("load categories", categoriesError, (categoriesData as CategoryRow[] | null) ?? []);
  const recurringRows = handleError<RecurringRow[]>("load recurring items", recurringError, (recurringData as RecurringRow[] | null) ?? []);
  const txRows = handleError<TransactionRow[]>("load transactions", txError, (txData as TransactionRow[] | null) ?? []);
  const savingsRows = handleError<SavingsRow[]>("load savings buckets", savingsError, (savingsData as SavingsRow[] | null) ?? []);

  const people: Person[] = peopleRows.map(mapPersonRow);
  let categories: Category[] = categoryRows.map(mapCategoryRow);
  const recurring: RecurringItem[] = recurringRows.map(mapRecurringRow);
  const transactions: Transaction[] = txRows.map(mapTransactionRow);
  const savings: SavingsBucket[] = savingsRows.map(mapSavingsRow);

  // Új háztartásnál: ha nincs még kategória, seedeljük az alapértelmezetteket
  if (categories.length === 0) {
    categories = await seedDefaultCategories(householdId);
  }

  const state: State = {
    settings,
    people,
    categories,
    recurring,
    transactions,
    savings,
  };

  return state;
}

/**
 * Részleges State upsertelése.
 *
 * Fontos: ez a függvény *nem töröl* meglévő sorokat, csak beszúr / frissít.
 * Ha törlést is szeretnél szinkronban tartani, ahhoz külön delete hívásokra
 * vagy egy "full replace" stratégiára lesz szükség.
 */
export async function saveStatePatch(
  householdIdOrUserId: string,
  patch: Partial<State>
): Promise<void> {
  const household = await getHouseholdForKey(householdIdOrUserId);
  const householdId: string = household.id;

  const tasks: Promise<unknown>[] = [];

  // Settings -> households update
  if (patch.settings) {
    const update = mapSettingsToUpdate(patch.settings);
    tasks.push(
      (async () => {
        const { error } = await supabase
          .from("households")
          .update(update)
          .eq("id", householdId);
        if (error) {
          console.error("[dataClient] saveStatePatch settings error:", error);
          throw new Error(`Failed to update settings: ${error.message}`);
        }
      })()
    );
  }

  // People upsert
  if (patch.people) {
    const rows = patch.people.map((p) => mapPersonToRow(p, householdId));
    tasks.push(
      (async () => {
        if (rows.length === 0) return;
        const { error } = await supabase
          .from("people")
          .upsert(rows, { onConflict: "id" });
        if (error) {
          console.error("[dataClient] saveStatePatch people error:", error);
          throw new Error(`Failed to upsert people: ${error.message}`);
        }
      })()
    );
  }

  // Categories upsert
  if (patch.categories) {
    const rows = patch.categories.map((c) =>
      mapCategoryToRow(c, householdId)
    );
    tasks.push(
      (async () => {
        if (rows.length === 0) return;
        const { error } = await supabase
          .from("categories")
          .upsert(rows, { onConflict: "id" });
        if (error) {
          console.error("[dataClient] saveStatePatch categories error:", error);
          throw new Error(`Failed to upsert categories: ${error.message}`);
        }
      })()
    );
  }

  // Recurring items upsert
  if (patch.recurring) {
    const rows = patch.recurring.map((r) =>
      mapRecurringToRow(r, householdId)
    );
    tasks.push(
      (async () => {
        if (rows.length === 0) return;
        const { error } = await supabase
          .from("recurring_items")
          .upsert(rows, { onConflict: "id" });
        if (error) {
          console.error(
            "[dataClient] saveStatePatch recurring error:",
            error
          );
          throw new Error(`Failed to upsert recurring items: ${error.message}`);
        }
      })()
    );
  }

  // Transactions upsert
  if (patch.transactions) {
    const rows = patch.transactions.map((t) =>
      mapTransactionToRow(t, householdId)
    );
    tasks.push(
      (async () => {
        if (rows.length === 0) return;
        const { error } = await supabase
          .from("transactions")
          .upsert(rows, { onConflict: "id" });
        if (error) {
          console.error(
            "[dataClient] saveStatePatch transactions error:",
            error
          );
          throw new Error(`Failed to upsert transactions: ${error.message}`);
        }
      })()
    );
  }

  // Savings buckets upsert
  if (patch.savings) {
    const rows = patch.savings.map((s) =>
      mapSavingsToRow(s, householdId)
    );
    tasks.push(
      (async () => {
        if (rows.length === 0) return;
        const { error } = await supabase
          .from("savings_buckets")
          .upsert(rows, { onConflict: "id" });
        if (error) {
          console.error(
            "[dataClient] saveStatePatch savings error:",
            error
          );
          throw new Error(`Failed to upsert savings buckets: ${error.message}`);
        }
      })()
    );
  }

  // Minden párhuzamosan fusson
  await Promise.all(tasks);
}

// =========================
// Alap kategória seed (új háztartásnál, ha a categories tábla üres)
// =========================

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function seedDefaultCategories(householdId: string): Promise<Category[]> {
  // --- Szülő kategóriák ---
  const incomeParents: Category[] = [
    { id: makeId(), name: "Munkabér", type: "income", parentId: null },
    { id: makeId(), name: "Vállalkozás / mellékes", type: "income", parentId: null },
    { id: makeId(), name: "Állami / családi támogatás", type: "income", parentId: null },
    { id: makeId(), name: "Pénzügyi bevételek", type: "income", parentId: null },
    { id: makeId(), name: "Egyéb bevétel", type: "income", parentId: null },
  ];
  const expenseParents: Category[] = [
    { id: makeId(), name: "Lakhatás 🏠", type: "expense", parentId: null },
    { id: makeId(), name: "Rezsi ⚡", type: "expense", parentId: null },
    { id: makeId(), name: "Élelmiszer & háztartás 🛒", type: "expense", parentId: null },
    { id: makeId(), name: "Étkezésen kívül 🍽️", type: "expense", parentId: null },
    { id: makeId(), name: "Közlekedés 🚗", type: "expense", parentId: null },
    { id: makeId(), name: "Egészség 🩺", type: "expense", parentId: null },
    { id: makeId(), name: "Biztosítások 🛡️", type: "expense", parentId: null },
    { id: makeId(), name: "Adók & díjak 🧾", type: "expense", parentId: null },
    { id: makeId(), name: "Előfizetések & digitális 🧩", type: "expense", parentId: null },
    { id: makeId(), name: "Szórakozás & hobbi 🎮", type: "expense", parentId: null },
    { id: makeId(), name: "Ruházat & személyes 👕", type: "expense", parentId: null },
    { id: makeId(), name: "Család & gyerek 👶", type: "expense", parentId: null },
    { id: makeId(), name: "Ajándék & jótékony 🎁", type: "expense", parentId: null },
    { id: makeId(), name: "Utazás ✈️", type: "expense", parentId: null },
    { id: makeId(), name: "Egyéb / váratlan 🧯", type: "expense", parentId: null },
  ];

  const allParents = [...incomeParents, ...expenseParents];

  // Helper: szülő id megkeresése index alapján
  const ip = (i: number) => incomeParents[i].id;
  const ep = (i: number) => expenseParents[i].id;

  // --- Alkatégóriák ---
  const children: Category[] = [
    // Munkabér
    { id: makeId(), name: "Nettó fizetés", type: "income", parentId: ip(0) },
    { id: makeId(), name: "Bónusz / prémium", type: "income", parentId: ip(0) },
    { id: makeId(), name: "Cafeteria / juttatások", type: "income", parentId: ip(0) },
    // Vállalkozás / mellékes
    { id: makeId(), name: "Szabadúszás / projektmunka", type: "income", parentId: ip(1) },
    { id: makeId(), name: "Online bevétel", type: "income", parentId: ip(1) },
    { id: makeId(), name: "Egyéb vállalkozói bevétel", type: "income", parentId: ip(1) },
    // Állami / családi támogatás
    { id: makeId(), name: "Családtámogatás / ellátások", type: "income", parentId: ip(2) },
    { id: makeId(), name: "Nyugdíj / ösztöndíj / segély", type: "income", parentId: ip(2) },
    // Pénzügyi bevételek
    { id: makeId(), name: "Kamat", type: "income", parentId: ip(3) },
    { id: makeId(), name: "Osztalék", type: "income", parentId: ip(3) },
    { id: makeId(), name: "Árfolyamnyereség", type: "income", parentId: ip(3) },
    // Egyéb bevétel
    { id: makeId(), name: "Ajándék pénz", type: "income", parentId: ip(4) },
    { id: makeId(), name: "Visszatérítés", type: "income", parentId: ip(4) },
    { id: makeId(), name: "Eladásból bevétel", type: "income", parentId: ip(4) },
    // Lakhatás
    { id: makeId(), name: "Lakbér / hiteltörlesztő", type: "expense", parentId: ep(0) },
    { id: makeId(), name: "Közös költség", type: "expense", parentId: ep(0) },
    { id: makeId(), name: "Lakásbiztosítás", type: "expense", parentId: ep(0) },
    { id: makeId(), name: "Karbantartás / javítás / felújítás", type: "expense", parentId: ep(0) },
    // Rezsi
    { id: makeId(), name: "Villany / gáz / víz", type: "expense", parentId: ep(1) },
    { id: makeId(), name: "Internet / mobil", type: "expense", parentId: ep(1) },
    { id: makeId(), name: "TV / streaming", type: "expense", parentId: ep(1) },
    // Élelmiszer & háztartás
    { id: makeId(), name: "Bevásárlás (élelmiszer)", type: "expense", parentId: ep(2) },
    { id: makeId(), name: "Háztartási vegyi / papír", type: "expense", parentId: ep(2) },
    // Étkezésen kívül
    { id: makeId(), name: "Étterem / rendelés", type: "expense", parentId: ep(3) },
    { id: makeId(), name: "Kávé / pékség / útközbeni", type: "expense", parentId: ep(3) },
    // Közlekedés
    { id: makeId(), name: "Üzemanyag / töltés", type: "expense", parentId: ep(4) },
    { id: makeId(), name: "Bérlet / tömegközlekedés", type: "expense", parentId: ep(4) },
    { id: makeId(), name: "Parkolás / autópálya / taxi", type: "expense", parentId: ep(4) },
    { id: makeId(), name: "Szerviz / gumi / alkatrész", type: "expense", parentId: ep(4) },
    // Egészség
    { id: makeId(), name: "Gyógyszertár", type: "expense", parentId: ep(5) },
    { id: makeId(), name: "Magánorvos / vizsgálat", type: "expense", parentId: ep(5) },
    { id: makeId(), name: "Fogászat", type: "expense", parentId: ep(5) },
    // Biztosítások
    { id: makeId(), name: "KGFB / Casco", type: "expense", parentId: ep(6) },
    { id: makeId(), name: "Élet- / baleset- / egészségbiztosítás", type: "expense", parentId: ep(6) },
    // Adók & díjak
    { id: makeId(), name: "Helyi adók / illetékek", type: "expense", parentId: ep(7) },
    { id: makeId(), name: "Banki költségek / számladíj", type: "expense", parentId: ep(7) },
    { id: makeId(), name: "Bírságok / késedelmi díjak", type: "expense", parentId: ep(7) },
    // Előfizetések & digitális
    { id: makeId(), name: "Streaming", type: "expense", parentId: ep(8) },
    { id: makeId(), name: "Szoftver / felhő / app", type: "expense", parentId: ep(8) },
    { id: makeId(), name: "Tagságok (edzőterem, klub)", type: "expense", parentId: ep(8) },
    // Szórakozás & hobbi
    { id: makeId(), name: "Mozi / programok", type: "expense", parentId: ep(9) },
    { id: makeId(), name: "Hobbi eszközök / játékok", type: "expense", parentId: ep(9) },
    // Ruházat & személyes
    { id: makeId(), name: "Ruházat / cipő", type: "expense", parentId: ep(10) },
    { id: makeId(), name: "Kozmetikum / fodrász", type: "expense", parentId: ep(10) },
    // Család & gyerek
    { id: makeId(), name: "Bölcsi / ovi / iskola", type: "expense", parentId: ep(11) },
    { id: makeId(), name: "Gyerekruha / felszerelés", type: "expense", parentId: ep(11) },
    { id: makeId(), name: "Különórák", type: "expense", parentId: ep(11) },
    // Ajándék & jótékony
    { id: makeId(), name: "Ajándékok", type: "expense", parentId: ep(12) },
    { id: makeId(), name: "Adomány", type: "expense", parentId: ep(12) },
    // Utazás
    { id: makeId(), name: "Szállás", type: "expense", parentId: ep(13) },
    { id: makeId(), name: "Közlekedés (utazás)", type: "expense", parentId: ep(13) },
    { id: makeId(), name: "Napi költés (utazás)", type: "expense", parentId: ep(13) },
    // Egyéb / váratlan
    { id: makeId(), name: "Váratlan kiadás / misc", type: "expense", parentId: ep(14) },
  ];

  // Insert szülők
  const parentRows = allParents.map((c) => mapCategoryToRow(c, householdId));
  const { error: parentError } = await supabase
    .from("categories")
    .insert(parentRows);
  if (parentError) {
    console.error("[dataClient] seedDefaultCategories (parents) error:", parentError);
    throw new Error(`seedDefaultCategories failed: ${parentError.message}`);
  }

  // Insert gyerekek
  const childRows = children.map((c) => mapCategoryToRow(c, householdId));
  const { error: childError } = await supabase
    .from("categories")
    .insert(childRows);
  if (childError) {
    console.error("[dataClient] seedDefaultCategories (children) error:", childError);
    throw new Error(`seedDefaultCategories failed: ${childError.message}`);
  }

  return [...allParents, ...children];
}

// =========================
// Delete függvények (RLS védi, hogy csak saját household sorát törölhesse)
// =========================

export async function deletePerson(id: string): Promise<void> {
  const { error } = await supabase.from("people").delete().eq("id", id);
  if (error) {
    console.error("[dataClient] deletePerson error:", error);
    throw new Error(`deletePerson failed: ${error.message}`);
  }
}

export async function deleteCategory(id: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    console.error("[dataClient] deleteCategory error:", error);
    throw new Error(`deleteCategory failed: ${error.message}`);
  }
}

export async function deleteAllCategories(householdId: string): Promise<void> {
  const { error } = await supabase.from("categories").delete().eq("household_id", householdId);
  if (error) {
    console.error("[dataClient] deleteAllCategories error:", error);
    throw new Error(`deleteAllCategories failed: ${error.message}`);
  }
}

export async function deleteRecurring(id: string): Promise<void> {
  const { error } = await supabase
    .from("recurring_items")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[dataClient] deleteRecurring error:", error);
    throw new Error(`deleteRecurring failed: ${error.message}`);
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) {
    console.error("[dataClient] deleteTransaction error:", error);
    throw new Error(`deleteTransaction failed: ${error.message}`);
  }
}

export async function deleteSavings(id: string): Promise<void> {
  const { error } = await supabase
    .from("savings_buckets")
    .delete()
    .eq("id", id);
  if (error) {
    console.error("[dataClient] deleteSavings error:", error);
    throw new Error(`deleteSavings failed: ${error.message}`);
  }
}

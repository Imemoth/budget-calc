// src/dataClient.ts

import { supabase } from "./supabaseClient";
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
// Mapperek: DB row -> front típusok
// =========================

function mapHouseholdRowToSettings(row: any): Settings {
  return {
    currency: row.currency ?? "HUF",
    horizonMonths: row.horizon_months ?? 18,
    startMonth: row.start_month ?? "2025-01",
    theme: row.theme ?? undefined,
  };
}

function mapPersonRow(row: any): Person {
  return {
    id: row.id,
    name: row.name,
    colorIndex: row.color_index ?? 0,
  };
}

function mapCategoryRow(row: any): Category {
  return {
    id: row.id,
    name: row.name,
    // DB-ben text, check-kel: 'income' | 'expense'
    type: row.type,
  };
}

function mapRecurringRow(row: any): RecurringItem {
  return {
    id: row.id,
    name: row.name,
    amount: Number(row.amount) || 0,
    type: row.type,
    categoryId: row.category_id ?? null,
    cadence: row.cadence ?? "monthly",
    startMonth: row.start_month,
    endMonth: row.end_month ?? null,
    dayOfMonth: row.day_of_month ?? 1,
    personId: row.person_id ?? null,
    enabled: row.enabled ?? true,
    notes: row.notes ?? undefined,
  };
}

function mapTransactionRow(row: any): Transaction {
  // Supabase date -> 'YYYY-MM-DD' string
  const dateStr =
    typeof row.date === "string"
      ? row.date
      : row.date instanceof Date
      ? row.date.toISOString().slice(0, 10)
      : "";

  return {
    id: row.id,
    date: dateStr,
    name: row.name,
    amount: Number(row.amount) || 0,
    type: row.type,
    categoryId: row.category_id ?? null,
    personId: row.person_id ?? null,
    notes: row.note ?? row.notes ?? undefined,
  };
}

function mapSavingsRow(row: any): SavingsBucket {
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
// Helper: household lekérés userId alapján
// =========================

async function getHouseholdForUser(userId: string): Promise<any> {
  const { data, error } = await supabase
    .from("households")
    .select("*")
    .eq("owner_user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[dataClient] getHouseholdForUser error:", error);
    throw new Error(`Failed to load household for user: ${error.message}`);
  }
  if (!data) {
    throw new Error("No household found for this user.");
  }
  return data;
}

// =========================
// Public API
// =========================

/**
 * Betölti a teljes State-et az adott userhez tartozó householdból.
 * Feltételezi, hogy van 1 household owner_user_id = userId-vel.
 */
export async function loadFullStateForUser(userId: string): Promise<State> {
  const household = await getHouseholdForUser(userId);
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

  const peopleRows = handleError("load people", peopleError, peopleData ?? []);
  const categoryRows = handleError(
    "load categories",
    categoriesError,
    categoriesData ?? []
  );
  const recurringRows = handleError(
    "load recurring items",
    recurringError,
    recurringData ?? []
  );
  const txRows = handleError("load transactions", txError, txData ?? []);
  const savingsRows = handleError(
    "load savings buckets",
    savingsError,
    savingsData ?? []
  );

  const people: Person[] = peopleRows.map(mapPersonRow);
  const categories: Category[] = categoryRows.map(mapCategoryRow);
  const recurring: RecurringItem[] = recurringRows.map(mapRecurringRow);
  const transactions: Transaction[] = txRows.map(mapTransactionRow);
  const savings: SavingsBucket[] = savingsRows.map(mapSavingsRow);

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
  userId: string,
  patch: Partial<State>
): Promise<void> {
  const household = await getHouseholdForUser(userId);
  const householdId: string = household.id;

  const tasks: Promise<any>[] = [];

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

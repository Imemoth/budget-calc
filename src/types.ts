// -------------------- types --------------------

export type MoneyType = "income" | "expense";

export type TabKey =
  | "dashboard"
  | "transactions"
  | "recurring"
  | "savings"
  | "people"
  | "settings";

export type Settings = {
  currency: "HUF" | "EUR" | "USD" | string;
  horizonMonths: number;
  startMonth: string; // YYYY-MM
  theme?: string;
};

export type Person = {
  id: string;
  name: string;
  colorIndex: number;
};

export type Category = {
  id: string;
  name: string;
  type: MoneyType;
  parentId?: string | null;
};

export type RecurringItem = {
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

export type Transaction = {
  id: string;
  date: string; // YYYY-MM-DD
  name: string;
  amount: number;
  type: MoneyType;
  categoryId: string | null;
  personId: string | null;
  notes?: string;
};

export type SavingsBucket = {
  id: string;
  name: string;
  targetAmount: number;
  startMonth: string; // YYYY-MM
  endMonth: string; // YYYY-MM
  monthlyPlanned: number;
  notes?: string;
};

export type State = {
  settings: Settings;
  people: Person[];
  categories: Category[];
  recurring: RecurringItem[];
  transactions: Transaction[];
  savings: SavingsBucket[];
};

export type SeriesRow = {
  month: string;
  plannedIncome: number;
  plannedExpense: number;
  plannedSavings: number;
  plannedNet: number;
  actualIncome: number;
  actualExpense: number;
  actualNet: number;
};

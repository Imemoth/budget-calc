// -------------------- types --------------------

export type MoneyType = "income" | "expense";

export type TabKey =
  | "dashboard"
  | "transactions"
  | "income"
  | "expense"
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
  cadence: "monthly" | "quarterly" | "yearly";
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

export type MemberPermissions = {
  income: boolean;
  expense: boolean;
  savings: boolean;
  categories: boolean;
  settings: boolean;
};

export const DEFAULT_PERMISSIONS: MemberPermissions = {
  income: true,
  expense: true,
  savings: true,
  categories: true,
  settings: false,
};

export type HouseholdMember = {
  id: string;
  userId: string;
  role: "OWNER" | "MEMBER";
  email: string | null;
  permissions: MemberPermissions;
  joinedAt: string;
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

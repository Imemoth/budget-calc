import { parseMonthKey, clampDateToMonth, addMonths } from "./utils";
import type { RecurringItem, Settings } from "../types";

// Date/month normalizálás – ha üres vagy invalid, üres string lesz
export const normalizeDateInput = (value: string): string => {
  if (!value) return "";
  return /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : "";
};

export const normalizeMonthInput = (value: string): string => {
  if (!value) return "";
  return /^\d{4}-\d{2}$/.test(value) ? value : "";
};

// Számmezők biztonságos parse-ja
export const parseNumberInput = (value: string): number => {
  const n = Number((value || "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export const parseNonNegativeInput = (value: string): number => {
  const n = parseNumberInput(value);
  return n < 0 ? 0 : n;
};

export const isValidMonthKey = (value: string | null | undefined): boolean =>
  !!value && /^\d{4}-\d{2}$/.test(value);

export const isMonthInRange = (
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

export const expandRecurringForMonth = (rec: RecurringItem, key: string) => {
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

export const monthBoundsFromSettings = (settings: Settings) => {
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

export const dueDateForMonth = (month: string, dayOfMonth: number) => {
  const m = parseMonthKey(month);
  const raw = new Date(m.getFullYear(), m.getMonth(), dayOfMonth);
  const clamped = clampDateToMonth(raw, m);
  const y = clamped.getFullYear();
  const mm = String(clamped.getMonth() + 1).padStart(2, "0");
  const dd = String(clamped.getDate()).padStart(2, "0");
  return `${y}-${mm}-${dd}`;
};

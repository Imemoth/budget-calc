// src/lib/utils.ts

// -------------------- general --------------------

export const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

export const sleep = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms));

export const clamp = (n: number, min: number, max: number) =>
  Math.max(min, Math.min(max, n));

// -------------------- numbers --------------------

export const percent = (part: number, total: number) =>
  total === 0 ? 0 : (part / total) * 100;

export const roundTo = (n: number, digits: number) => {
  const factor = 10 ** digits;
  return Math.round(n * factor) / factor;
};

// -------------------- money --------------------

/**
 * Plain thousand separated number (no currency symbol)
 * Good for HUF-like integer amounts.
 */
export const formatHUF = (n: number) => {
  if (n == null || Number.isNaN(n)) return "0";
  try {
    return new Intl.NumberFormat("hu-HU").format(Math.round(n));
  } catch {
    return String(Math.round(n));
  }
};

/**
 * Currency formatting (Ft / EUR etc.)
 */
export const fmtMoney = (n: number, currency: string) => {
  const safe = Number.isFinite(n) ? n : 0;
  const cur = currency || "HUF";

  try {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: cur,
      maximumFractionDigits: cur === "HUF" ? 0 : 2,
    }).format(safe);
  } catch {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(safe);
  }
};

// -------------------- dates / months --------------------

export const isValidDate = (d: Date) =>
  d instanceof Date && !Number.isNaN(d.getTime());

export const today = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
};

export const firstDayOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), 1);

export const lastDayOfMonth = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth() + 1, 0);

export const isSameMonth = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth();

export const isSameDay = (d1: Date, d2: Date) =>
  d1.getFullYear() === d2.getFullYear() &&
  d1.getMonth() === d2.getMonth() &&
  d1.getDate() === d2.getDate();

export const clampDateToMonth = (d: Date, month: Date) => {
  const year = month.getFullYear();
  const mon = month.getMonth();
  const day = d.getDate();
  const daysInMonth = new Date(year, mon + 1, 0).getDate();
  return new Date(year, mon, Math.min(day, daysInMonth));
};

export const monthKey = (d: Date) => {
  const y = d.getFullYear();
  const m = d.getMonth() + 1;
  return `${y}-${String(m).padStart(2, "0")}`; // YYYY-MM
};

export const parseMonthKey = (key: string) => {
  const [y, m] = key.split("-").map((n) => parseInt(n, 10));
  return new Date(y, (m || 1) - 1, 1);
};

export const addMonths = (d: Date, n: number) =>
  new Date(d.getFullYear(), d.getMonth() + n, 1);

export const monthsBetweenInclusive = (start: Date, end: Date) => {
  const out: Date[] = [];
  let cur = new Date(start.getFullYear(), start.getMonth(), 1);
  const last = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cur <= last) {
    out.push(new Date(cur));
    cur = addMonths(cur, 1);
  }
  return out;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const mergeDeep = (target: any, source: any): any => {
    if (typeof target !== "object" || target === null) return source;
    if (typeof source !== "object" || source === null) return target;
    const output = { ...target };
    for (const key of Object.keys(source)) {
        if (key in target) {
            output[key] = mergeDeep(target[key], source[key]);
        } else {
            output[key] = source[key];
        }
    }
    return output;
};
export const uniqueBy = <T>(arr: T[], fn: (item: T) => string | number): T[] => {
    const seen = new Set<string | number>();
    const out: T[] = [];
    for (const item of arr) {
        const key = fn(item);
        if (!seen.has(key)) {
            seen.add(key);
            out.push(item);
        } 
    }
    return out;
};



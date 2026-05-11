// src/lib/money.ts — all currency/money formatting lives here

/**
 * Plain thousand-separated integer — no currency symbol.
 * Good for HUF-like display where the symbol is rendered separately.
 */
export const formatHUF = (n: number): string => {
  if (n == null || Number.isNaN(n)) return "0";
  try {
    return new Intl.NumberFormat("hu-HU").format(Math.round(n));
  } catch {
    return String(Math.round(n));
  }
};

/**
 * Formats a number as Hungarian Forint with symbol: "545 103 Ft"
 */
export const formatHuf = (amount: number): string => {
  if (amount == null || Number.isNaN(amount)) return "0 Ft";
  try {
    return new Intl.NumberFormat("hu-HU", {
      style: "currency",
      currency: "HUF",
      maximumFractionDigits: 0,
    }).format(Math.round(amount));
  } catch {
    return `${Math.round(amount)} Ft`;
  }
};

/**
 * Generic currency formatter — supports HUF, EUR, USD, etc.
 * Falls back to HUF on unknown currency codes.
 */
export const fmtMoney = (n: number, currency: string): string => {
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

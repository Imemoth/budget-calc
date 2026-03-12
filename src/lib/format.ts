/**
 * Formats a number as Hungarian Forint: "545 103 Ft"
 * Uses Intl.NumberFormat with HUF currency style.
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

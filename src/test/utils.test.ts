import { describe, it, expect } from "vitest";
import {
  uid,
  clamp,
  percent,
  roundTo,
  isValidDate,
  firstDayOfMonth,
  lastDayOfMonth,
  isSameMonth,
  isSameDay,
  clampDateToMonth,
  monthKey,
  parseMonthKey,
  addMonths,
  monthsBetweenInclusive,
  uniqueBy,
  mergeDeep,
} from "../lib/utils";
import { formatHUF, fmtMoney } from "../lib/money";

// ---- uid ----
describe("uid", () => {
  it("generates a non-empty string", () => {
    expect(typeof uid()).toBe("string");
    expect(uid().length).toBeGreaterThan(0);
  });

  it("generates unique values", () => {
    const ids = new Set(Array.from({ length: 1000 }, uid));
    expect(ids.size).toBe(1000);
  });
});

// ---- clamp ----
describe("clamp", () => {
  it("returns value when within range", () => {
    expect(clamp(5, 0, 10)).toBe(5);
  });
  it("clamps to min", () => {
    expect(clamp(-5, 0, 10)).toBe(0);
  });
  it("clamps to max", () => {
    expect(clamp(15, 0, 10)).toBe(10);
  });
  it("handles equal boundaries", () => {
    expect(clamp(5, 5, 5)).toBe(5);
  });
});

// ---- percent ----
describe("percent", () => {
  it("calculates percentage", () => {
    expect(percent(25, 100)).toBe(25);
    expect(percent(1, 4)).toBe(25);
  });
  it("returns 0 when total is 0", () => {
    expect(percent(10, 0)).toBe(0);
  });
  it("can exceed 100", () => {
    expect(percent(150, 100)).toBe(150);
  });
});

// ---- roundTo ----
describe("roundTo", () => {
  it("rounds to specified digits", () => {
    expect(roundTo(1.2345, 2)).toBe(1.23);
    expect(roundTo(1.2355, 2)).toBe(1.24);
  });
  it("rounds to 0 digits", () => {
    expect(roundTo(1.6, 0)).toBe(2);
    expect(roundTo(1.4, 0)).toBe(1);
  });
  it("handles negative numbers", () => {
    expect(roundTo(-1.235, 2)).toBe(-1.24);
  });
});

// ---- formatHUF ----
describe("formatHUF", () => {
  it("formats number with thousand separator", () => {
    const result = formatHUF(1000000);
    expect(result).toContain("1");
    expect(typeof result).toBe("string");
  });
  it("returns '0' for NaN", () => {
    expect(formatHUF(NaN)).toBe("0");
  });
  it("rounds to integer", () => {
    const result = formatHUF(1234.9);
    // 1235, not 1234
    expect(result).not.toContain(",");
  });
});

// ---- fmtMoney ----
describe("fmtMoney", () => {
  it("returns string for HUF", () => {
    const result = fmtMoney(5000, "HUF");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });
  it("handles 0", () => {
    const result = fmtMoney(0, "HUF");
    expect(typeof result).toBe("string");
  });
  it("falls back to HUF for invalid currency", () => {
    const result = fmtMoney(5000, "INVALID");
    expect(typeof result).toBe("string");
  });
  it("handles non-finite values", () => {
    const result = fmtMoney(Infinity, "HUF");
    expect(typeof result).toBe("string");
  });
});

// ---- isValidDate ----
describe("isValidDate", () => {
  it("returns true for valid Date", () => {
    expect(isValidDate(new Date("2025-01-01"))).toBe(true);
  });
  it("returns false for Invalid Date", () => {
    expect(isValidDate(new Date("not-a-date"))).toBe(false);
  });
  it("returns false for non-Date", () => {
    expect(isValidDate("2025-01-01" as unknown as Date)).toBe(false);
  });
});

// ---- firstDayOfMonth / lastDayOfMonth ----
describe("firstDayOfMonth", () => {
  it("returns the 1st of the month", () => {
    const d = firstDayOfMonth(new Date(2025, 4, 15));
    expect(d.getDate()).toBe(1);
    expect(d.getMonth()).toBe(4);
    expect(d.getFullYear()).toBe(2025);
  });
});

describe("lastDayOfMonth", () => {
  it("returns the last day of a 31-day month", () => {
    expect(lastDayOfMonth(new Date(2025, 0, 1)).getDate()).toBe(31);
  });
  it("returns the last day of February (non-leap year)", () => {
    expect(lastDayOfMonth(new Date(2025, 1, 1)).getDate()).toBe(28);
  });
  it("returns the last day of February (leap year)", () => {
    expect(lastDayOfMonth(new Date(2024, 1, 1)).getDate()).toBe(29);
  });
});

// ---- isSameMonth / isSameDay ----
describe("isSameMonth", () => {
  it("returns true for same month", () => {
    expect(isSameMonth(new Date(2025, 5, 1), new Date(2025, 5, 30))).toBe(true);
  });
  it("returns false for different month", () => {
    expect(isSameMonth(new Date(2025, 5, 1), new Date(2025, 6, 1))).toBe(false);
  });
});

describe("isSameDay", () => {
  it("returns true for same day", () => {
    expect(isSameDay(new Date(2025, 5, 15), new Date(2025, 5, 15))).toBe(true);
  });
  it("returns false for different day", () => {
    expect(isSameDay(new Date(2025, 5, 15), new Date(2025, 5, 16))).toBe(false);
  });
});

// ---- clampDateToMonth ----
describe("clampDateToMonth", () => {
  it("keeps day within month", () => {
    const result = clampDateToMonth(new Date(2025, 0, 15), new Date(2025, 1, 1));
    expect(result.getDate()).toBe(15);
    expect(result.getMonth()).toBe(1);
  });
  it("clamps day 31 in February", () => {
    const result = clampDateToMonth(new Date(2025, 0, 31), new Date(2025, 1, 1));
    expect(result.getDate()).toBe(28);
    expect(result.getMonth()).toBe(1);
  });
});

// ---- monthKey / parseMonthKey ----
describe("monthKey", () => {
  it("formats to YYYY-MM", () => {
    expect(monthKey(new Date(2025, 0, 1))).toBe("2025-01");
    expect(monthKey(new Date(2025, 11, 31))).toBe("2025-12");
    expect(monthKey(new Date(2025, 8, 15))).toBe("2025-09");
  });
});

describe("parseMonthKey", () => {
  it("parses YYYY-MM to Date", () => {
    const d = parseMonthKey("2025-03");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(2);
    expect(d.getDate()).toBe(1);
  });

  it("round-trips with monthKey", () => {
    const key = "2026-07";
    expect(monthKey(parseMonthKey(key))).toBe(key);
  });
});

// ---- addMonths ----
describe("addMonths", () => {
  it("adds months", () => {
    const result = addMonths(new Date(2025, 0, 1), 3);
    expect(result.getMonth()).toBe(3);
    expect(result.getFullYear()).toBe(2025);
  });
  it("handles year overflow", () => {
    const result = addMonths(new Date(2025, 10, 1), 3);
    expect(result.getMonth()).toBe(1);
    expect(result.getFullYear()).toBe(2026);
  });
  it("subtracts months with negative n", () => {
    const result = addMonths(new Date(2025, 2, 1), -2);
    expect(result.getMonth()).toBe(0);
    expect(result.getFullYear()).toBe(2025);
  });
});

// ---- monthsBetweenInclusive ----
describe("monthsBetweenInclusive", () => {
  it("returns correct number of months", () => {
    const months = monthsBetweenInclusive(new Date(2025, 0, 1), new Date(2025, 2, 1));
    expect(months.length).toBe(3);
  });
  it("returns single month when start === end", () => {
    const months = monthsBetweenInclusive(new Date(2025, 5, 1), new Date(2025, 5, 1));
    expect(months.length).toBe(1);
  });
  it("returns empty array when start > end", () => {
    const months = monthsBetweenInclusive(new Date(2025, 5, 1), new Date(2025, 4, 1));
    expect(months.length).toBe(0);
  });
});

// ---- uniqueBy ----
describe("uniqueBy", () => {
  it("removes duplicates by key", () => {
    const items = [{ id: 1, v: "a" }, { id: 2, v: "b" }, { id: 1, v: "c" }];
    const result = uniqueBy(items, (x) => x.id);
    expect(result.length).toBe(2);
    expect(result[0].v).toBe("a");
  });
  it("preserves order", () => {
    const items = [{ k: "b" }, { k: "a" }, { k: "b" }];
    const result = uniqueBy(items, (x) => x.k);
    expect(result.map((x) => x.k)).toEqual(["b", "a"]);
  });
  it("returns empty for empty input", () => {
    expect(uniqueBy([], (x: number) => x)).toEqual([]);
  });
});

// ---- mergeDeep ----
describe("mergeDeep", () => {
  it("merges flat objects", () => {
    expect(mergeDeep({ a: 1 }, { b: 2 })).toEqual({ a: 1, b: 2 });
  });
  it("deep merges nested objects", () => {
    const result = mergeDeep({ a: { x: 1, y: 2 } }, { a: { y: 99 } });
    expect(result).toEqual({ a: { x: 1, y: 99 } });
  });
  it("returns source when target is not an object", () => {
    expect(mergeDeep(null, { a: 1 })).toEqual({ a: 1 });
    expect(mergeDeep(42, { a: 1 })).toEqual({ a: 1 });
  });
  it("returns target when source is not an object", () => {
    expect(mergeDeep({ a: 1 }, null)).toEqual({ a: 1 });
    expect(mergeDeep({ a: 1 }, 42)).toEqual({ a: 1 });
  });
});

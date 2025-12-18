export type ChangelogEntry = {
  date?: string;
  changes: string[];
};

export const APP_VERSION = "0.3.0";

export const CHANGELOG: Record<string, ChangelogEntry> = {
  "0.3.0": {
    date: "2025-12-16",
    changes: [
      "Fix tételek lenyílós megjelenítés + összegzés",
      "Hónapválasztó stabilizálás idősáv változásnál",
      "Kategória bontás listában érték + százalék",
      "Layout szétesés elleni védelem (overflow/min-w)",
    ],
  },
  "0.2.0": {
    changes: ["Dashboard alap grafikonok + havi összegzések"],
  },
};

export type ChangelogEntry = {
  date?: string;
  changes: string[];
};

export const APP_VERSION = "0.5.2";

export const CHANGELOG: Record<string, { date: string; changes: string[] }> = {
  "0.5.2": {
    date: "2026-03-04",
    changes: [
      "Vitest teszt infrastruktúra: 48 unit teszt a lib/utils.ts összes függvényére.",
      "Hierarchikus kategóriák: szülő / alkategória struktúra (parentId mező, DB migráció).",
      "Alap kategória seed: 20 csoport + ~55 alkategória automatikusan létrejön új háztartásnál.",
      "CategorySelect komponens: optgroup alapú csoportosítás a Recurring és Transactions tabokban.",
      "PeopleTab progressive disclosure: szülő kategóriák kinyithatók/csukhatók, alkategóriák szerkeszthetők.",
    ],
  },
  "0.5.1": {
    date: "2026-03-03",
    changes: [
      "Törlés megerősítése UI-ban: minden törlés gomb inline megerősítő sort jelenít meg (Biztosan törlöd? Igen / Mégsem).",
      "App.tsx feldarabolása befejezve: minden tab külön komponensfájlban (src/components/).",
      "domainHelpers.ts kiszervezve: dátum/szám normalizáló és üzleti logika segédfüggvények.",
      "types.ts kiszervezve: összes domain típus centralizálva.",
    ],
  },
  "0.5.0": {
    date: "2026-03-03",
    changes: [
      "Törlés szinkronizálva a DB-vel: person/kategória/fix tétel/tranzakció/megtakarítás törlése most valóban törli a sort Supabase-ből.",
      "Elfelejtett jelszó (Forgot password) link a bejelentkezési képernyőn; Supabase resetPasswordForEmail alapon.",
      "React Error Boundary hozzáadva: render hiba esetén barátságos hibaképernyő, nem fehér lap.",
      ".env.example fájl létrehozva a szükséges env változókkal (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, VITE_ADMIN_EMAILS).",
    ],
  },
  "0.4.0": {
    date: "2025-12-16",
    changes: [
      "Bejelentkezés/Regisztráció integrálva (Supabase Auth).",
      "Kilépés (Logout) gomb a fejlécben; kilépés után visszadob a login képernyőre.",
      "Reset gomb csak admin felhasználóknak látszik (VITE_ADMIN_EMAILS alapján).",
      "App verzió + kattintható mini Changelog (modal) a Beállítások fül tetején.",
      "Tailwind v4 + Vite plugin beállítások javítva (build/dev stabil).",
      "Közmű util függvények kiszervezve src/lib/utils alá (pl. percent, roundTo, clampDateToMonth).",
      "Fix tételek / esedékes nap kezelése finomítva (hónapváltás edge-case támogatás).",
    ],
  },
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
    date: "2025-12-14",
    changes: ["Dashboard alap grafikonok + havi összegzések"],
  },
};

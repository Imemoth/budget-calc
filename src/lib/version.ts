export type ChangelogEntry = {
  date?: string;
  changes: string[];
};

export const APP_VERSION = "0.5.1";

export const CHANGELOG: Record<string, { date: string; changes: string[] }> = {
  "0.5.1": {
    date: "2026-03-03",
    changes: [
      "Autosave megbízhatóság: kijelentkezés előtt a pending debounce timer törlődik és azonnali Supabase mentés fut – az utolsó módosítások nem vesznek el.",
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

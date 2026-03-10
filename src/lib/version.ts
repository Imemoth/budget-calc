export type ChangelogEntry = {
  date?: string;
  changes: string[];
};

export const APP_VERSION = "0.5.17";

export const CHANGELOG: Record<string, { date: string; changes: string[] }> = {
  "0.5.17": {
    date: "2026-03-10",
    changes: [
      "Jelszóváltoztatás – Beállítások → Jelszó módosítása kártya (Supabase updateUser).",
      "Recurring → Transaction konverzió – Fix tételeknél „Rögzít (YYYY-MM)" gomb létrehoz tényleges tranzakciót az előnézet hónapra.",
    ],
  },
  "0.5.16": {
    date: "2026-03-09",
    changes: [
      "UI/UX polish: Dashboard hero összesítő kártya (nagy nettó szám + Bevétel/Kiadás/Megtakarítás sor), kategória progress bar-ok a pie chart alatt, SVG ring progress a savings goal kártyákon.",
    ],
  },
  "0.5.15": {
    date: "2026-03-09",
    changes: [
      "Export (CSV): Tranzakciók, Fix tételek, Megtakarítások, Havi összesítő – Beállítások → Export. UTF-8 BOM, pontosvessző elválasztó, Excel-kompatibilis.",
    ],
  },
  "0.5.14": {
    date: "2026-03-09",
    changes: [
      "Megtakarítási haladás vizualizáció: progress bar + tervezett összeg / célösszeg / havi terv / hátralévő hónapok minden savings kártyán.",
    ],
  },
  "0.5.13": {
    date: "2026-03-09",
    changes: [
      "3 új színséma: Trust Blue + Mint, Teal + Slate (világos), Graphite + Emerald (sötét) – Beállítások → Megjelenés.",
    ],
  },
  "0.5.12": {
    date: "2026-03-09",
    changes: [
      "Sötét/Világos téma váltó: a Beállítások fülön választható a megjelenés (Sötét / Világos).",
    ],
  },
  "0.5.11": {
    date: "2026-03-09",
    changes: [
      "SavingsTab: hónap mezők már nem lógnak ki – sm:grid-cols-2 közbenső breakpoint + min-w-0 javítás.",
      "Fekvő mobil nézet: az alsó navigáció és a tartalom alap-paddingja md: (768px) határon vált – így telefon fekvőben is látszik a bottom nav.",
    ],
  },
  "0.5.10": {
    date: "2026-03-08",
    changes: [
      "Mobilnézet finomítás: SavingsTab vízszintes scroll eltávolítva (min-w-225 törölve).",
      "MobileNavBtn: nagyobb érintési terület (min-h-12), olvashatóbb felirat (text-[10px]).",
      "MoneyTab toolbar: évválasztó, hónapválasztó és szűrő mezők mobilon teljes szélességre váltanak (w-full sm:w-auto).",
      "PeopleTab kategória toggle gomb: min 36×36px érintési terület (WCAG-barát).",
    ],
  },
  "0.5.9": {
    date: "2026-03-08",
    changes: [
      "Kritikus szinkronhiba javítás: az ID-generátor most érvényes UUID-kat hoz létre – ettől kezdve az adatok valóban mentődnek Supabase-be.",
      "Automatikus ID-migráció: a korábban elmentett (nem-UUID) adatok betöltéskor automatikusan konvertálódnak, belső hivatkozásokkal együtt.",
    ],
  },
  "0.5.8": {
    date: "2026-03-07",
    changes: [
      "Supabase szinkron javítás: ensureDefaultHousehold idempotens upsert – mobilon és webes böngészőn ugyanazok az adatok töltődnek be.",
      "Autosave guard: ha a Supabase load sikertelen volt, az app nem írja felül az adatokat üres állapottal.",
    ],
  },
  "0.5.7": {
    date: "2026-03-07",
    changes: [
      "Mobile bottom navigation bar: mobilon a tab-ok alul jelennek meg, ikon + rövid felirat.",
      "focusMonth javítás: az aktuális hónap töltődik be alapból (nem a horizon utolsó hónapja).",
      "Kategóriák csukva alapból: a szülőkategóriák összecsukva jelennek meg, kattintásra nyílnak ki.",
      "Kategória visszaállítás: ha < 10 kategória van, megjelenik egy gomb az alapértelmezett seed visszaállításához.",
      "Cadence CHECK constraint javítás (DB migration): quarterly és yearly is elfogadott a recurring_items táblában.",
    ],
  },
  "0.5.6": {
    date: "2026-03-07",
    changes: [
      "Supabase generált típusok: supabase gen types alapján database.types.ts, createClient<Database> generikus.",
      "Transactions séma javítás: name és person_id oszlopok hozzáadva a transactions táblához (DB migration).",
      "dataClient: kézi row interface-ek lecserélve generált típus aliasokra – automatikus típusellenőrzés a DB sémával.",
    ],
  },
  "0.5.5": {
    date: "2026-03-07",
    changes: [
      "Cadence bővítés: havi mellett negyedéves és éves ismétlődés is beállítható a fix tételeknél.",
      "expandRecurringForMonth: periódus-alapú logika (diff % period === 0).",
    ],
  },
  "0.5.4": {
    date: "2026-03-07",
    changes: [
      "Loading skeleton: betöltés közben animate-pulse kártyák a tartalom helyén.",
      "Típusbiztonság: Supabase query eredmények explicit row interface cast-okkal ellátva a dataClient.ts-ben.",
    ],
  },
  "0.5.3": {
    date: "2026-03-07",
    changes: [
      "Navigáció átszervezve: Tételek + Fix tételek → Bevétel / Kiadás tab.",
      "MoneyTab: minden típusnál Tervezett (fix sablonok) és Tényleges (rögzített tételek) szekció egymás alatt.",
      "addTransaction(type) – típus alapú tranzakció létrehozás.",
      "Backward compat: régi localStorage tab kulcsok ('transactions', 'recurring') → 'expense' tabra mappelve.",
    ],
  },
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

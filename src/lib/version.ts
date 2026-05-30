export type ChangelogEntry = {
  date?: string;
  changes: string[];
};

export const APP_VERSION = "0.5.44";

export const CHANGELOG: Record<string, { date: string; changes: string[] }> = {
  "0.5.44": {
    date: "2026-05-30",
    changes: [
      "Blokk beolvasása: kiadások szekcióban 'Blokk' gomb — fénykép a nyugtáról → Claude Vision API (Supabase Edge Function) kinyeri az üzlet nevét, összeget, dátumot és kategóriát → előre kitölti az 'Új kiadás' modalt.",
    ],
  },
  "0.5.43": {
    date: "2026-05-06",
    changes: [
      "Fix: autosave race condition — remoteIsEmpty=true esetén nem írja felül Supabase-t a local defaultState-tel (skipNextAutosaveRef + stateAtRemoteLoadRef védelem).",
      "Fix: ensureDefaultHousehold — household_members insert hiba esetén nem dobja el a sessiont, az owner RLS-arm enélkül is működik.",
      "UI: szinkronizációs hiba banner — ha a Supabase load sikertelen, látható figyelmeztetés jelenik meg.",
    ],
  },
  "0.5.42": {
    date: "2026-04-23",
    changes: [
      "TransactionsTab: egységes tranzakció nézet (bevétel + kiadás egy helyen), stat strip, type filter, category chip filter, date-grouping, inline edit.",
      "Nav: Tranzakciók flat nav item (transactions TabKey) + Fix tételek expandálható csoport (Fix bevételek / Fix kiadások).",
      "auth.tsx: updateProfile(firstName, lastName) → Supabase user_metadata; displayName derived property.",
      "SettingsTab: Profilom szekció — Keresztnév + Vezetéknév mezők, mentés Supabase-be.",
      "Sidebar footer: displayName megjelenítése email helyett; háztartás létszám státuszsorban.",
    ],
  },
  "0.5.40": {
    date: "2026-04-22",
    changes: [
      "Nav redesign: Bevétel + Kiadás → Tranzakciók expandálható szülőcsoport a sidebar-ban (ChevronDown animáció, border-l indent).",
      "Sidebar: Tranzakciók auto-expand, ha income/expense tab aktív; lastMoneyTab state a mobilon való visszanavigáláshoz.",
      "Mobil bottom nav: Bevétel + Kiadás (2 gomb) → Tranzakciók (1 gomb, Receipt ikon) — 6 itemről 5-re csökkent.",
      "MoneyTab ActualSection: tranzakciók dátum szerint csoportosítva (nap fejléccel: '7 március' stílus + napi összesítő).",
      "ActualSection filter: hónap filter chip-ek (pill stílus) a korábbi month input helyett, keresőmező mellé kerültek.",
      "Transaction sorok: kerek kategória-szín dot (category color index) + leading letter badge, cleaner meta (kategória · személy).",
    ],
  },
  "0.5.39": {
    date: "2026-03-19",
    changes: [
      "Fix: tételek nem jönnek létre amíg a user 'Rögzít'/'Létrehozás'-ra nem nyom (MoneyTab + PeopleTab).",
      "Kategória-rendszer átkerült a Beállítások fülre.",
      "MoneyTab RecurringEditModal: lokális state — csak mentéskor ír DB-be.",
      "PeopleTab: kategória-kártya eltávolítva, csak személy- és fix tételkezelés marad.",
    ],
  },
  "0.5.38": {
    date: "2026-03-19",
    changes: [
      "MoneyTab PlannedSection: inline expand form eltávolítva → olvasó nézet (csak sorok, szerkesztés modal-ban).",
      "MoneyTab: RecurringEditModal — floating modal kártyához kattintva; auto-open új tétel hozzáadáskor.",
      "MoneyTab: quickCreateYearTemplate eltávolítva (Sablon generátor törölve).",
      "PeopleTab PersonDetailHeader: 'Kiadás rögzítése' + 'Bevétel rögzítése' quick action gombok — egyszeri tranzakciókhoz.",
      "PeopleTab: Transaction modal — egyszerű name/összeg/dátum/kategória form floating overlay-ként.",
      "App.tsx: addTransactionFull() helper — personId és type előtölthető patch-cel.",
    ],
  },
  "0.5.37": {
    date: "2026-03-19",
    changes: [
      "MoneyTab ActualSection: nap-csoport collapse eltávolítva → flat rich row lista (divide-y divide-border, ikon badge, dátum·személy·kategória meta).",
      "ActualSection: Card overflow-hidden p-0 struktúra (header + search bar + flat list) — konzisztens a PlannedSection-nel.",
      "MoneyTab: flex-shrink-0 → shrink-0 lint fix.",
    ],
  },
  "0.5.36": {
    date: "2026-03-19",
    changes: [
      "Nav: 'Keresők & kategóriák' → 'Személyek' (sidebar + mobile bottom bar + header).",
      "MoneyTab: collapsed tételsor → rich flat row (32×32 icon badge, Aktív/Draft badge, személy·kategória·frekvencia·nap meta, színes összeg).",
      "MoneyTab: single hero kártya → 4 KPI kártya grid (aktív fix/hó, tényleges, draft, különbség).",
    ],
  },
  "0.5.35": {
    date: "2026-03-18",
    changes: [
      "PeopleTab: RecurringModal — inline modal tétel létrehozáshoz/szerkesztéshez.",
      "PeopleTab '+' CTA: addRecurringFull → modal nyílik (personId előtöltve), nem navigál a MoneyTab-ra.",
      "PeopleTab Inspector 'Szerkesztés': modal nyílik a kiválasztott tétellel (nem navigál).",
      "App.tsx: addRecurringFull(patch) — visszaadja az új tétel ID-ját, personId előtölthető.",
    ],
  },
  "0.5.34": {
    date: "2026-03-18",
    changes: [
      "MoneyTab: expanded form mezők hierarchia — primary (Megnevezés+Összeg text-base font-medium, grid-cols-[1fr_140px]) vs secondary (border-t elválasztó, 2×3 compact grid, Megjegyzés col-span-2).",
      "MoneyTab: actions sor border-t elválasztóval (ConfirmDelete bal + Rögzít jobb).",
      "ui.tsx Input + Select: min-h-11 (44px) touch target mobil kompatibilitáshoz.",
    ],
  },
  "0.5.33": {
    date: "2026-03-18",
    changes: [
      "FÁZIS 5 — DashboardTab: hero kártya → 4 KPI kártya grid (2×2 mobilon, 1×4 desktopron).",
      "DashboardTab KPI kártyák: fix bevétel/kiadás/nettó/megtakarítás — CSS var border-l-4 accent, tényleges másodlagos sor.",
      "DashboardTab: Személyek szekció avatar initial (rounded-full bg-primary/20 text-primary).",
      "DashboardTab: activeSavingsCount prop App.tsx-ből átadva (aktív keretek száma).",
      "Hardcoded emerald-950/emerald-500/rose-300/red-400/amber-400 → CSS vars (text-positive, text-negative, text-warning).",
    ],
  },
  "0.5.32": {
    date: "2026-03-18",
    changes: [
      "FÁZIS 4 — SavingsTab hero kártya: CSS var alapú border-l-warning, 3-stat grid + összesített progress bar.",
      "SavingsTab: összegyűjtött összeg (accumulated total) a hero kártyán.",
      "SavingsTab: 2 oszlopos goal kártya grid (sm:grid-cols-2).",
      "SavingsTab: Aktív/Draft badge és border-l-positive/warning minden goal kártyán.",
      "SavingsTab: Draft figyelmeztetés (célösszeg vagy kezdő hónap hiányzik).",
    ],
  },
  "0.5.31": {
    date: "2026-03-18",
    changes: [
      "FÁZIS 3 — MoneyTab hero kártya: CSS var alapú border-l accent, 3-stat grid (aktív fix/hó + tényleges + draft count).",
      "MoneyTab PlannedSection: Mind/Aktív/Draft szűrő tab bar (pill-style bg-surface-2 rounded-xl).",
      "Draft tételek: border-warning/30 bg-warning/5 opacity-80 + 'Nem számít be' badge.",
      "Aktív/Draft info box: border-l-4 border-l-warning magyarázó szöveg.",
      "Hardcoded emerald/rose színek → CSS var (text-positive, text-negative, var(--color-positive/negative)).",
    ],
  },
  "0.5.30": {
    date: "2026-03-18",
    changes: [
      "FÁZIS 2 — PeopleTab 3-column board layout (260px személylista | flex közép | 300px inspector).",
      "PersonCard: accent avatar initial, bevétel/kiadás badge-ek, mini stat grid, aktív outline.",
      "PersonDetailHeader: nagy avatar + név Input + ConfirmDelete + 3 stat kártya (bevétel/kiadás/nettó).",
      "RecurringItemList: pill-style belső tab bar (Fix bevételek / Fix kiadások) + kattintható tétel kártyák.",
      "InspectorPanel: label-érték párok + draft figyelmeztetés + MoneyTab navigáció CTA.",
      "Draft tételek: border-warning/30 bg-warning/5 opacity-80 vizuális megkülönböztetés.",
      "Dashed CTA gomb: 'Szerkesztés a Bevétel/Kiadás fülön' navigációval.",
    ],
  },
  "0.5.29": {
    date: "2026-03-18",
    changes: [
      "FÁZIS 0 — Desktop sidebar layout: App.tsx top tab bar → lg:grid-cols-[220px_1fr] sidebar + main.",
      "Sidebar: Kostségradar logo + nav itemek aktív stílussal (bg-primary/12 + outline), inaktív hover:bg-surface-2.",
      "Sidebar footer: export/import gombok + UserMenu + mentési státusz.",
      "Sticky header a main-ben: tab cím + alcím + UserMenu avatar.",
      "Mobil: bottom tab bar változatlan (lg:hidden), export/import a header-ben megjelenik mobilon.",
    ],
  },
  "0.5.28": {
    date: "2026-03-12",
    changes: [
      "SmallButton: új 'primary' variant (bg-primary/10 text-primary hover:bg-primary/20).",
      "MoneyTab: 'Rögzít' gomb solid → primary variant (tonal kiemelés).",
      "RingProgress: color prop hozzáadva, CSS var alapú alapszín (var(--color-primary)).",
      "SavingsTab: cirkuláris progress + bar color-coded állapot (done=positive, missed=negative, alacsony=warning).",
    ],
  },
  "0.5.27": {
    date: "2026-03-12",
    changes: [
      "DashboardTab PR 3: pie chart-ok eltávolítva, helyettük ranked progress bar listák (kiadás + bevétel kategória bontás).",
      "DashboardTab: Keresők szerinti bevétel bar chart → ranked progress bar lista (CSS var szín).",
      "DashboardTab: 'Legutolsó hónap' kártya eltávolítva (duplikált info a hero kártyán).",
      "DashboardTab: Bar chart 3 sorozat → 2 (plannedIncome + plannedExpense, actualNet eltávolítva).",
    ],
  },
  "0.5.26": {
    date: "2026-03-12",
    changes: [
      "PeopleTab PR 2: per-person collapsed kártyák (avatar initial + név + bevétel/kiadás összefoglaló + chevron).",
      "PeopleTab: emerald hero kártya (tervezett havi bevétel + személyek száma).",
      "PeopleTab: dashed CTA 'Új kereső hozzáadása' gomb.",
      "PeopleTab: '+ Fix bevétel' / '+ Fix kiadás' navigációs gombok expanded kártyán.",
      "CategorySection: érintetlen maradt.",
    ],
  },
  "0.5.25": {
    date: "2026-03-12",
    changes: [
      "Header: email + Kilépés gomb → kör avatar (email initial) + dropdown (Bejelentkezve info + Kijelentkezés).",
      "SmallButton: rounded-lg → rounded-xl (konzisztens lekerekítés).",
      "Input + Select focus ring: focus:ring-border → focus:ring-primary/40 (téma-szín).",
    ],
  },
  "0.5.24": {
    date: "2026-03-12",
    changes: [
      "SavingsTab hero kártya: amber accent border-l-4, összes célösszeg + havi terv + aktív keretek száma.",
      "Mobil nav aktív tint: text-primary (emerald/téma szín) — korábban text-text-1 volt.",
      "SavingsTab: formatHuf migrálva (formatHUF+currency → Intl.NumberFormat).",
      "Új megtakarítási keret: dashed CTA gomb (konzisztens MoneyTab-bal).",
    ],
  },
  "0.5.23": {
    date: "2026-03-11",
    changes: [
      "Nav fülek redesign: sticky border-b nav, aktív tab emerald underline (after: pseudo-elem), inaktív tab hover bg-surface-2.",
      "MoneyTab hero kártya: accent border-l-4 (emerald/rose), nagy tervezett összeg, tényleges + különbség sor.",
      "Fix tételek collapsed/expanded kártyák: összesített fejléc (szín-dot, név, meta, összeg, chevron) + expand-on-click form.",
      "Form hierarchia: elsődleges (név+összeg), másodlagos (kat/személy/cadence/dátumok 3-col grid), akciók (Törlés bal, Rögzít jobb).",
      "Dashed CTA gomb: teljes szélességű szaggatott keret, hover emerald tint, Plus ikon rotate-90 animáció.",
    ],
  },
  "0.5.22": {
    date: "2026-03-11",
    changes: [
      "Témarendszer teljes implementáció: 5 téma (Graphite Emerald, Midnight Purple, Trust Blue, Teal & Slate, Rose Gold), vizuális ThemeSelector kártya a Beállítások oldalon, CSS custom properties alapú séma, összes komponens semantic osztályokra átírva. Bugfix: body background CSS var-ra állítva.",
    ],
  },
  "0.5.21": {
    date: "2026-03-11",
    changes: [
      "Dashboard redesign: hero kártya emerald accent szegéllyel, szemantikus színek (zöld/piros/amber), grafikonok 2–3 sorozatra csökkentve, Y-tengely K/M rövidítéssel.",
    ],
  },
  "0.5.20": {
    date: "2026-03-10",
    changes: [
      "Household megosztás: email-alapú meghívó (Supabase Edge Function), tagok listája jogosultság-togglekkel (bevétel/kiadás/megtakarítás/kategóriák), tag eltávolítás – Beállítások → Megosztás kártya.",
    ],
  },
  "0.5.19": {
    date: "2026-03-10",
    changes: [
      "Supabase RLS audit: transactions.category_id FK javítva ON DELETE SET NULL-ra (kategória törlése többé nem dob FK violation hibát), duplikált households SELECT policy eltávolítva.",
    ],
  },
  "0.5.18": {
    date: "2026-03-10",
    changes: [
      "CI/CD pipeline: GitHub Actions – typecheck, lint és unit tesztek minden PR-on és main push-on.",
    ],
  },
  "0.5.17": {
    date: "2026-03-10",
    changes: [
      "Jelszóváltoztatás – Beállítások → Jelszó módosítása kártya (Supabase updateUser).",
      "Recurring → Transaction konverzió – Fix tételeknél Rögzít gomb az előnézet hónapra.",
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

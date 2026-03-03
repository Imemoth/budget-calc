# TODO – Budget Calc fejlesztési teendők

> Prioritás: 🔴 Kritikus / 🟡 Fontos / 🟢 Jó lenne

---

## 🔴 Kritikus – stabilitás, adatintegritás

*(Minden kritikus feladat elvégezve – lásd Elvégzett)*

---

## 🟡 Fontos – fejlesztői minőség

- [ ] **App.tsx feldarabolása** – az `App.tsx` ~800+ soros monolitikus fájl. Minden tab
  (Dashboard, Transactions, Recurring, Savings, People, Settings) külön komponens fájlba
  kerüljön a `src/components/` mappába.

  ```
  src/components/
  ├── DashboardTab.tsx
  ├── TransactionsTab.tsx
  ├── RecurringTab.tsx
  ├── SavingsTab.tsx
  ├── PeopleTab.tsx
  └── SettingsTab.tsx
  ```

- [ ] **Teszt infrastruktúra** – nincs egyetlen teszt sem. Minimum:
  - Vitest + React Testing Library telepítése
  - Unit tesztek a `lib/utils.ts` függvényeire
  - Integrációs teszt az auth flow-ra (mock Supabase)

- [ ] **Törlés megerősítése UI-ban** – a jelenlegi törlés gombok nincsenek megerősítő
  dialóggal védve; könnyen véletlenül el lehet törölni adatokat.

- [ ] **Loading skeleton / spinner** – az adatbetöltés közben nincs visszajelzés.
  `loadFullStateForUser` alatt a UI üres marad.

- [ ] **Típusbiztonság javítása** – a `dataClient.ts` mapperjeiben az `any` típusokat
  explicit interfészekre cseréltük (`HouseholdRow`, `PersonRow` stb.), de a végső cél
  a Supabase generált típusok használata (`supabase gen types typescript`).

---

## 🟡 Fontos – UX / felhasználói élmény

- [ ] **Ismétlődő tételek cadence bővítése** – jelenleg csak `"monthly"` lehetséges
  (`cadence: "monthly"` hardkódolva). Kell legalább `"yearly"` és `"quarterly"` is.

- [ ] **Mobilnézet optimalizálása** – a nav tab-ok sok helyet foglalnak kis képernyőn;
  bottom navigation bar vagy hamburger menü a mobilos élményhez.

- [ ] **Sötét/Világos téma váltó** – a `settings.theme` mező létezik, de a tényleges
  téma-váltás nincs implementálva az UI-ban.

- [ ] **Tranzakciók szűrése és keresése** – sok tranzakció esetén nincs szűrő (kategória,
  személy, hónap, szabad szöveges keresés).

- [ ] **Export funkció (CSV/Excel)** – a felhasználók exportálhassák a tranzakcióikat és
  az éves összesítőt táblázatba.

- [ ] **Megtakarítási haladás vizualizációja** – a savings bucketekhez nincs progress bar
  vagy vizuális kijelzés arról, mennyire áll a cél.

---

## 🟢 Jó lenne – bővítések

- [ ] **Household megosztás / meghívó** – jelenleg egy háztartás = egy user. Kell egy
  meghívó link / email alapú meghívó, hogy más user is csatlakozhassa a háztartáshoz.

- [ ] **Jelszóváltoztatás a beállításoknál** – Supabase `updateUser` alapon.

- [ ] **Többnyelvűség (i18n)** – az app teljesen magyarul van hardkódolva. Ha bővíteni
  kell más piacra, `i18next` integrációval lehetséges.

- [ ] **PWA / offline mód** – Vite PWA plugin + service worker, hogy mobilan is
  telepíthető és offline is működő legyen az app.

- [ ] **Banki import** – OFX / CSV import bankszámlakivonatból (pl. OTP, Revolut export).

- [ ] **Értesítések / riasztások** – ha egy hónapban túlléped a tervezett keretet
  (pl. kategórián belül), küldj email értesítést (Supabase Edge Function).

- [ ] **Recurring → Transaction konverzió** – egykattintásos „megvalósult" gomb:
  a fix tételből létrejön egy tényleges tranzakció az aktuális hónapra.

- [ ] **CI/CD pipeline** – GitHub Actions: typecheck + lint minden PR-on;
  automatikus Vercel/Netlify deploy main-re push esetén.

- [ ] **Supabase RLS policy audit** – ellenőrizni, hogy minden tábla megfelelően
  van-e levédve RLS-sel (különösen `household_members` és a cascade delete).

---

## Elvégzett (archive)

- [x] Supabase Auth integráció (login / register)
- [x] Logout gomb + admin reset
- [x] Household provisioning (ensureDefaultHousehold)
- [x] dataClient: loadFullStateForUser + saveStatePatch
- [x] Changelog modal (version.ts alapon)
- [x] Util függvények kiszervezve `src/lib/utils.ts`-be
- [x] Tailwind v4 + Vite plugin stabil konfig
- [x] **Törlés szinkronizálása** – `deletePerson/Category/Recurring/Transaction/Savings` függvények
  a `dataClient.ts`-ben; az App.tsx `remove*` függvényei aszinkronná váltak és közvetlenül
  törölnek a Supabase DB-ből (RLS védi). `saveStatePatch` csak upsert – ez megmarad.
- [x] **`.env.example` létrehozása** – `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`,
  `VITE_ADMIN_EMAILS` változókkal; `.gitignore`-ban `!.env.example` kivétel hozzáadva.
- [x] **Jelszó-visszaállítás (Forgot password)** – `resetPassword(email)` az `AuthContext`-ben
  (Supabase `resetPasswordForEmail`); `AuthScreen` új `"forgot"` mód: email + link küldés +
  visszajelzés; „Elfelejtett jelszó?" link a login képernyőn.
- [x] **Error boundary** – `src/ErrorBoundary.tsx` class component; `main.tsx`-be csomagolva;
  render hiba esetén barátságos hibaképernyő „Oldal újratöltése" gombbal.
- [x] **React hooks order violation javítása** – Az App.tsx-ben korai `if(loading)/if(!user)`
  return-ök a hookók közepén voltak → runtime crash bejelentkezésnél. Eltávolítva; az auth
  gating az összes hook után maradt.
- [x] **Lint hibák javítása** – `no-explicit-any` (dataClient.ts mapperek → explicit row interfészek),
  `no-empty` catch, unused eslint-disable, `react-refresh/only-export-components` (auth.tsx).
- [x] **Autosave flush kijelentkezésnél** – `handleLogout` most a `signOut()` előtt törli a pending
  debounce timert és azonnal `saveStatePatch`-et hív; az utolsó módosítások nem vesznek el.

# TODO – Budget Calc fejlesztési teendők

> Prioritás: 🔴 Kritikus / 🟡 Fontos / 🟢 Jó lenne

---

## 🔴 Kritikus – stabilitás, adatintegritás

- [ ] **Törlés szinkronizálása** – `saveStatePatch` csak upsert-el, nem töröl.
  Ha a user töröl egy tételt, az a DB-ben marad. Kell egy `deleteItem(table, id)` és/vagy
  „full replace" stratégia a vonatkozó táblákhoz.

- [ ] **`.env.example` létrehozása** – jelenleg nincs, a fejlesztők nem tudják, milyen
  env változókra van szükség. Hozzá kell adni a repóhoz (valódi értékek nélkül).

- [ ] **Jelszó-visszaállítás (Forgot password)** – a login képernyőn nincs „Elfelejtett jelszó"
  link. Supabase `resetPasswordForEmail` alapon megoldható.

- [ ] **Error boundary** – az App nem tartalmaz React Error Boundary-t. Bármilyen render hiba
  fehér képernyőt ad, a felhasználó nem kap visszajelzést.

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

- [ ] **Típusbiztonság javítása** – `dataClient.ts`-ben sok `any` típus van a mapperekben.
  Supabase generált típusokkal (`supabase gen types typescript`) érdemes felváltani.

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

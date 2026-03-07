# TODO – Budget Calc fejlesztési teendők

> Prioritás: 🔴 Kritikus / 🟡 Fontos / 🟢 Jó lenne

---

## 🟡 Fontos – fejlesztői minőség


---

## 🟡 Fontos – UX / felhasználói élmény

- [ ] **Mobilnézet finomítás** – bottom nav kész; még hiányzik: érintésbarát méretezés, horizontális scroll a hosszú listáknál, MoneyTab form mobilon.

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
- [x] Törlés szinkronizálása (`deletePerson/Category/Recurring/Transaction/Savings` a `dataClient.ts`-ben)
- [x] `.env.example` fájl a repóban
- [x] Jelszó-visszaállítás – Forgot password (Supabase `resetPasswordForEmail`)
- [x] Error Boundary a renderhibákhoz
- [x] App.tsx feldarabolása – minden tab külön komponensfájlban (`src/components/`)
- [x] Törlés megerősítése UI-ban – inline `ConfirmDelete` komponens minden tab törlés gombjainál
- [x] Teszt infrastruktúra – Vitest + 48 unit teszt a `lib/utils.ts` függvényeire
- [x] Hierarchikus kategóriák – szülő / alkategória struktúra, progressive disclosure UI, alap seed (20 csoport, ~55 alkategória)
- [x] Navigáció átszervezve – Bevétel / Kiadás tab (fix sablonok + tényleges tételek egy helyen)
- [x] Loading skeleton – isProvisioning / remoteReady alatt animate-pulse kártyák
- [x] Típusbiztonság – explicit row interface-ek + Supabase query cast-ok a dataClient.ts-ben
- [x] Cadence bővítés – monthly / quarterly / yearly, expandRecurringForMonth periódus-logika
- [x] Supabase generált típusok – `database.types.ts`, `createClient<Database>`, generált típus aliasok; transactions séma javítás (name, person_id oszlopok)
- [x] Mobile bottom navigation – `sm:hidden` fixed bottom bar, desktop top nav `hidden sm:flex`
- [x] focusMonth = aktuális hónap alapból
- [x] Kategóriák collapsed by default + visszaállítás gomb (reseed)
- [x] Cadence DB constraint javítás – `recurring_items_cadence_check` quarterly/yearly is engedélyez

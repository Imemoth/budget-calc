# TODO – Budget Calc fejlesztési teendők

> Prioritás: 🔴 Kritikus / 🟡 Fontos / 🟢 Jó lenne

---

## 🟢 Jó lenne – bővítések

- [x] **Household megosztás / meghívó** – email-alapú meghívó (Edge Function), granulált jogosultságok tagonként, tag-kezelés UI Beállítások → Megosztás (v0.5.20).

- [ ] **Többnyelvűség (i18n)** – az app teljesen magyarul van hardkódolva. Ha bővíteni
  kell más piacra, `i18next` integrációval lehetséges.

- [ ] **PWA / offline mód** – Vite PWA plugin + service worker, hogy mobilan is
  telepíthető és offline is működő legyen az app.

- [ ] **Banki import** – OFX / CSV import bankszámlakivonatból (pl. OTP, Revolut export).

- [ ] **Értesítések / riasztások** – ha egy hónapban túlléped a tervezett keretet
  (pl. kategórián belül), küldj email értesítést (Supabase Edge Function).

- [ ] **Recurring → Transaction konverzió** – egykattintásos „megvalósult" gomb:
  a fix tételből létrejön egy tényleges tranzakció az aktuális hónapra.

- [x] **CI/CD pipeline** – GitHub Actions: typecheck + lint + unit tesztek minden PR-on és main push-on (v0.5.18).

- [x] **Supabase RLS policy audit** – transactions.category_id FK javítva ON DELETE SET NULL-ra, duplikált households SELECT policy eltávolítva (v0.5.19).

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
- [x] UUID ID-generátor fix – `crypto.randomUUID()` + `migrateStateIds()` localStorage migrációval (v0.5.9)
- [x] Supabase szinkron – `ensureDefaultHousehold` idempotens upsert, `remoteLoadSuccess` guard, local-wins logika (v0.5.8–0.5.9)
- [x] Tranzakciók hónap- és szabad szöveges szűrése – MoneyTab Tényleges szekció toolbar (filterMonth + search)
- [x] Mobilnézet finomítás – SavingsTab vízszintes scroll eltávolítva, MobileNavBtn touch target (min-h-12), MoneyTab toolbar responsive szélességek, PeopleTab toggle min 36px (v0.5.10)
- [x] Sötét/Világos téma váltó + 3 extra színséma (Trust Blue, Teal+Slate, Graphite+Emerald) – Beállítások → Megjelenés (v0.5.12–0.5.13)
- [x] Megtakarítási haladás vizualizáció – progress bar + tervezett összeg / célösszeg / havi terv / hátralévő hónapok (v0.5.14)
- [x] Export (CSV) – Tranzakciók, Fix tételek, Megtakarítások, Havi összesítő letöltése (v0.5.15)
- [x] Jelszóváltoztatás – Beállítások → Jelszó módosítása (Supabase updateUser) (v0.5.17)
- [x] Recurring → Transaction konverzió – „Rögzít" gomb fix tételeknél, előnézet hónap alapján (v0.5.17)

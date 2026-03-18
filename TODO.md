# TODO – Budget Calc fejlesztési teendők
# Repo: Imemoth/budget-calc

> Prioritás: 🔴 Kritikus / 🟡 Fontos / 🟢 Jó lenne

---

## Guardrails — minden PR előtt ellenőrizd

🔴 **Kritikus — soha ne sértsd meg:**
- [x] `people`, `categories`, `recurring`, `transactions`, `savings` külön maradnak
- [x] `recurring` nem olvad össze `transactions`-szel
- [x] `personId` / `categoryId` kapcsolatok érintetlen maradnak
- [x] `dataClient.ts` az egyetlen perzisztencia határvonal
- [x] `types.ts` nem változik Phase 1–4 alatt

🟡 **Fontos — figyeld minden változtatásnál:**
- [x] Hierarchikus kategória modell intact marad
- [x] `convertRecurring(...)` működőképes marad
- [x] Csak semantic CSS osztályok — nincs hardcode Tailwind szín
- [x] Nincs új npm package jóváhagyás nélkül
- [x] Navigáció struktúra nem változik

---

## Checkpoint — minden PR végén kötelező

```bash
npm run typecheck   # 0 hiba
npm run lint        # 0 warning
git diff dataClient.ts  # üres — nem változott
```
Kézzel: app betölt, alapfunkciók működnek, témaváltás intact.

---

## ✅ Kész

- [x] **Theme system** (2026-03-11) — CSS custom properties, 5 téma, ThemeSelector,
  DB szinkron, minden komponens semantic osztályokra átírva, body background bugfix

- [x] **PR 0 — Desktop sidebar layout** (v0.5.29, 2026-03-18)
- [x] **PR 1 — MoneyTab** (v0.5.31+0.5.34, 2026-03-18)
- [x] **PR 2 — PeopleTab** (v0.5.30+0.5.35, 2026-03-18)
- [x] **PR 3 — DashboardTab** (v0.5.33, 2026-03-18)
- [x] **PR 4 — SavingsTab + app-wide polish** (v0.5.32+0.5.34, 2026-03-18)

---

## PR 0 — Desktop sidebar layout ✅

- [x] `App.tsx` wrapper: `lg:grid lg:grid-cols-[220px_1fr] min-h-screen`
- [x] Sidebar (`hidden lg:flex flex-col`): logo blokk + nav itemek + témaváltó alul
- [x] Nav item aktív: `bg-primary/12 text-primary outline outline-1 outline-primary/20`
- [x] Nav item inaktív: `text-text-2 hover:bg-surface-2 hover:text-text-1`
- [x] Sticky header a main-ben: `bg-surface/90 backdrop-blur border-b border-border`
- [x] Header bal: eyebrow label + h1 cím | Header jobb: email badge
- [x] Mobilon (`< lg`): sidebar `hidden`, bottom tab bar változatlan

---

## PR 1 — MoneyTab: hero kártya + aktív/draft + collapsed tételek ✅

### formatHuf (előfeltétel)
- [x] `src/lib/format.ts` — `formatHuf` helper
- [x] `DashboardTab.tsx`, `MoneyTab.tsx`, `SavingsTab.tsx` — nyers számok → `formatHuf`

### Hero kártya
- [x] Bevétel oldal teteje: CSS var border-l-positive — aktív total / tényleges / draft count
- [x] Kiadás oldal teteje: CSS var border-l-negative, fordított logika

### Aktív / Draft szűrő
- [x] `Mind | Aktív | Draft` tab bar a tétel lista felett
- [x] Draft tételek: warning border + `opacity-80` + "Nem számít be" badge
- [x] Info box: aktív vs draft magyarázat (`border-l-4 border-l-warning`)

### Collapsed tételkártyák
- [x] Kártyák alapállapota: collapsed (ikon dot + név + meta + összeg + chevron)
- [x] Expand gombra: `border-t border-border` + form mezők — egyszerre max 1 nyitva
- [x] Elsődleges mezők: Megnevezés + Összeg (`text-base font-medium`, `grid-cols-[1fr_140px]`)
- [x] Másodlagos mezők: `border-t` + 2×3 compact grid (kategória, személy, aktív, freq, dátumok)
- [x] Törlés: `ConfirmDelete` (ghost danger stílus)
- [x] Rögzít: `SmallButton variant="primary"` (`bg-primary/10 text-primary`)
- [x] Dashed "+" CTA: `border-2 border-dashed border-border`, hover primary szín

---

## PR 2 — PeopleTab: 3 oszlopos board + inspector ✅

- [x] Desktop layout: `grid grid-cols-[260px_1fr_300px] gap-4`
- [x] **Bal — személylista:** avatar inicálé + accent szín + badge-ek + mini stat grid + aktív outline
- [x] **Közép — person detail + tételek:**
  - PersonDetailHeader: nagy avatar + 3 stat kártya (bevétel/kiadás/nettó)
  - Belső tab bar: Fix bevételek | Fix kiadások (`bg-surface-2 rounded-xl p-0.5`)
  - Tétel lista: kattintható kártyák → inspector frissül
  - Draft tételek: `border-warning/30 bg-warning/5 opacity-80`
  - Dashed "+" CTA gomb
- [x] **Jobb — inspector panel (`sticky top-20`):** label–érték sorok + draft figyelmeztetés + szerkesztés gomb
- [x] `RecurringModal` — inline modal create/edit (PeopleTab.tsx-ben, `addRecurringFull` prop)
- [x] Categories szekció: fa struktúra érintetlen

---

## PR 3 — DashboardTab: KPI grid + ranked listák ✅

- [x] 4 KPI kártya grid: fix bevétel / fix kiadás / nettó / megtakarítás
- [x] Cashflow bar chart: CSS var színek, Y-tengely `800K` formatter
- [x] Személyek sor: avatar initial + nettó + progress bar
- [x] Kategória bontás: ranked horizontal progress bar lista
- [x] Bevétel bontás: ranked lista
- [x] Duplikált összesítők eltávolítva — régi hero kártya → 4 KPI kártya váltotta

---

## PR 4 — SavingsTab + app-wide product polish ✅

### SavingsTab
- [x] Összesítő hero kártya: total accumulated / total target / havi félretétel + progress bar
- [x] 2 oszlopos célkártya grid
- [x] Aktív cél: `border-l-4 border-l-positive`
- [x] Draft cél: `border-l-4 border-l-warning` + "Célösszeg vagy kezdő hónap hiányzik"
- [x] Progress bar + % megjelenítés minden kártyán (RingProgress + linear bar)
- [x] Dashed "+" CTA gomb
- [ ] Modal: új cél felvitele (Aktív/Draft toggle magyarázattal) ← opcionális

### App-wide polish
- [x] Hero kártyák: `border-l-4` accent minden főoldalon
- [x] Destruktív akciók: ghost stílus (`ConfirmDelete` danger variant)
- [x] Elsődleges CTA-k: `SmallButton variant="primary"` (`bg-primary/10`)
- [x] `rounded-xl` gombokon és inputokon következetesen (`ui.tsx`)
- [x] Mobil: `min-h-11` (44px) `Input` és `Select` komponenseken

---

## PR 5 — Architektúra review ✅ (2026-03-18)

- [x] `MoneyTab.tsx` már nem érzi magát statikus admin formnak — hero + szűrő + collapsed cards
- [x] `PeopleTab.tsx` kommunikálja az ownership modellt — 3-col board, személycentrikus tételek
- [x] `DashboardTab.tsx` olvashatóbb és fókuszáltabb — 4 KPI + ranked listák
- [x] `git diff dataClient.ts types.ts` — üres, nem változott

Vizsgálat eredménye:
- [x] Pending-instance layer NEM szükséges — UI kompozíció elegendő
- [x] `types.ts` módosítás NEM indokolt Phase 0–4 eredményei alapján
- [x] `dataClient.ts` érintetlen — 0 regresszió kockázat

**Döntési szabály:** Ha az UX cél elérhető UI kompozícióval — ne változtasd a schemát.

---

## Definition of done

- [x] Desktop sidebar navigáció minden oldalon
- [x] `MoneyTab.tsx`: hero kártya, aktív/draft szűrő, collapsed tételek, formatHuf
- [x] `PeopleTab.tsx`: 3 oszlopos board, inspector panel, modal szerkesztés
- [x] `DashboardTab.tsx`: KPI grid, ranked listák, chart CSS var színek
- [x] `SavingsTab.tsx`: goal kártyák progress-szel, aktív/draft vizuálisan
- [x] `dataClient.ts` és `types.ts` Phase 0–4 alatt nem változott
- [x] `npm run typecheck && npm run lint` — 0 hiba, 0 warning
- [ ] Minden téma vizuálisan különböző és használható ← kézzel ellenőrizni (https://koltsegradar.vercel.app)

---

## 🟢 Jó lenne — bővítések

- [ ] **Többnyelvűség (i18n)** — `i18next` integráció
- [ ] **PWA / offline mód** — Vite PWA plugin + service worker
- [ ] **Banki import** — OFX / CSV import bankszámlakivonatból
- [ ] **Értesítések / riasztások** — keret túllépéskor email (Supabase Edge Function)
- [x] **Household megosztás / meghívó** — email-alapú meghívó (v0.5.20)
- [x] **CI/CD pipeline** — GitHub Actions (v0.5.18)
- [x] **Supabase RLS policy audit** — FK javítás, duplikált policy eltávolítás (v0.5.19)

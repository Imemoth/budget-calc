# CLAUDE.md – AI fejlesztési útmutató

Ez a fájl Claude (és más AI asszisztensek) számára tartalmaz projektspecifikus kontextust,
konvenciókat és szabályokat.

## Projekt összefoglaló

**Budget Calc** – háztartási költségvetés-tervező React + TypeScript alkalmazás, Supabase backenddel.
Magyar felhasználói felület. Több személyt (pl. pár, család) kezel egy háztartáson belül.

## Tech stack

- React 19 + TypeScript (strict mode)
- Vite 7 + Tailwind CSS v4
- Supabase (Auth + PostgreSQL DB)
- Recharts (grafikonok), Framer Motion (animációk), Lucide React (ikonok)

## Build / Typecheck parancsok

```bash
npm run dev        # fejlesztői szerver
npm run build      # TypeScript build + Vite bundle
npm run typecheck  # csak tsc, build nélkül
npm run lint       # ESLint
npm run preview    # production preview lokálisan
```

**Fejlesztés előtt és után mindig futtasd:** `npm run typecheck && npm run lint`

## Fájlstruktúra

```
src/
├── App.tsx                    # Fő app: state, autosave, layout, nav
├── types.ts                   # Összes domain típus (re-exportálva App.tsx-ből)
├── auth.tsx                   # AuthContext (useAuth hook, AuthProvider)
├── authscreen.tsx             # Login/Register képernyő
├── dataClient.ts              # Egyetlen Supabase CRUD réteg
├── supabaseClient.ts          # Supabase kliens – createClient<Database>
├── components/
│   ├── ui.tsx                 # Alap UI primitívek (Card, Input, Select, TabButton, MobileNavBtn…)
│   ├── DashboardTab.tsx
│   ├── MoneyTab.tsx           # Bevétel + Kiadás tab (fix sablonok + tranzakciók)
│   ├── SavingsTab.tsx
│   ├── PeopleTab.tsx          # Keresők + kategóriák (reseed gomb)
│   ├── SettingsTab.tsx
│   └── ChangelogModal.tsx
└── lib/
    ├── utils.ts               # Pure helper függvények
    ├── domainHelpers.ts       # expandRecurringForMonth, monthBounds stb.
    ├── version.ts             # APP_VERSION + CHANGELOG konstansok
    └── database.types.ts      # Supabase generált típusok (ne kézzel szerkeszd!)
```

## Kulcsszabályok módosításhoz

### Adatbázis műveletek
- **Minden Supabase hívás a `dataClient.ts`-en keresztül menjen.** Ne hívj
  `supabase.from(...)` direktben App.tsx-ből vagy más komponensből.
- Ha új táblát adsz hozzá: mapper függvényeket adj a `dataClient.ts`-be
  (`mapXxxRow` DB→frontend és `mapXxxToRow` frontend→DB formátumban).
- A `saveStatePatch` csak upsert-el – törléshez külön `deleteXxx(id)` függvényt kell írni.

### Típusok
- Az összes domain típus (`Settings`, `Person`, `Category`, `RecurringItem`,
  `Transaction`, `SavingsBucket`, `State`) a `src/types.ts`-ben van, App.tsx re-exportálja.
  Importálj `../types`-ból a komponensekben.
- Supabase DB row típusok: `src/lib/database.types.ts` (generált, ne kézzel szerkeszd).
  `dataClient.ts`-ben: `type XxxRow = Database["public"]["Tables"]["xxx"]["Row"]`
- Ha a sémát módosítottad: `npx supabase gen types typescript --project-id lvccbfkvwuvnjtpsrzqh > src/lib/database.types.ts`

### UI komponensek
- Az alap UI primitívek (`Card`, `Input`, `Select`, `SmallButton`, `Field`, `TabButton`, `MobileNavBtn`, `Skeleton`, `CategorySelect`, `ConfirmDelete`)
  a `src/components/ui.tsx`-ben vannak. Használd ezeket, ne írj Tailwind-et direktben ismétlődően.
- Stílus: CSS custom properties alapú témák — **NE** használj `bg-slate-*`, `bg-white/`, `text-white/*`, `border-white/*` hardcoded osztályokat.
  Helyettük: `bg-surface`, `bg-surface-2`, `bg-bg`, `text-text-1`, `text-text-2`, `text-text-muted`, `border-border`, `text-primary`, `bg-primary`.
  `rounded-2xl` a kártyákhoz, `rounded-xl` a gombokhoz és inputokhoz.
- Animációkhoz Framer Motion `motion.*` komponenseket és `AnimatePresence`-t használj.

### Auth
- Az auth state-et az `useAuth()` hook adja.
- Household ID-t az `ensureDefaultHousehold(userId)` függvény adja vissza.
- Admin funkciókhoz ellenőrizd: `import.meta.env.VITE_ADMIN_EMAILS.split(',').includes(user.email)`.

### Changelog / verzió
- Minden érdemi változásnál frissítsd a `src/lib/version.ts` fájlt:
  - Növeld az `APP_VERSION` stringet (semver: MAJOR.MINOR.PATCH)
  - Adj hozzá új bejegyzést a `CHANGELOG` objectbe a mai dátummal

## Elkerülendők

- Ne törj meg meglévő Supabase RLS policy-kat – ne próbálj `service_role` key-t használni
  frontend kódban.
- Ne commitolj valódi `.env` értékeket (Supabase URL, kulcsok) – csak `.env.example`-t.
- Ne adj hozzá `console.log`-ot prod kódba; használj `console.warn` / `console.error`-t
  hibakezelésre (és ezeket is csak a `dataClient.ts`-ben).
- Ne hozz létre új helper fájlt egyetlen komponens számára – tegyél általános util-t
  a `lib/utils.ts`-be.

## Ismert tech debt (ne kerüld el, hanem javítsd ha belefutsz)

1. **saveStatePatch nem töröl** – upsert alapú; törléshez külön `deleteXxx(id)` függvények vannak, de batch-delete nincs
2. ~~**Témaváltó nincs implementálva**~~ ✅ KÉSZ (2026-03-11) — CSS custom properties + ThemeSelector + DB szinkron
3. ~~**Theme switcher részben működik — CSS változók hiányoznak**~~ ✅ KÉSZ (2026-03-11) — minden komponens semantic CSS var osztályokra átírva

   **Tünet:** A témák között váltva (Trust Blue / Teal + Slate / Graphite + Emerald)
   csak a dark/light háttér vált, de a komponensek színei nem változnak.
   A light témák (Trust Blue vs Teal + Slate) között vizuálisan semmi különbség nincs.

   **Gyökérok:** A komponensek hardcode-olt Tailwind osztályokat használnak
   (`bg-slate-900`, `bg-white`, `text-gray-600` stb.) CSS custom properties helyett.
   A `data-theme` attribútum felkerül a `<html>`-re, de a komponensek nem figyelnek rá.

   **Implementációs checklist:**

   **Fázis 1 — Infrastruktúra (előfeltétel minden másnak)** ✅ KÉSZ (2026-03-11)
   - [x] `src/styles/themes.css` létrehozása — mind az 5 téma CSS custom properties-szel
         (`--color-bg`, `--color-surface`, `--color-surface-2`, `--color-border`,
          `--color-primary`, `--color-accent`, `--color-text-1`, `--color-text-2`,
          `--color-text-muted`, `--color-positive`, `--color-negative`, `--color-warning`,
          `--color-chart-1..4`) + 2 legacy alias (`dark-neo`, `light`)
   - [x] `src/lib/themes.ts` létrehozása — `ThemeId` union type + `THEMES` tömb metaadatokkal
   - [x] `src/context/ThemeContext.tsx` létrehozása — React context, localStorage,
         `document.documentElement.setAttribute('data-theme', id)`
   - [x] `src/styles/themes.css` importálása `main.tsx`-ben (első importként)
   - [x] `ThemeProvider` wrap `main.tsx`-ben
   - [x] `@theme {}` blokk `themes.css`-ben (Tailwind v4) — semantic osztályok regisztrálva:
         `bg-surface`, `bg-surface-2`, `border-border`, `text-text-1`, `text-text-2`,
         `text-text-muted`, `text-positive`, `text-negative`, `text-warning`
   - [x] Bugfix: `App.tsx` useEffect — `'light'/'dark'` → tényleges téma ID (`setTheme()`)

   **Fázis 2 — ui.tsx komponensek átírása** ✅ KÉSZ (2026-03-11)
   - [x] `Card` komponens: `bg-white/5 border-white/10` → `bg-surface border-border`
   - [x] `Input` komponens: háttér + border + focus ring → CSS változók
   - [x] `Select` komponens: ugyanaz mint Input
   - [x] `SmallButton` / `TabButton` / `MobileNavBtn`: szín osztályok → semantic osztályok
   - [x] `Field` label szín: `text-white/60` → `text-text-2`, hint → `text-text-muted`
   - [x] `RingProgress` SVG track: `rgb(255 255 255/0.08)` → `var(--color-border)`
   - [x] Ellenőrzés: `grep "bg-slate\|bg-gray\|bg-white\|text-white" src/components/ui.tsx`
         → üres eredmény ✓

   **Fázis 3 — App szintű hardcode-olt színek** ✅ KÉSZ (2026-03-11)
   - [x] `App.tsx` header + nav háttér → `bg-surface` / `bg-bg`
   - [x] `App.tsx` rootClass switch → `bg-bg text-text-1`
   - [x] `DashboardTab.tsx` összes `text-white/*`, `bg-white/8` → semantic
   - [x] `MoneyTab.tsx` összes `text-white/*`, `bg-white/5`, `border-white/10` → semantic
   - [x] `SavingsTab.tsx` összes `text-white/*`, `bg-white/10`, `border-white/10` → semantic
   - [x] `SettingsTab.tsx` összes `text-white/*`, `bg-white/5`, `border-white/10` → semantic
   - [x] `PeopleTab.tsx` összes `text-white/*`, `bg-white/5`, `border-white/*`, `bg-black/10` → semantic

   **Fázis 4 — Recharts chart színek** ✅ KÉSZ (2026-03-11)
   - [x] `readVar(name)` helper + `useTheme()` subscribe a `DashboardTab.tsx`-ben
   - [x] `C_INCOME/EXPENSE/NET/BLUE` → `C.income/expense/net/blue` CSS var olvasással
   - [x] `PIE_COLORS` → `C.pie` (c1+c3 téma-függő, középső 6 statikus)
   - [x] `CartesianGrid stroke={C.border} opacity={0.5}`

   **Fázis 5 — ThemeSelector UI + DB szinkron** ✅ KÉSZ (2026-03-11)
   - [x] `src/components/ThemeSelector.tsx` létrehozva — vizuális kártyás választó preview-val
         (5 gomb, mindegyiken bg/surface/primary szín-preview + label + aktív jelző)
   - [x] `SettingsTab.tsx`: meglévő `<select>` dropdown → `<ThemeSelector />` komponens
   - [x] `settings.theme` DB szinkron: `onChange={(id) => updateSettings({ theme: id })}` hook-on keresztül
   - [x] `authscreen.tsx` átírva semantic CSS var osztályokra (bonus — hardcoded slate/white eltávolítva)

   **Fázis 6 — QA** ✅ KÉSZ (2026-03-11)
   - [x] Mind az 5 témát végigkattintani — vizuálisan különböznek-e? ✓
   - [x] Dark témák: kontrasztarány ellenőrzés (szöveg olvasható-e?) ✓
   - [x] Light témák: primary szín látható különbség (kék vs teal vs rózsa) ✓
   - [x] Témaváltás után oldal újratöltés — marad-e a kiválasztott téma? (localStorage) ✓
   - [x] Kijelentkezés + bejelentkezés — DB-ből betöltődik-e a mentett téma? ✓
   - [ ] Mobil nézet: minden témában rendben van-e a kontrast?
   - [x] `npm run typecheck && npm run lint` — 0 hiba ✓

   **Bugfix (2026-03-11):** `src/index.css` body background `#0b0f14` hardcoded → `var(--color-bg, #0b0f14)`.
   Rose Gold és Midnight Purple témák korábban sötéten jelenetek meg mert hiányzott a per-theme body override.

   **Érintett fájlok összesen:**
   - Módosítandó: `ui.tsx`, `App.tsx`, `DashboardTab.tsx`, `MoneyTab.tsx`,
     `SavingsTab.tsx`, `SettingsTab.tsx`, `tailwind.config.ts`, `main.tsx`
   - Létrehozandó: `src/styles/themes.css`, `src/lib/themes.ts`,
     `src/context/ThemeContext.tsx`, `src/components/ThemeSelector.tsx`


## CLI engedélyek

Claude szabadon futtathatja az alábbi CLI eszközöket jóváhagyás nélkül:

- **npm** – `npm run dev/build/typecheck/lint/preview/test` és `npx` parancsok
- **git** – olvasás (`status`, `log`, `diff`); írás (commit, push) csak ha a user kéri
- **Supabase CLI** – `npx supabase ...` (típusgenerálás, migration push, DB dump stb.)
- **Docker / MCP Docker** – böngésző automatizáció (`mcp__MCP_DOCKER__browser_*`) és `mcp__MCP_DOCKER__mcp-exec` diagnosztikai célokra (pl. DB lekérdezés, hálózati teszt)
- **curl / REST API hívások** – Supabase REST API diagnosztikához (service role key kizárólag lokálisan, `.env.local`-ból olvasva, sosem commitolva)

## Git konvenció

- Branch: `feature/<rövid-leírás>` vagy AI session esetén `claude/<leírás>-<session-id>`
- Commit: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefix
- Minden commithoz futtasd: `npm run typecheck && npm run lint`

## Skills
Use the following skills when relevant:
- ~/.claude/skills/uiux-design-skill.skill — for all UI/UX design decisions

---

## UI Redesign Irányvonal

### Cél
A jelenlegi UI "kezdetleges" érzését megszüntetni. Irány: modern fintech app (Revolut/N26 szintű),
web-first de mobilon is tökéletes, React Native-ba is konvertálható később.
Élő oldal: https://koltsegradar.vercel.app

> **FONTOS:** A `settings.theme` mező már létezik a DB-ben — a theme switcher
> implementálása aktív feladat (lásd "Ismert tech debt" #2).

---

### Aktív design döntések

**Lekerekítés** — a `rounded-2xl` már az irány (ui.tsx Card), ezt kell konzisztensen alkalmazni:
```
Fő kártyák:     rounded-2xl  ✓ (már van)
Gombok:         rounded-xl   ← frissítendő (jelenleg rounded-lg / rounded-md)
Input mezők:    rounded-xl   ← frissítendő
Kis badge-ek:   rounded-full
```

**Kártyák sötét módban:**
```tsx
// Alap kártya — már van ui.tsx-ben, tartsuk
bg-slate-900 border border-white/10 rounded-2xl

// Hero / kiemelt kártya (pl. Dashboard summary) — EZ HIÁNYZIK MÉG
bg-emerald-950/20 border border-emerald-500/30 rounded-2xl
// + bal oldali accent: border-l-4 border-l-emerald-500
```

**Szemantikus színek — következetesen alkalmazni mindenhol:**
```
Bevétel / pozitív:    text-emerald-400
Kiadás / negatív:     text-red-400
Megtakarítás:         text-amber-400   ← jelenleg fehér, javítandó!
Másodlagos szöveg:    text-white/60
Muted szöveg:         text-white/40
```

**Ft értékek — mindig tabular-nums:**
```tsx
<span className="font-mono tabular-nums">487 500 Ft</span>
// vagy Tailwind: className="... [font-variant-numeric:tabular-nums]"
```

---

### Theme System Architektúra

A `settings.theme` DB mező már létezik — ezt kell bekötni.
CSS custom properties + `data-theme` attribútum a `<html>` elemen.

**Fájlok létrehozandók:**
```
src/styles/themes.css       ← CSS custom properties minden témához
src/lib/themes.ts           ← téma definíciók + ThemeId típus
src/context/ThemeContext.tsx ← React context, váltó logika, localStorage
src/components/ThemeSelector.tsx ← UI komponens (Beállítások oldalra)
```

**Elérhető témák (előre telepítve):**

| ID | Név | Típus | Primary | Accent |
|----|-----|-------|---------|--------|
| `graphite-emerald` | Graphite Emerald | 🌑 dark | #10B981 | #22C55E |
| `trust-blue` | Trust Blue | ☀️ light | #2563EB | #10B981 |
| `teal-slate` | Teal & Slate | ☀️ light | #0F766E | #14B8A6 |
| `midnight-purple` | Midnight Purple | 🌑 dark | #7C3AED | #A78BFA |
| `rose-gold` | Rose Gold | ☀️ light | #BE123C | #F43F5E |

**Default téma:** `graphite-emerald`

**CSS custom properties séma** (`themes.css`):
```css
[data-theme="graphite-emerald"] {
  --color-bg:           #0D1117;
  --color-surface:      #161B22;
  --color-surface-2:    #1C2333;
  --color-border:       #30363D;
  --color-primary:      #10B981;
  --color-accent:       #22C55E;
  --color-text-1:       #E6EDF3;
  --color-text-2:       #8B949E;
  --color-text-muted:   #484F58;
  --color-positive:     #10B981;
  --color-negative:     #F87171;
  --color-warning:      #FBBF24;
  --color-chart-1:      #1E4D6B;   /* tervezett — muted kék */
  --color-chart-2:      #10B981;   /* tényleges — emerald */
  --color-chart-3:      #FBBF24;   /* megtakarítás — amber */
  --color-chart-4:      #F87171;   /* kiadás — piros */
}

[data-theme="trust-blue"] {
  --color-bg:           #F8FAFC;
  --color-surface:      #FFFFFF;
  --color-surface-2:    #F1F5F9;
  --color-border:       #E2E8F0;
  --color-primary:      #2563EB;
  --color-accent:       #10B981;
  --color-text-1:       #0F172A;
  --color-text-2:       #475569;
  --color-text-muted:   #94A3B8;
  --color-positive:     #10B981;
  --color-negative:     #EF4444;
  --color-warning:      #F59E0B;
  --color-chart-1:      #2563EB;
  --color-chart-2:      #10B981;
  --color-chart-3:      #F59E0B;
  --color-chart-4:      #EF4444;
}

[data-theme="teal-slate"] {
  --color-bg:           #F5F7F8;
  --color-surface:      #FFFFFF;
  --color-surface-2:    #F0F4F5;
  --color-border:       #D1D9DC;
  --color-primary:      #0F766E;
  --color-accent:       #14B8A6;
  --color-text-1:       #111827;
  --color-text-2:       #6B7280;
  --color-text-muted:   #9CA3AF;
  --color-positive:     #0F766E;
  --color-negative:     #DC2626;
  --color-warning:      #D97706;
  --color-chart-1:      #0F766E;
  --color-chart-2:      #14B8A6;
  --color-chart-3:      #D97706;
  --color-chart-4:      #DC2626;
}

[data-theme="midnight-purple"] {
  --color-bg:           #0F0F1A;
  --color-surface:      #1A1A2E;
  --color-surface-2:    #16213E;
  --color-border:       #2A2A4A;
  --color-primary:      #7C3AED;
  --color-accent:       #A78BFA;
  --color-text-1:       #F1F0FF;
  --color-text-2:       #A5A0C0;
  --color-text-muted:   #5C5880;
  --color-positive:     #34D399;
  --color-negative:     #F87171;
  --color-warning:      #FBBF24;
  --color-chart-1:      #7C3AED;
  --color-chart-2:      #34D399;
  --color-chart-3:      #FBBF24;
  --color-chart-4:      #F87171;
}

[data-theme="rose-gold"] {
  --color-bg:           #FDF8F6;
  --color-surface:      #FFFFFF;
  --color-surface-2:    #FEF2EE;
  --color-border:       #F0D9D0;
  --color-primary:      #BE123C;
  --color-accent:       #F43F5E;
  --color-text-1:       #1C0A0A;
  --color-text-2:       #7C4F50;
  --color-text-muted:   #B07A7B;
  --color-positive:     #059669;
  --color-negative:     #BE123C;
  --color-warning:      #D97706;
  --color-chart-1:      #BE123C;
  --color-chart-2:      #059669;
  --color-chart-3:      #D97706;
  --color-chart-4:      #7C3AED;
}
```

**ThemeContext bekötése** (`App.tsx`):
```tsx
// 1. import
import './styles/themes.css';

// 2. ThemeProvider wrap az App root-ban
<ThemeProvider>
  ...
</ThemeProvider>

// 3. ThemeContext olvassa a settings.theme-t és szinkronizálja DB-vel
// Ha a user vált: setTheme() → localStorage + document.documentElement.setAttribute('data-theme', id)
// + mentés Supabase-be: settings.theme frissítése
```

**Új téma hozzáadása:**
1. `themes.css`: új `[data-theme="xyz"] { ... }` blokk
2. `themes.ts`: `ThemeId` union-ba + `THEMES` tömbbe
3. Kész — ThemeSelector automatikusan megjelenik

---

### Recharts chart szabályok

```tsx
// Chart színeket CSS változóból olvassuk — témafüggő!
const style = getComputedStyle(document.documentElement);
const CHART_COLORS = {
  tervezett: style.getPropertyValue('--color-chart-1').trim(),
  tenyleges:  style.getPropertyValue('--color-chart-2').trim(),
  megtakarit: style.getPropertyValue('--color-chart-3').trim(),
  kiadas:     style.getPropertyValue('--color-chart-4').trim(),
};

// Y-tengely formatter — mindig rövidített forma
const yFormatter = (v: number) =>
  v >= 1_000_000 ? `${(v/1_000_000).toFixed(1)}M`
  : v >= 1_000   ? `${Math.round(v/1_000)}K`
  : String(v);

// Grid — subtilis, ne dominálja a chartot
<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" opacity={0.4} />

// Max 2-3 data series egyszerre — NE több
// Legend: alul, max 3 item
```

---

### Oldalak redesign sorrendje

**1. Dashboard** ← AKTUÁLIS
- [ ] Hero summary kártya: `bg-emerald-950/20 border-l-4 border-l-emerald-500`
- [ ] Megtakarítás érték: `text-amber-400` (jelenleg fehér)
- [ ] Chart: max 2 szín, CSS változókból olvasva
- [ ] Y-tengely: `800000` → `800K` formatter
- [ ] Gombok: `rounded-xl`

**2. Bevétel & Kiadás (MoneyTab)**
- [ ] Input mezők: `rounded-xl` + emerald focus ring
- [ ] Tételek listája: date group headerek
- [ ] Összesítő stat sor alul

**3. Megtakarítás (SavingsTab)**
- [ ] Célkártyák: cirkuláris progress, color-coded állapot
- [ ] Hero stat: összes megtakarítás kiemelve

**4. Navigáció & Header**
- [ ] Desktop nav: aktív tab = emerald underline
- [ ] Mobil: aktív ikon emerald tint
- [ ] Header jobb: email → avatar + dropdown

**5. Theme Switcher (SettingsTab)**
- [ ] ThemeSelector komponens a Beállítások oldalon
- [ ] settings.theme szinkronizálás DB-vel

---

### Mobil specifikus szabályok

- Touch target minimum: `min-h-[44px]` minden interaktív elemen
- Kártyák mobilon: `p-4` (nem `p-6`)
- Header subtitle: `hidden sm:block`
- Export/Import: mobilon `···` menübe kerül
- Chart Y-tengely mobilon: `fontSize: 10`, rövidített formátum kötelező

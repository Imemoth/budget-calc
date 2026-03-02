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
├── App.tsx           # Fő app + összes tab UI (monolitikus – refaktorálandó)
├── auth.tsx          # AuthContext (useAuth hook, AuthProvider)
├── authscreen.tsx    # Login/Register képernyő
├── dataClient.ts     # Egyetlen Supabase CRUD réteg
├── supabaseClient.ts # Supabase kliens (env alapon)
└── lib/
    ├── utils.ts      # Pure helper függvények
    └── version.ts    # APP_VERSION + CHANGELOG konstansok
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
  `Transaction`, `SavingsBucket`, `State`) az `App.tsx`-ben van definiálva és
  re-exportálva. Importálj innen, ne duplikálj.
- Kerüld az `any` típust – ha Supabase row-t kapsz, definiálj explicit interface-t
  vagy használj `unknown`-t + type guardot.

### UI komponensek
- Az alap UI primitívek (`Card`, `Input`, `Select`, `SmallButton`, `Field`, `TabButton`)
  az `App.tsx` aljában vannak. Használd ezeket, ne írj Tailwind-et direktben ismétlődően.
- Stílus: sötét téma (`bg-slate-950`, `bg-slate-900`), `text-white/70` az alvó elemek,
  `rounded-2xl` a kártyákhoz, `border-white/10` a keretek.
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

1. **App.tsx monolitikus** – a tabokat külön fájlokba kell szétbontani (`src/components/`)
2. **saveStatePatch nem töröl** – törlés után az adatok orphan-ként maradnak a DB-ben
3. **`any` típusok a mapperekben** – Supabase generált típusokkal (`supabase gen types`) kell felváltani
4. **Nincs teszt** – Vitest + RTL infrastruktúra hiányzik
5. **Csak `"monthly"` cadence** – `RecurringItem.cadence` típusa bővítendő

## Git konvenció

- Branch: `feature/<rövid-leírás>` vagy AI session esetén `claude/<leírás>-<session-id>`
- Commit: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefix
- Minden commithoz futtasd: `npm run typecheck && npm run lint`

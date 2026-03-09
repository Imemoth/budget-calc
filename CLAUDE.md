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

1. **saveStatePatch nem töröl** – upsert alapú; törléshez külön `deleteXxx(id)` függvények vannak, de batch-delete nincs
2. **Témaváltó nincs implementálva** – `settings.theme` mező létezik DB-ben, de a tényleges light/dark váltás hiányzik

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
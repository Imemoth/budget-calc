# CLAUDE.md – AI fejlesztési útmutató

Ez a fájl Claude (és más AI asszisztensek) számára tartalmaz projektspecifikus kontextust,
konvenciókat és szabályokat.

**Last updated: 2026-03-03**

---

## Projekt összefoglaló

**Budget Calc** – háztartási költségvetés-tervező React + TypeScript alkalmazás, Supabase backenddel.
Magyar felhasználói felület. Több személyt (pl. pár, család) kezel egy háztartáson belül.

---

## Jelenlegi állapot (Current State)

### Működik
- Supabase Auth (login / register / logout / forgot password)
- Household provisioning + RLS-alapú adatizoláció
- Teljes CRUD: people, categories, recurring items, transactions, savings buckets
- **Törlés DB-szinkronizálva** – delete azonnal fut Supabase-be (nem csak helyi state)
- Autosave debounce (1500ms) + logout előtti azonnali flush
- localStorage fallback offline/hiba esetén
- React Error Boundary – render hiba esetén barátságos hibaképernyő
- Changelog modal (version.ts alapon)
- typecheck ✓ · lint ✓ (0 hiba, 0 warning)

### Folyamatban / következő
- App.tsx feldarabolása komponensekre (`src/components/`)
- Törlés megerősítő dialóg UI-ban
- Loading skeleton/spinner

### Ismert hiányosságok
- Teszt infrastruktúra hiányzik (Vitest + RTL)
- Csak `"monthly"` cadence támogatott
- Nincs mobilnézet optimalizálás

---

## Tech stack

- React 19 + TypeScript (strict mode)
- Vite 7 + Tailwind CSS v4
- Supabase (Auth + PostgreSQL DB)
- Recharts (grafikonok), Framer Motion (animációk), Lucide React (ikonok)

---

## Build / Typecheck parancsok

```bash
npm run dev        # fejlesztői szerver
npm run build      # TypeScript build + Vite bundle
npm run typecheck  # csak tsc, build nélkül
npm run lint       # ESLint
npm run preview    # production preview lokálisan
```

**Fejlesztés előtt és után mindig futtasd:** `npm run typecheck && npm run lint`

---

## Fájlstruktúra

```
src/
├── App.tsx             # Fő app + összes tab UI (monolitikus – refaktorálandó)
├── auth.tsx            # AuthContext (useAuth hook, AuthProvider, resetPassword)
├── authscreen.tsx      # Login/Register/ForgotPassword képernyő (3 mód: login|register|forgot)
├── dataClient.ts       # Egyetlen Supabase CRUD réteg (load, saveStatePatch, deleteXxx)
├── supabaseClient.ts   # Supabase kliens (env alapon)
├── ErrorBoundary.tsx   # React Error Boundary class component
├── main.tsx            # App belépési pont (ErrorBoundary > AuthProvider > App)
└── lib/
    ├── utils.ts        # Pure helper függvények (mergeDeep, uid, monthKey, stb.)
    └── version.ts      # APP_VERSION + CHANGELOG konstansok
.env.example            # Szükséges env változók dokumentálva (valódi értékek nélkül)
```

---

## Kulcsszabályok módosításhoz

### Adatbázis műveletek
- **Minden Supabase hívás a `dataClient.ts`-en keresztül menjen.** Ne hívj
  `supabase.from(...)` direktben App.tsx-ből vagy más komponensből.
- Ha új táblát adsz hozzá: mapper függvényeket adj a `dataClient.ts`-be
  (`mapXxxRow` DB→frontend és `mapXxxToRow` frontend→DB formátumban).
  Definiálj explicit `XxxRow` interface-t (ne `any`) a mapper paraméterének.
- A `saveStatePatch` csak upsert-el – **törléshez** külön `deleteXxx(id)` függvényt kell írni
  (lásd: `deletePerson`, `deleteCategory`, `deleteRecurring`, `deleteTransaction`, `deleteSavings`).
- Remove műveletek az App.tsx-ben **aszinkronok**: előbb `setState`, majd `await deleteXxx(id)`.

### Típusok
- Az összes domain típus (`Settings`, `Person`, `Category`, `RecurringItem`,
  `Transaction`, `SavingsBucket`, `State`) az `App.tsx`-ben van definiálva és
  re-exportálva. Importálj innen, ne duplikálj.
- Kerüld az `any` típust – ha Supabase row-t kapsz, definiálj explicit `XxxRow` interface-t
  a `dataClient.ts`-ben (lásd a meglévő `HouseholdRow`, `PersonRow`, stb. mintákat).

### React Hooks szabály – KRITIKUS
- **Soha ne tegyél korai `return`-t hookók közé.** Az összes `useState`, `useMemo`,
  `useEffect`, `useRef` hívásnak a komponens elejére kell kerülnie, bármilyen feltételes
  rendering ELŐTT. Az auth gating (`if (loading)`, `if (!user)`) csak az **összes hook után**
  szerepelhet – ez az App.tsx-ben a `// -------------------- auth gating --------------------`
  komment után van (~1210. sor).

### Auth
- Az auth state-et az `useAuth()` hook adja (AuthContext-ből).
- Household ID-t az `ensureDefaultHousehold(userId)` függvény adja vissza.
- Admin funkciókhoz ellenőrizd: `import.meta.env.VITE_ADMIN_EMAILS.split(',').includes(user.email)`.
- `resetPassword(email)` elérhető az `useAuth()` hook-on keresztül (Supabase `resetPasswordForEmail`).

### Autosave
- Az autosave 1500ms debounce-szal fut (`state` változásakor), csak `remoteReady === true` után.
- `handleLogout` a `signOut()` előtt **azonnal ment** (`saveStatePatch`) és törli a pending timert –
  ne változtasd meg ezt a sorrendet.
- `localStorage` szinkron backup minden state-változásra (fallback Supabase hiba esetén).

### UI komponensek
- Az alap UI primitívek (`Card`, `Input`, `Select`, `SmallButton`, `Field`, `TabButton`)
  az `App.tsx` aljában vannak. Használd ezeket, ne írj Tailwind-et direktben ismétlődően.
- Stílus: sötét téma (`bg-slate-950`, `bg-slate-900`), `text-white/70` az alvó elemek,
  `rounded-2xl` a kártyákhoz, `border-white/10` a keretek.
- Animációkhoz Framer Motion `motion.*` komponenseket és `AnimatePresence`-t használj.

### Changelog / verzió
- Minden érdemi változásnál frissítsd a `src/lib/version.ts` fájlt:
  - Növeld az `APP_VERSION` stringet (semver: MAJOR.MINOR.PATCH)
  - Adj hozzá új bejegyzést a `CHANGELOG` objectbe a mai dátummal

---

## Elkerülendők

- Ne törj meg meglévő Supabase RLS policy-kat – ne próbálj `service_role` key-t használni
  frontend kódban.
- Ne commitolj valódi `.env` értékeket (Supabase URL, kulcsok) – csak `.env.example`-t.
- Ne adj hozzá `console.log`-ot prod kódba; használj `console.warn` / `console.error`-t
  hibakezelésre (és ezeket is csak a `dataClient.ts`-ben).
- Ne hozz létre új helper fájlt egyetlen komponens számára – tegyél általános util-t
  a `lib/utils.ts`-be.
- Ne helyezz korai `return`-t hookók közé – Rules of Hooks violation, runtime crash.

---

## Ismert tech debt (ne kerüld el, hanem javítsd ha belefutsz)

1. **App.tsx monolitikus** – a tabokat külön fájlokba kell szétbontani (`src/components/`)
2. **Nincs teszt** – Vitest + RTL infrastruktúra hiányzik
3. **Csak `"monthly"` cadence** – `RecurringItem.cadence` típusa bővítendő (`"yearly"`, `"quarterly"`)
4. **Típusok: Supabase generált** – a kézzel írt `XxxRow` interface-ek helyett
   `supabase gen types typescript` lenne az ideális hosszú távon
5. **Törlés megerősítő dialóg** – nincs UI-szintű confirm lépés törlés előtt

*(Korábban ide tartozó, már megoldott tételek: saveStatePatch törlés, any típusok a mapperekben)*

---

## Git konvenció

- Branch: `feature/<rövid-leírás>` vagy AI session esetén `claude/<leírás>-<session-id>`
- Commit: `feat:`, `fix:`, `refactor:`, `docs:`, `chore:` prefix
- Minden commithoz futtasd: `npm run typecheck && npm run lint`

---

## Session Log (utolsó 5)

- **2026-03-03** (`claude/process-todo-critical-8HTVH`): Összes kritikus TODO elvégezve.
  - `fix` Törlés DB-szinkron: `deletePerson/Category/Recurring/Transaction/Savings` a `dataClient.ts`-be;
    `remove*` függvények aszinkronná téve App.tsx-ben.
  - `chore` `.env.example` létrehozva; `.gitignore` kivétel hozzáadva.
  - `feat` Elfelejtett jelszó: `resetPassword` auth.tsx-be; `AuthScreen` `"forgot"` mód.
  - `feat` `ErrorBoundary` class component; `main.tsx`-be csomagolva.
  - `fix` React hooks order violation (App.tsx): korai return-ök eltávolítva a hookók közül
    → megszüntette a „Rendered more hooks" runtime crash-t bejelentkezésnél.
  - `fix` Összes lint hiba: `any` → explicit `XxxRow` interface-ek (dataClient.ts),
    `no-empty`, unused eslint-disable, `react-refresh` (auth.tsx), `mergeDeep` (utils.ts).
  - `fix` Autosave flush logout előtt: `handleLogout` most pending timert töröl + azonnal ment.
  - `APP_VERSION`: 0.4.0 → 0.5.1

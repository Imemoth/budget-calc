# Budget Calc – Háztartási Költségvetés Tervező

Egy React + TypeScript alapú, Supabase-t használó háztartási pénzügyi tervező alkalmazás.
Több személy bevételeit és kiadásait kezeli, ismétlődő tételekkel, megtakarítási célokkal és interaktív grafikonokkal.

## Jelenlegi verzió

`v0.5.10` – 2026-03-09

## Funkciók

- **Bejelentkezés / Regisztráció** – Supabase Auth (email + jelszó), elfelejtett jelszó visszaállítás
- **Dashboard** – havi összesítő, bevétel vs kiadás grafikonok (bar, line, pie)
- **Bevétel / Kiadás tab** – fix sablonok (tervezett) és tényleges tételek egy helyen
- **Fix tételek** – ismétlődő bevételek/kiadások havi / negyedéves / éves cadence-szel, start/end hónappal
- **Tételszűrő és keresés** – hónap- és szabad szöveges szűrő a tényleges tételek között
- **Hierarchikus kategóriák** – szülő / alkategória struktúra, ~75 alap seed kategória
- **Megtakarítások** – célalapú megtakarítási keretek, tervezett havi befizetéssel
- **Személyek** – több keresőhöz igazítható (pl. pár, család)
- **Beállítások** – pénznem, időhorizont, deviza választó, changelog modal
- **Admin reset** – adminok részére teljes adattörlés (`VITE_ADMIN_EMAILS`)
- **Household provisioning** – automatikus háztartás-létrehozás első bejelentkezéskor
- **Mobile bottom navigation** – érintésbarát bottom nav mobilon, responsive toolbar
- **Local-wins szinkron** – ha Supabase üres, a helyi adatok megmaradnak; UUID-alapú ID-k

## Technológiai stack

| Réteg | Technológia |
|---|---|
| Frontend keretrendszer | React 19 + TypeScript |
| Build tool | Vite 7 |
| Stílus | Tailwind CSS v4 |
| Backend / Auth / DB | Supabase |
| Grafikonok | Recharts |
| Animációk | Framer Motion |
| Ikonok | Lucide React |

## Adatbázis-struktúra (Supabase)

| Tábla | Leírás |
|---|---|
| `households` | Háztartás, beállítások (currency, horizon_months, start_month, theme) |
| `household_members` | User ↔ household kapcsolótábla |
| `people` | Személyek a háztartáson belül |
| `categories` | Bevételi/kiadási kategóriák (parentId: hierarchikus struktúra) |
| `recurring_items` | Ismétlődő tételek (monthly / quarterly / yearly cadence) |
| `transactions` | Egyszeri tranzakciók |
| `savings_buckets` | Megtakarítási célok |

## Gyors start

### 1. Függőségek telepítése

```bash
npm install
```

### 2. Környezeti változók

Hozd létre a `.env.local` fájlt (`.env.example` alapján):

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_ADMIN_EMAILS=admin@example.com,masik@example.com
```

### 3. Fejlesztői szerver indítása

```bash
npm run dev
```

### 4. Build

```bash
npm run build
```

### 5. Typecheck / Lint

```bash
npm run typecheck
npm run lint
```

## Mappastruktúra

```
src/
├── App.tsx                    # Fő app: state, autosave, layout, nav
├── types.ts                   # Összes domain típus
├── auth.tsx                   # AuthContext + AuthProvider
├── authscreen.tsx             # Bejelentkezési képernyő
├── dataClient.ts              # Supabase CRUD réteg (loadFullStateForUser, saveStatePatch, deleteXxx)
├── supabaseClient.ts          # Supabase kliens inicializálása
├── main.tsx                   # React entry point
├── components/
│   ├── ui.tsx                 # Alap UI primitívek (Card, Input, Select, TabButton, MobileNavBtn…)
│   ├── DashboardTab.tsx
│   ├── MoneyTab.tsx           # Bevétel + Kiadás tab (fix sablonok + tranzakciók)
│   ├── SavingsTab.tsx
│   ├── PeopleTab.tsx          # Keresők + kategóriák (reseed gomb)
│   ├── SettingsTab.tsx
│   └── ChangelogModal.tsx
└── lib/
    ├── utils.ts               # Pure helper függvények (uid, formatHUF, monthKey stb.)
    ├── domainHelpers.ts       # expandRecurringForMonth, monthBounds, dátum/szám normalizálás
    ├── version.ts             # APP_VERSION + CHANGELOG konstansok
    └── database.types.ts      # Supabase generált típusok (ne kézzel szerkeszd!)
```

## Env változók

| Változó | Kötelező | Leírás |
|---|---|---|
| `VITE_SUPABASE_URL` | igen | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | igen | Supabase anon (public) key |
| `VITE_ADMIN_EMAILS` | nem | Vesszővel elválasztott admin email lista |
| `VITE_SUPABASE_SERVICE_ROLE_KEY` | nem | Csak lokális diagnosztikához; sosem commitolni |

## Hozzájárulás

1. Fejleszts feature branch-en (`feature/...` vagy a `claude/...` AI branch konvencióval)
2. Kövesd a meglévő TypeScript típusokat
3. Minden Supabase műveletet a `dataClient.ts`-n keresztül végezz
4. Commitolás előtt futtasd: `npm run typecheck && npm run lint`

import { APP_VERSION } from "../lib/version";
import type { Settings } from "../types";
import { Card, Field, Input, Select } from "./ui";
import { normalizeMonthInput, parseNonNegativeInput } from "../lib/domainHelpers";

export function SettingsView({
  settings,
  updateSettings,
}: {
  settings: Settings;
  updateSettings: (patch: Partial<Settings>) => void;
}) {
  const { startMonth, horizonMonths, currency } = settings;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
      <Card className="p-5">
        <div className="text-sm text-white/60">Időtáv és pénznem</div>
        <div className="text-lg font-semibold">Alap beállítások</div>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Kezdő hónap" hint="YYYY-MM">
            <Input
              type="month"
              value={startMonth || ""}
              onChange={(e) =>
                updateSettings({
                  startMonth: normalizeMonthInput(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Látható hónapok száma" hint="3-60">
            <Input
              type="number"
              min={3}
              max={60}
              value={horizonMonths ?? 18}
              onChange={(e) => {
                const n = parseNonNegativeInput(e.target.value);
                const clamped = Math.min(60, Math.max(3, n || 18));
                updateSettings({ horizonMonths: clamped });
              }}
            />
          </Field>
          <Field label="Pénznem">
            <Select
              value={currency || "HUF"}
              onChange={(e) => updateSettings({ currency: e.target.value })}
            >
              <option value="HUF">HUF</option>
              <option value="EUR">EUR</option>
              <option value="USD">USD</option>
            </Select>
          </Field>
          <Field label="Megjelenés">
            <Select
              value={settings.theme ?? "dark-neo"}
              onChange={(e) => updateSettings({ theme: e.target.value })}
            >
              <option value="dark-neo">Sötét (Dark Neo)</option>
              <option value="graphite-emerald">Graphite + Emerald</option>
              <option value="light">Világos</option>
              <option value="trust-blue">Trust Blue + Mint</option>
              <option value="teal-slate">Teal + Slate</option>
            </Select>
          </Field>
        </div>

        <div className="mt-4 text-[11px] text-white/40">
          Ha 2026-ra akarsz előretervezni, állítsd a kezdő hónapot 2026-01-re, és a horizontot 12 vagy 18 hónapra.
        </div>
      </Card>

      <Card className="p-5 flex flex-col justify-between">
        <div>
          <div className="text-sm text-white/60">Alkalmazás</div>
          <div className="text-lg font-semibold">Verzió</div>
          <div className="mt-3 text-sm text-white/80">
            Budget planner <span className="font-mono">v{APP_VERSION}</span>
          </div>
        </div>
        <div className="mt-4 text-[11px] text-white/40">
          Az adataid a böngésző <b>localStorage</b>-ében vannak tárolva.
          Ha törlöd a böngésző adatait, a költségvetés is törlődik.
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm text-white/60">Gyors útmutató</div>
        <div className="text-lg font-semibold">Ajánlott használat</div>

        <ol className="mt-4 space-y-2 text-sm text-white/70 list-decimal list-inside">
          <li>Lépj a <b>Keresők & kategóriák</b> fülre, és állítsd be a 2 (vagy később 3) személyt.</li>
          <li>A <b>Fix tételek</b> fülön add meg a 2026-os fix bevételeket és kiadásokat start: 2026-01, end: 2026-12.</li>
          <li>A <b>Megtakarítás</b> fülön állíts be külön keretet (pl. felújítás), havi tervvel.</li>
          <li>A <b>Dashboard</b> azonnal mutatja a tervezett havi nettót.</li>
          <li>A valós költéseket/bevételeket a <b>Tételek</b> fülön rögzítsd.</li>
        </ol>
      </Card>
    </div>
  );
}

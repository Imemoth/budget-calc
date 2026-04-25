import { useRef, useState } from "react";
import { Upload, X, Check, AlertCircle } from "lucide-react";
import { parseRevolutCsv, type ParsedRevolutTx } from "../lib/revolutParser";
import { formatHuf } from "../lib/format";
import { getCategoryIcon } from "../lib/categoryIcons";
import { ModalOverlay, SmallButton } from "./ui";
import type { State, MoneyType, Transaction } from "../types";

interface ImportRow extends ParsedRevolutTx {
  selected: boolean;
  categoryId: string | null;
  personId: string | null;
}

export function RevolutImportButton({
  state,
  addTransactionFull,
}: {
  state: State;
  addTransactionFull: (patch: Partial<Transaction> & { type: MoneyType }) => string;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ImportRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [done, setDone] = useState(false);

  function handleFile(file: File) {
    setError(null);
    setDone(false);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = parseRevolutCsv(text);
        if (!parsed.length) {
          setError("Nem találtam importálható tranzakciót a fájlban.");
          return;
        }
        // Auto-assign categoryId from suggested category name
        const mapped: ImportRow[] = parsed.map(p => {
          const cat = state.categories.find(c =>
            c.type === p.moneyType &&
            c.name.toLowerCase().includes(p.suggestedCategory?.split(" ")[0]?.toLowerCase() ?? "")
          ) ?? null;
          return { ...p, selected: true, categoryId: cat?.id ?? null, personId: null };
        });
        setRows(mapped);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Hiba a fájl feldolgozása során.");
      }
    };
    reader.readAsText(file, "utf-8");
  }

  function handleImport() {
    if (!rows) return;
    setImporting(true);
    const selected = rows.filter(r => r.selected);
    selected.forEach(r => {
      addTransactionFull({
        type: r.moneyType,
        name: r.description,
        amount: r.amount,
        date: r.date,
        categoryId: r.categoryId,
        personId: r.personId,
        notes: `Revolut import · ${r.revolType}`,
      });
    });
    setImporting(false);
    setDone(true);
    setTimeout(() => { setRows(null); setDone(false); }, 1500);
  }

  const selectedCount = rows?.filter(r => r.selected).length ?? 0;
  const incomeSum  = rows?.filter(r => r.selected && r.moneyType === "income").reduce((s,r) => s+r.amount, 0) ?? 0;
  const expenseSum = rows?.filter(r => r.selected && r.moneyType === "expense").reduce((s,r) => s+r.amount, 0) ?? 0;

  return (
    <>
      <SmallButton variant="solid"
        onClick={() => fileRef.current?.click()}
        title="Revolut CSV importálása">
        <Upload className="w-3.5 h-3.5" />
        Revolut import
      </SmallButton>

      <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }} />

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-3 rounded-xl border text-sm"
          style={{ background: "var(--color-surface)", borderColor: "var(--color-negative)", color: "var(--color-negative)", boxShadow: "var(--shadow-card)" }}>
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
          <button type="button" onClick={() => setError(null)} className="ml-2">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Preview modal */}
      {rows && (
        <ModalOverlay onClose={() => setRows(null)}>
          <div
            className="relative w-full max-w-3xl rounded-2xl border border-border overflow-hidden z-10 flex flex-col"
            style={{
              background: "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
              boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35)",
              maxHeight: "90vh",
            }}
          >
            {/* Fejléc */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
              <div>
                <div className="text-xs text-text-muted uppercase tracking-wide mb-0.5">Revolut CSV import</div>
                <div className="text-base font-bold text-text-1">
                  {done ? "✓ Sikeresen importálva!" : `${rows.length} tranzakció található`}
                </div>
              </div>
              <button type="button" onClick={() => setRows(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-1 hover:bg-surface-2 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Összesítő */}
            <div className="px-6 py-3 border-b border-border flex items-center gap-6 text-sm shrink-0"
              style={{ background: "var(--color-surface-2)30" }}>
              <span className="text-text-muted">{selectedCount} kiválasztva</span>
              {incomeSum > 0 && (
                <span style={{ color: "var(--color-positive)" }}>+{formatHuf(incomeSum)}</span>
              )}
              {expenseSum > 0 && (
                <span style={{ color: "var(--color-negative)" }}>−{formatHuf(expenseSum)}</span>
              )}
              <div className="ml-auto flex items-center gap-2">
                <button type="button"
                  onClick={() => setRows(r => r?.map(row => ({ ...row, selected: true })) ?? null)}
                  className="text-xs text-text-muted hover:text-primary transition-colors">Mind</button>
                <button type="button"
                  onClick={() => setRows(r => r?.map(row => ({ ...row, selected: false })) ?? null)}
                  className="text-xs text-text-muted hover:text-primary transition-colors">Egyik sem</button>
              </div>
            </div>

            {/* Lista */}
            <div className="overflow-y-auto flex-1">
              {/* Tábla fejléc */}
              <div className="grid px-4 py-2 text-[10px] font-bold text-text-muted uppercase tracking-wider border-b border-border/50 sticky top-0"
                style={{ gridTemplateColumns: "32px 36px 1fr 120px 80px 100px", background: "var(--color-surface)" }}>
                <div />
                <div />
                <div>Leírás</div>
                <div>Kategória</div>
                <div>Dátum</div>
                <div className="text-right">Összeg</div>
              </div>

              {rows.map((row, i) => (
                <div key={i}
                  className="grid items-center px-4 py-2.5 border-b border-border/30 transition-colors hover:bg-surface-2/30"
                  style={{ gridTemplateColumns: "32px 36px 1fr 120px 80px 100px",
                    opacity: row.selected ? 1 : 0.4 }}>

                  {/* Checkbox */}
                  <button type="button" onClick={() => setRows(r => r?.map((row2, j) => j === i ? { ...row2, selected: !row2.selected } : row2) ?? null)}
                    className="w-5 h-5 rounded border-2 flex items-center justify-center transition-colors"
                    style={{
                      borderColor: row.selected ? "var(--color-primary)" : "var(--color-border)",
                      background: row.selected ? "var(--color-primary)" : "transparent",
                    }}>
                    {row.selected && <Check className="w-3 h-3 text-white" />}
                  </button>

                  {/* Ikon */}
                  {getCategoryIcon("", row.moneyType)}

                  {/* Leírás */}
                  <div className="min-w-0 pr-2">
                    <div className="text-sm font-medium text-text-1 truncate">{row.description}</div>
                    <div className="text-[10px] text-text-muted">{row.revolType}</div>
                  </div>

                  {/* Kategória selector */}
                  <div className="pr-2">
                    <select
                      value={row.categoryId ?? ""}
                      onChange={e => setRows(r => r?.map((row2, j) => j === i ? { ...row2, categoryId: e.target.value || null } : row2) ?? null)}
                      className="w-full text-[11px] rounded-lg border border-border px-1.5 py-1"
                      style={{ background: "var(--color-surface-2)", color: "var(--color-text-2)" }}
                    >
                      <option value="">(nincs)</option>
                      {state.categories
                        .filter(c => c.type === row.moneyType && !c.parentId)
                        .map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                    </select>
                  </div>

                  {/* Dátum */}
                  <div className="text-xs text-text-muted">{row.date.slice(5)}</div>

                  {/* Összeg */}
                  <div className="text-sm font-bold tabular-nums text-right"
                    style={{ color: row.moneyType === "income" ? "var(--color-positive)" : "var(--color-negative)" }}>
                    {row.moneyType === "income" ? "+" : "−"}{formatHuf(row.amount)}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-border shrink-0"
              style={{ background: "var(--color-surface-2)20" }}>
              <div className="text-xs text-text-muted">
                {selectedCount} tétel kerül rögzítésre
              </div>
              <div className="flex items-center gap-2">
                <SmallButton variant="ghost" onClick={() => setRows(null)}>Mégsem</SmallButton>
                <SmallButton variant="primary"
                  onClick={handleImport}
                  disabled={selectedCount === 0 || importing || done}>
                  {done ? <><Check className="w-3.5 h-3.5" />Importálva!</>
                    : importing ? "Importálás..."
                    : <><Upload className="w-3.5 h-3.5" />{selectedCount} tétel importálása</>}
                </SmallButton>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </>
  );
}

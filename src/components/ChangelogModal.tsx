import { APP_VERSION, CHANGELOG } from "../lib/version";
import { SmallButton } from "./ui";

export function ChangelogModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;

  const entry = CHANGELOG[APP_VERSION];

  return (
    <div className="fixed inset-0 z-50">
      <button
        className="absolute inset-0 bg-black/60"
        onClick={onClose}
        aria-label="Bezárás"
      />
      <div className="absolute left-1/2 top-1/2 w-[min(720px,92vw)] -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-border bg-bg p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-xs text-text-muted">Verzió</div>
            <div className="text-lg font-semibold text-text-1">v{APP_VERSION}</div>
            {entry?.date && (
              <div className="text-xs text-text-muted mt-1">{entry.date}</div>
            )}
          </div>
          <SmallButton variant="ghost" onClick={onClose}>
            Bezárás
          </SmallButton>
        </div>

        <div className="mt-4">
          <div className="text-sm text-text-2 mb-2">
            Újdonságok ebben a verzióban
          </div>

          {entry?.changes?.length ? (
            <ul className="space-y-2">
              {(entry.changes as string[]).map((c: string, i: number) => (
                <li key={i} className="text-sm text-text-1 flex gap-2">
                  <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-surface shrink-0" />
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-sm text-text-muted">
              Nincs bejegyzés ehhez a verzióhoz.
            </div>
          )}

          <div className="mt-5 pt-4 border-t border-border">
            <div className="text-xs text-text-muted mb-2">Korábbi verziók</div>
            <div className="flex flex-wrap gap-2">
              {Object.keys(CHANGELOG)
                .sort((a, b) => (a < b ? 1 : -1))
                .map((v) => (
                  <span
                    key={v}
                    className="text-xs rounded-full border border-border bg-surface-2 px-2 py-1 text-text-2"
                  >
                    v{v}
                  </span>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

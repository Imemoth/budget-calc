import React, { useState } from "react";
import { Trash2 } from "lucide-react";
import type { Category } from "../types";

export const TabButton = ({
  active,
  icon: Icon,
  children,
  onClick,
}: {
  active?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={
      active
        ? "relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold text-primary " +
          "after:absolute after:bottom-0 after:inset-x-2 after:h-0.5 after:bg-primary after:rounded-full " +
          "transition-colors duration-150"
        : "flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium " +
          "text-text-2 hover:text-text-1 hover:bg-surface-2 rounded-t-lg " +
          "transition-colors duration-150"
    }
  >
    {Icon ? <Icon className="w-4 h-4" /> : null}
    <span>{children}</span>
  </button>
);

export const Card = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`rounded-2xl border border-border relative overflow-hidden ${className}`}
    style={{
      background: "linear-gradient(145deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
      boxShadow: "var(--shadow-card)",
    }}
  >
    {/* Felső fény-csík minden kártyán */}
    <div
      className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)" }}
    />
    {children}
  </div>
);

/** Modal overlay wrapper — egységes háttér + blur */
export const ModalOverlay = ({
  onClose,
  children,
}: {
  onClose: () => void;
  children: React.ReactNode;
}) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pb-20 landscape:pb-4 lg:pb-4">
    <div
      className="absolute inset-0"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(8px)" }}
      onClick={onClose}
    />
    {children}
  </div>
);

/** Modal panel — egységes kártya a felugró ablakoknál */
export const ModalPanel = ({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={`relative w-full max-w-md rounded-2xl border border-border overflow-hidden z-10 max-h-[85dvh] flex flex-col ${className}`}
    style={{
      background: "linear-gradient(160deg, var(--color-surface) 0%, var(--color-surface-2) 100%)",
      boxShadow: "0 24px 64px rgba(0,0,0,0.55), 0 4px 16px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.07)",
    }}
  >
    {/* Felső fény-csík */}
    <div
      className="absolute top-0 left-0 right-0 h-px pointer-events-none z-10"
      style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
    />
    {children}
  </div>
);

export const Field = ({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) => (
  <label className="block min-w-0">
    <div className="text-xs text-text-2 mb-1 flex items-center gap-2">
      <span>{label}</span>
      {hint ? (
        <span className="text-[10px] text-text-muted">{hint}</span>
      ) : null}
    </div>
    {children}
  </label>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={
      "w-full min-w-0 min-h-11 rounded-xl bg-surface-2 border border-border px-3 py-2 text-sm text-text-1 placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/40 " +
      (props.className || "")
    }
  />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={
      "w-full min-h-11 rounded-xl bg-surface-2 border border-border px-3 py-2 text-sm text-text-1 focus:outline-none focus:ring-2 focus:ring-primary/40 " +
      (props.className || "")
    }
  />
);

export const SmallButton = ({
  variant = "ghost",
  children,
  ...rest
}: {
  variant?: "ghost" | "solid" | "danger" | "primary";
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const base =
    "px-3 py-1.5 rounded-xl text-xs font-medium transition inline-flex items-center gap-1 border";
  const styles =
    variant === "solid"
      ? "bg-surface-2 hover:bg-surface border-border text-text-1"
      : variant === "danger"
      ? "bg-negative/8 hover:bg-negative/15 border-negative/25 text-negative"
      : variant === "primary"
      ? "bg-primary/10 hover:bg-primary/20 border-primary/30 text-primary"
      : "bg-surface hover:bg-surface-2 border-border text-text-2 hover:text-text-1";
  return (
    <button className={`${base} ${styles}`} {...rest}>
      {children}
    </button>
  );
};

export const ConfirmDelete = ({
  onConfirm,
  disabled,
  title,
}: {
  onConfirm: () => void;
  disabled?: boolean;
  title?: string;
}) => {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-text-2">Biztosan törlöd?</span>
        <SmallButton
          variant="danger"
          onClick={() => { onConfirm(); setConfirming(false); }}
        >
          Igen
        </SmallButton>
        <SmallButton variant="ghost" onClick={() => setConfirming(false)}>
          Mégsem
        </SmallButton>
      </div>
    );
  }

  return (
    <SmallButton
      variant="danger"
      onClick={() => setConfirming(true)}
      disabled={disabled}
      title={title}
    >
      <Trash2 className="w-3.5 h-3.5" /> Törlés
    </SmallButton>
  );
};

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`animate-pulse bg-surface-2 rounded-xl ${className}`} />
);

export const CategorySelect = ({
  value,
  onChange,
  categories,
  className,
}: {
  value: string;
  onChange: (id: string) => void;
  categories: Category[];
  className?: string;
}) => {
  const parents = categories.filter((c) => !c.parentId);
  const childrenOf = (parentId: string) =>
    categories.filter((c) => c.parentId === parentId);

  return (
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={className}
    >
      <option value="">(nincs)</option>
      {parents.map((parent) => {
        const children = childrenOf(parent.id);
        if (children.length === 0) {
          return (
            <option key={parent.id} value={parent.id}>
              {parent.name}
            </option>
          );
        }
        return (
          <optgroup key={parent.id} label={parent.name}>
            {children.map((child) => (
              <option key={child.id} value={child.id}>
                {child.name}
              </option>
            ))}
          </optgroup>
        );
      })}
    </Select>
  );
};

export function RingProgress({ pct, size = 72, color }: { pct: number; size?: number; color?: string }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - Math.min(100, pct) / 100);
  const strokeColor = color ?? "var(--color-primary)";
  return (
    <svg width={size} height={size} className="-rotate-90" style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="var(--color-border)" strokeWidth={6} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={strokeColor} strokeWidth={6}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round" className="transition-all duration-700" />
    </svg>
  );
}

export const MobileNavBtn = ({
  active,
  icon: Icon,
  label,
  onClick,
}: {
  active?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
}) => (
  <button
    onClick={onClick}
    className={
      "flex flex-col items-center justify-center gap-0.5 px-1 py-2 rounded-xl flex-1 min-h-12 transition " +
      (active ? "text-primary" : "text-text-muted")
    }
  >
    <Icon className="w-5 h-5 shrink-0" />
    <span className="text-[10px] leading-tight truncate max-w-full">{label}</span>
  </button>
);

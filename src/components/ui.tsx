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
      "flex items-center gap-2 px-3 py-2 rounded-xl text-sm transition " +
      (active
        ? "bg-white/10 text-white shadow"
        : "text-white/70 hover:text-white hover:bg-white/5")
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
    className={`rounded-2xl bg-white/5 border border-white/10 shadow-sm ${className}`}
  >
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
  <label className="block">
    <div className="text-xs text-white/60 mb-1 flex items-center gap-2">
      <span>{label}</span>
      {hint ? (
        <span className="text-[10px] text-white/40">{hint}</span>
      ) : null}
    </div>
    {children}
  </label>
);

export const Input = (props: React.InputHTMLAttributes<HTMLInputElement>) => (
  <input
    {...props}
    className={
      "w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/10 " +
      (props.className || "")
    }
  />
);

export const Select = (props: React.SelectHTMLAttributes<HTMLSelectElement>) => (
  <select
    {...props}
    className={
      "w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-white/10 " +
      (props.className || "")
    }
  />
);

export const SmallButton = ({
  variant = "ghost",
  children,
  ...rest
}: {
  variant?: "ghost" | "solid" | "danger";
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) => {
  const base =
    "px-3 py-1.5 rounded-lg text-xs transition inline-flex items-center gap-1";
  const styles =
    variant === "solid"
      ? "bg-white/10 hover:bg-white/15 text-white"
      : variant === "danger"
      ? "bg-red-500/10 hover:bg-red-500/20 text-red-200"
      : "bg-white/0 hover:bg-white/5 text-white/70 hover:text-white";
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
        <span className="text-xs text-white/60">Biztosan törlöd?</span>
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
  <div className={`animate-pulse bg-white/10 rounded-xl ${className}`} />
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
      "flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 transition " +
      (active ? "text-white" : "text-white/50")
    }
  >
    <Icon className="w-5 h-5" />
    <span className="text-[9px] leading-tight truncate max-w-full">{label}</span>
  </button>
);

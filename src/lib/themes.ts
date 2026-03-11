export type ThemeId =
  | "graphite-emerald"
  | "trust-blue"
  | "teal-slate"
  | "midnight-purple"
  | "rose-gold"
  | "dark-neo"  // legacy alias → graphite-emerald
  | "light";    // legacy alias → trust-blue

export type ThemeMeta = {
  id: ThemeId;
  label: string;
  mode: "dark" | "light";
};

export const THEMES: ThemeMeta[] = [
  { id: "graphite-emerald", label: "Graphite Emerald", mode: "dark" },
  { id: "midnight-purple",  label: "Midnight Purple",  mode: "dark" },
  { id: "trust-blue",       label: "Trust Blue",       mode: "light" },
  { id: "teal-slate",       label: "Teal & Slate",     mode: "light" },
  { id: "rose-gold",        label: "Rose Gold",        mode: "light" },
];

export const DEFAULT_THEME: ThemeId = "graphite-emerald";

import React, { createContext, useContext, useEffect, useState } from "react";
import { DEFAULT_THEME, type ThemeId } from "../lib/themes";

type ThemeContextValue = {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
};

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function applyTheme(id: ThemeId) {
  document.documentElement.setAttribute("data-theme", id);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = localStorage.getItem("theme") as ThemeId | null;
    return stored ?? DEFAULT_THEME;
  });

  // Apply on mount immediately (no flash)
  useEffect(() => {
    applyTheme(theme);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function setTheme(id: ThemeId) {
    localStorage.setItem("theme", id);
    applyTheme(id);
    setThemeState(id);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme csak ThemeProvider-en belül használható");
  return ctx;
}

"use client";

import { useEffect, useState } from "react";

export type Theme = "light" | "dark" | "system";

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    return savedTheme || "system";
  });

  const [resolvedTheme, setResolvedTheme] = useState<"light" | "dark">(() => {
    const savedTheme = localStorage.getItem("theme") as Theme | null;
    if (savedTheme === "light" || savedTheme === "dark") {
      return savedTheme;
    }
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const handleThemeChange = () => {
      let currentTheme: "light" | "dark";
      if (theme === "light" || theme === "dark") {
        currentTheme = theme;
      } else {
        currentTheme = mediaQuery.matches ? "dark" : "light";
      }
      setResolvedTheme(currentTheme);
      root.setAttribute("data-theme", currentTheme);
    };

    handleThemeChange();
    mediaQuery.addEventListener("change", handleThemeChange);

    return () => {
      mediaQuery.removeEventListener("change", handleThemeChange);
    };
  }, [theme]);

  const toggleTheme = () => {
    const newTheme: Theme = resolvedTheme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const setThemeMode = (newTheme: Theme) => {
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  return {
    theme,
    resolvedTheme,
    isDark: resolvedTheme === "dark",
    toggleTheme,
    setTheme: setThemeMode,
  };
}

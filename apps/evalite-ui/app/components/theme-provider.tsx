import { useState } from "react";
import { ThemeContext } from "./theme-context";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const preferredTheme = localStorage.getItem("theme");
    return preferredTheme as "light" | "dark";
  });

  function handleThemeChange(theme: "light" | "dark") {
    const root = document.documentElement;

    root.classList.toggle("disable-transitions", true);

    setTheme(theme);
    localStorage.setItem("theme", theme);
    root.classList.toggle("dark", theme === "dark");

    requestAnimationFrame(() => {
      root.classList.toggle("disable-transitions", false);
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleThemeChange }}>
      {children}
    </ThemeContext.Provider>
  );
}

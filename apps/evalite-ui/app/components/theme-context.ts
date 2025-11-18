import { createContext } from "react";

export const ThemeContext = createContext<{
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark") => void;
}>({
  theme: "system",
  setTheme: () => {},
});

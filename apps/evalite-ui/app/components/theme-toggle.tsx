import { ContrastIcon } from "lucide-react";
import { useTheme } from "~/hooks/use-theme";
import { Button } from "./ui/button";

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
    >
      <ContrastIcon className="size-4 dark:rotate-180" />
    </Button>
  );
}

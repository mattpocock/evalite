import * as React from "react";
import { CopyIcon, CheckIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "~/components/ui/tooltip";

interface CopyButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  value: string;
  label?: string;
  onCopied?: () => void;
  variant?: "default" | "secondary" | "ghost";
  size?: "default" | "sm" | "icon";
}

export function CopyButton({
  value,
  className,
  variant = "ghost",
  size = "icon",
  label = "Copy",
  onCopied,
  ...props
}: CopyButtonProps) {
  const [isCopied, setIsCopied] = React.useState(false);

  React.useEffect(() => {
    if (isCopied) {
      const timeout = setTimeout(() => setIsCopied(false), 2000);
      return () => clearTimeout(timeout);
    }
  }, [isCopied]);

  return (
    <Button
      size={size}
      variant={variant}
      className={cn("text-muted-foreground hover:text-foreground", className)}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setIsCopied(true);
          onCopied?.();
        } catch (error) {
          console.error("Failed to copy text:", error);
        }
      }}
      {...props}
    >
      {isCopied ? (
        <CheckIcon className="size-4" />
      ) : (
        <CopyIcon className="size-4" />
      )}
      {size !== "icon" && (isCopied ? "Copied" : label)}
    </Button>
  );
}

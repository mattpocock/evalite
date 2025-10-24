import { useState } from "react";
import { Button } from "~/components/ui/button";
import { triggerRerun } from "~/sdk";
import { RotateCcw, Loader2 } from "lucide-react";

interface RerunButtonProps {
  className?: string;
  variant?:
    | "default"
    | "destructive"
    | "outline"
    | "secondary"
    | "ghost"
    | "link";
  size?: "default" | "sm" | "lg" | "icon";
  disabled?: boolean;
}

export const RerunButton = ({
  className,
  variant = "outline",
  size = "default",
  disabled = false,
}: RerunButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const handleRerun = async () => {
    if (isLoading) return;

    setIsLoading(true);
    setLastError(null);

    try {
      await triggerRerun();
      // Success is handled by WebSocket updates
    } catch (error) {
      setLastError(
        error instanceof Error ? error.message : "Failed to trigger rerun"
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-1">
      <Button
        onClick={handleRerun}
        disabled={disabled || isLoading}
        variant={variant}
        size={size}
        className={className}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RotateCcw className="h-4 w-4" />
        )}
        <span className="ml-2">{isLoading ? "Rerunning..." : "Rerun"}</span>
      </Button>
      {lastError && <p className="text-xs text-red-500">{lastError}</p>}
    </div>
  );
};

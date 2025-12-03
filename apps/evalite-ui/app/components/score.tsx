import {
  ChevronDownCircleIcon,
  ChevronRightCircleIcon,
  ChevronUpCircleIcon,
  LoaderCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";

export type ScoreState =
  | "up"
  | "down"
  | "same"
  | "first"
  | "loading"
  | "failed";

export const Score = (props: {
  score: number;
  state: ScoreState;
  iconClassName?: string;
  hasScores: boolean;
  className?: string;
}) => {
  return (
    <span className={cn("flex items-center space-x-2", props.className)}>
      {props.state === "loading" ? (
        <span>---%</span>
      ) : !props.hasScores ? (
        <span className="text-muted-foreground">-</span>
      ) : (
        <span>
          {Math.round((Number.isNaN(props.score) ? 0 : props.score) * 100)}%
        </span>
      )}
      {(() => {
        switch (true) {
          case props.state === "loading":
            return (
              <LoaderCircleIcon
                className={cn(
                  "size-3 text-blue-500 animate-spin",
                  props.iconClassName
                )}
              />
            );
          case props.state === "failed":
            return (
              <XCircleIcon
                className={cn("size-3 text-red-500", props.iconClassName)}
              />
            );
          case !props.hasScores:
            return (
              <ChevronRightCircleIcon
                className={cn("size-3 text-blue-500", props.iconClassName)}
              />
            );
          case props.state === "up":
            return (
              <ChevronUpCircleIcon
                className={cn("size-3 text-green-600", props.iconClassName)}
              />
            );
          case props.state === "down":
            return (
              <ChevronDownCircleIcon
                className={cn("size-3 text-red-600", props.iconClassName)}
              />
            );
          case props.state === "same":
            return (
              <ChevronRightCircleIcon
                className={cn("size-3 text-blue-500", props.iconClassName)}
              />
            );
          case props.state === "first":
            return (
              <ChevronRightCircleIcon
                className={cn("size-3 text-blue-500", props.iconClassName)}
              />
            );
          default:
            return null;
        }
      })()}
    </span>
  );
};

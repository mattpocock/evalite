import {
  ChevronDownCircleIcon,
  ChevronRightCircleIcon,
  ChevronUpCircleIcon,
  LoaderCircleIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "~/lib/utils";

export type ScoreState = "up" | "down" | "same" | "first";

export const Score = (props: {
  score: number;
  state: ScoreState;
  isRunning: boolean;
  evalStatus: "success" | "fail";
  iconClassName?: string;
}) => {
  return (
    <span className="flex items-center space-x-2">
      <span>
        {Math.round((Number.isNaN(props.score) ? 0 : props.score) * 100)}%
      </span>
      {(() => {
        switch (true) {
          case props.isRunning:
            return (
              <LoaderCircleIcon
                className={cn(
                  "size-3 text-blue-500 animate-spin",
                  props.iconClassName
                )}
              />
            );
          case props.evalStatus === "fail":
            return (
              <XCircleIcon
                className={cn("size-3 text-red-500", props.iconClassName)}
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

export const getScoreState = (
  score: number,
  prevScore: number | null | undefined
) => {
  const state: ScoreState =
    typeof prevScore === "undefined" || prevScore === null
      ? "first"
      : score > prevScore
        ? "up"
        : score < prevScore
          ? "down"
          : "same";

  return state;
};

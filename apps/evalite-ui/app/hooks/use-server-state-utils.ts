import type { Evalite } from "evalite/types";
import { useMemo } from "react";

export const useServerStateUtils = (state: Evalite.ServerState) => {
  return useMemo(() => {
    const filePathSet: Set<string> =
      state.type === "running" ? new Set(state.filepaths) : new Set();

    const isRunningFilepath = (filepath: string) =>
      filePathSet.has(filepath) && state.type === "running";

    const isRunningSuiteName = (name: string) =>
      state.type === "running" && state.suiteNamesRunning.includes(name);

    return {
      isRunningFilepath,
      isRunningSuiteName,
    };
  }, [state]);
};

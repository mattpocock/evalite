import { runVitest } from "./run-vitest.js";
import { buildApplication, buildCommand, buildRouteMap } from "@stricli/core";
import {
  buildInstallCommand,
  buildUninstallCommand,
} from "@stricli/auto-complete";
import { createRequire } from "node:module";

const packageJson = createRequire(import.meta.url)(
  "../package.json"
) as typeof import("../package.json");

type ProgramOpts = {
  path: string | undefined;
  threshold: number | undefined;
};

const commonParameters = {
  positional: {
    kind: "tuple",
    parameters: [{ parse: String, brief: "path", optional: true }],
  },
  flags: {
    threshold: {
      kind: "parsed",
      parse: parseFloat,
      brief:
        "Fails the process if the score is below threshold. Specified as 0-100. Default is 100.",
      optional: true,
    },
  },
} as const;

type Flags = {
  threshold: number | undefined;
};

export const createProgram = (commands: {
  watch: (opts: ProgramOpts) => void;
  runOnceAtPath: (opts: ProgramOpts) => void;
}) => {
  const runOnce = buildCommand({
    parameters: commonParameters,
    func: async (flags: Flags, path: string | undefined) => {
      return commands.runOnceAtPath({ path, threshold: flags.threshold });
    },
    docs: {
      brief: "Run evals at specified path once and exit",
    },
  });

  const watch = buildCommand({
    parameters: commonParameters,
    func: (flags: Flags, path: string | undefined) => {
      return commands.watch({ path, threshold: flags.threshold });
    },
    docs: {
      brief: "Watch evals for file changes",
    },
  });

  const routes = buildRouteMap({
    routes: {
      "run-once": runOnce,
      watch,
      install: buildInstallCommand("evalite", {
        bash: "__evalite_bash_complete",
      }),
      uninstall: buildUninstallCommand("evalite", { bash: true }),
    },
    defaultCommand: "run-once",
    docs: {
      brief: "",
      hideRoute: {
        install: true,
        uninstall: true,
      },
    },
  });

  return buildApplication(routes, {
    name: packageJson.name,
    versionInfo: {
      currentVersion: packageJson.version,
    },
  });
};

export const program = createProgram({
  watch: (path) => {
    return runVitest({
      path: path.path,
      scoreThreshold: path.threshold,
      cwd: undefined,
      mode: "watch-for-file-changes",
    });
  },
  runOnceAtPath: (path) => {
    return runVitest({
      path: path.path,
      scoreThreshold: path.threshold,
      cwd: undefined,
      mode: "run-once-and-exit",
    });
  },
});

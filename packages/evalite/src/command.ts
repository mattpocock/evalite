import {
  buildInstallCommand,
  buildUninstallCommand,
} from "@stricli/auto-complete";
import { buildApplication, buildCommand, buildRouteMap } from "@stricli/core";
import { createRequire } from "node:module";
import { runEvalite } from "./run-evalite.js";
import { exportCommand } from "./export-static.js";
import { loadEvaliteConfig } from "./config.js";
import { createInMemoryStorage } from "./storage/in-memory.js";

const packageJson = createRequire(import.meta.url)(
  "../package.json"
) as typeof import("../package.json");

type ProgramOpts = {
  path: string | undefined;
  threshold: number | undefined;
  outputPath: string | undefined;
  hideTable: boolean | undefined;
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
    outputPath: {
      kind: "parsed",
      parse: String,
      brief:
        "Path to write test results in JSON format after evaluation completes.",
      optional: true,
    },
    hideTable: {
      kind: "boolean",
      brief: "Hides the detailed table output in the CLI.",
      optional: true,
    },
  },
} as const;

type Flags = {
  threshold: number | undefined;
  outputPath: string | undefined;
  hideTable: boolean | undefined;
};

export const createProgram = (commands: {
  watch: (opts: ProgramOpts) => void;
  runOnceAtPath: (opts: ProgramOpts) => void;
  serve: (opts: ProgramOpts) => void;
  export: (opts: {
    output: string | undefined;
    runId: number | undefined;
    basePath: string | undefined;
  }) => void;
}) => {
  const runOnce = buildCommand({
    parameters: commonParameters,
    func: async (flags: Flags, path: string | undefined) => {
      return commands.runOnceAtPath({
        path,
        threshold: flags.threshold,
        outputPath: flags.outputPath,
        hideTable: flags.hideTable,
      });
    },
    docs: {
      brief: "Run evals once and exit",
    },
  });

  const serve = buildCommand({
    parameters: commonParameters,
    func: (flags: Flags, path: string | undefined) => {
      return commands.serve({
        path,
        threshold: flags.threshold,
        outputPath: flags.outputPath,
        hideTable: flags.hideTable,
      });
    },
    docs: {
      brief: "Run evals once and serve UI",
    },
  });

  const watch = buildCommand({
    parameters: commonParameters,
    func: (flags: Flags, path: string | undefined) => {
      if (flags.outputPath) {
        throw new Error(
          "--outputPath is not supported in watch mode. Use 'evalite --outputPath <path>' instead."
        );
      }
      return commands.watch({
        path,
        threshold: flags.threshold,
        outputPath: flags.outputPath,
        hideTable: flags.hideTable,
      });
    },
    docs: {
      brief: "Watch evals for file changes",
    },
  });

  const exportCmd = buildCommand({
    parameters: {
      flags: {
        output: {
          kind: "parsed",
          parse: String,
          brief:
            "Output directory for static export (default: ./evalite-export)",
          optional: true,
        },
        runId: {
          kind: "parsed",
          parse: parseInt,
          brief: "Specific run ID to export (default: latest)",
          optional: true,
        },
        basePath: {
          kind: "parsed",
          parse: String,
          brief:
            "Base path for hosting at non-root URLs (default: /). Must start with /",
          optional: true,
        },
      },
    },
    func: (flags: {
      output: string | undefined;
      runId: number | undefined;
      basePath: string | undefined;
    }) => {
      return commands.export({
        output: flags.output,
        runId: flags.runId,
        basePath: flags.basePath,
      });
    },
    docs: {
      brief: "Export static UI bundle for CI artifacts",
    },
  });

  const routes = buildRouteMap({
    routes: {
      run: runOnce,
      serve,
      watch,
      export: exportCmd,
      install: buildInstallCommand("evalite", {
        bash: "__evalite_bash_complete",
      }),
      uninstall: buildUninstallCommand("evalite", { bash: true }),
    },
    defaultCommand: "run",
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
    return runEvalite({
      path: path.path,
      scoreThreshold: path.threshold,
      cwd: undefined,
      mode: "watch-for-file-changes",
      outputPath: path.outputPath,
      hideTable: path.hideTable,
    });
  },
  runOnceAtPath: (path) => {
    return runEvalite({
      path: path.path,
      scoreThreshold: path.threshold,
      cwd: undefined,
      mode: "run-once-and-exit",
      outputPath: path.outputPath,
    });
  },
  serve: (path) => {
    return runEvalite({
      path: path.path,
      scoreThreshold: path.threshold,
      cwd: undefined,
      mode: "run-once-and-serve",
      outputPath: path.outputPath,
    });
  },
  export: async (opts) => {
    const cwd = process.cwd();

    // Load config and determine storage (same logic as run-evalite.ts)
    const config = await loadEvaliteConfig(cwd);
    await using storage = config?.storage
      ? await config.storage()
      : createInMemoryStorage();

    await exportCommand({
      cwd,
      storage,
      outputPath: opts.output ?? "./evalite-export",
      runId: opts.runId,
      basePath: opts.basePath,
    });
  },
});

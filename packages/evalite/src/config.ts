import { createJiti } from "jiti";
import path from "path";
import type { Evalite } from "./types.js";

/**
 * Type-safe helper for defining Evalite configuration.
 * Provides intellisense and type checking for config options.
 *
 * @example
 * ```ts
 * // evalite.config.ts
 * import { defineConfig } from "evalite/config"
 * import { createSqliteStorage } from "evalite/sqlite-storage"
 *
 * export default defineConfig({
 *   storage: () => createSqliteStorage("./custom.db"),
 *   server: { port: 3001 },
 *   scoreThreshold: 80,
 *   hideTable: true
 * })
 * ```
 */
export function defineConfig(config: Evalite.Config): Evalite.Config {
  return config;
}

const CONFIG_FILE_NAMES = [
  "evalite.config.ts",
  "evalite.config.mts",
  "evalite.config.js",
  "evalite.config.mjs",
];

/**
 * Load Evalite configuration file from the specified directory.
 * Looks for evalite.config.{ts,mts,js,mjs} files.
 *
 * @param cwd - Current working directory to search for config file
 * @returns Resolved config object or undefined if no config found
 */
export async function loadEvaliteConfig(
  cwd: string
): Promise<Evalite.Config | undefined> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    requireCache: false,
  });

  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = path.join(cwd, fileName);

    try {
      const loaded = (await jiti.import(configPath)) as any;
      const config = loaded.default || loaded.evalite || loaded;

      if (config && typeof config === "object") {
        return config as Evalite.Config;
      }
    } catch (error: any) {
      // File not found is expected, ignore it
      if (
        error.code === "ERR_MODULE_NOT_FOUND" ||
        error.code === "ENOENT" ||
        error.message?.includes("Cannot find module")
      ) {
        continue;
      }
      // Other errors (syntax errors, etc) should be thrown
      throw new Error(
        `Failed to load Evalite config from ${configPath}: ${error.message}`
      );
    }
  }

  return undefined;
}

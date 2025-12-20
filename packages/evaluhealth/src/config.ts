import { createJiti } from "jiti";
import path from "path";
import type { Evaluhealth } from "./types.js";

/**
 * Type-safe helper for defining Evaluhealth configuration.
 * Provides intellisense and type checking for config options.
 *
 * @example
 * ```ts
 * // evaluhealth.config.ts
 * import { defineConfig } from "evaluhealth/config"
 * import { createSqliteStorage } from "evaluhealth/sqlite-storage"
 *
 * export default defineConfig({
 *   storage: () => createSqliteStorage("./custom.db"),
 *   server: { port: 3001 },
 *   scoreThreshold: 80,
 *   hideTable: true
 * })
 * ```
 */
export function defineConfig(config: Evaluhealth.Config): Evaluhealth.Config {
  return config;
}

const CONFIG_FILE_NAMES = [
  "evaluhealth.config.ts",
  "evaluhealth.config.mts",
  "evaluhealth.config.js",
  "evaluhealth.config.mjs",
];

/**
 * Load Evaluhealth configuration file from the specified directory.
 * Looks for evaluhealth.config.{ts,mts,js,mjs} files.
 *
 * @param cwd - Current working directory to search for config file
 * @returns Resolved config object or undefined if no config found
 */
export async function loadEvaluhealthConfig(
  cwd: string
): Promise<Evaluhealth.Config | undefined> {
  const jiti = createJiti(import.meta.url, {
    interopDefault: true,
    requireCache: false,
  });

  for (const fileName of CONFIG_FILE_NAMES) {
    const configPath = path.join(cwd, fileName);

    try {
      const loaded = (await jiti.import(configPath)) as any;
      const config = loaded.default || loaded.evaluhealth || loaded;

      if (config && typeof config === "object") {
        return config as Evaluhealth.Config;
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
        `Failed to load Evaluhealth config from ${configPath}: ${error.message}`
      );
    }
  }

  return undefined;
}

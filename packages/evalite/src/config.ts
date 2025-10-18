import { createJiti } from "jiti";
import path from "path";
import type { EvaliteAdapter } from "./adapters/types.js";

/**
 * Configuration options for Evalite
 */
export interface EvaliteConfig {
  /**
   * Factory function to create a custom storage adapter.
   * Can be async if the adapter requires async initialization.
   *
   * @example
   * ```ts
   * import { createSqliteAdapter } from "evalite/sqlite-adapter"
   *
   * export default defineConfig({
   *   adapter: () => createSqliteAdapter("./custom.db")
   * })
   * ```
   */
  adapter?: () => EvaliteAdapter | Promise<EvaliteAdapter>;

  /**
   * Server configuration options
   */
  server?: {
    /**
     * Port for the Evalite UI server
     * @default 3006
     */
    port?: number;
  };

  /**
   * Minimum average score threshold (0-100).
   * If the average score falls below this threshold, the process will exit with code 1.
   *
   * @example
   * ```ts
   * export default defineConfig({
   *   scoreThreshold: 80 // Fail if average score < 80
   * })
   * ```
   */
  scoreThreshold?: number;

  /**
   * Hide the results table in terminal output
   * @default false
   */
  hideTable?: boolean;
}

/**
 * Type-safe helper for defining Evalite configuration.
 * Provides intellisense and type checking for config options.
 *
 * @example
 * ```ts
 * // evalite.config.ts
 * import { defineConfig } from "evalite/config"
 * import { createSqliteAdapter } from "evalite/sqlite-adapter"
 *
 * export default defineConfig({
 *   adapter: () => createSqliteAdapter("./custom.db"),
 *   server: { port: 3001 },
 *   scoreThreshold: 80,
 *   hideTable: true
 * })
 * ```
 */
export function defineConfig(config: EvaliteConfig): EvaliteConfig {
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
): Promise<EvaliteConfig | undefined> {
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
        return config as EvaliteConfig;
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

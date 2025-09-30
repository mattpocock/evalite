import {
  wrapLanguageModel,
  type LanguageModel,
  type LanguageModelMiddleware,
} from "ai";
import { createHash } from "node:crypto";

const createKey = (
  params: Parameters<
    NonNullable<LanguageModelMiddleware["wrapGenerate"]>
  >[0]["params"]
) => {
  return createHash("sha256").update(JSON.stringify(params)).digest("hex");
};

export type StorageValue = string | number | null | object;

export type CacheStore = {
  get: (key: string) => Promise<StorageValue>;
  set: (key: string, value: StorageValue) => Promise<void>;
};

export const cacheModel = <T extends LanguageModel>(
  model: T,
  storage: CacheStore
): T => {
  return wrapLanguageModel({
    model: model as Parameters<typeof wrapLanguageModel>[0]["model"],
    middleware: {
      wrapGenerate: async (opts) => {
        const key = createKey(opts.params);

        const resultFromCache = await storage.get(key);

        if (resultFromCache && typeof resultFromCache === "object") {
          // Type the cached result
          const cachedResult = resultFromCache as {
            content: unknown[];
            finishReason: string;
            usage: {
              inputTokens: number;
              outputTokens: number;
              totalTokens: number;
            };
            providerMetadata?: unknown;
            request?: unknown;
            response?: {
              timestamp?: string | Date;
              [key: string]: unknown;
            };
            warnings?: unknown[];
          };

          // Convert timestamp if needed
          if (
            cachedResult.response?.timestamp &&
            typeof cachedResult.response.timestamp === "string"
          ) {
            cachedResult.response.timestamp = new Date(
              cachedResult.response.timestamp
            );
          }

          // Reset the tokens to 0 to show in the UI
          // that they were cached.
          cachedResult.usage.inputTokens = 0;
          cachedResult.usage.outputTokens = 0;
          cachedResult.usage.totalTokens = 0;

          return cachedResult as Awaited<ReturnType<typeof opts.doGenerate>>;
        }

        const generated = await opts.doGenerate();

        await storage.set(key, JSON.stringify(generated));

        return generated;
      },
    },
  }) as T;
};

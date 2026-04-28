import type {
  LanguageModelV3,
  LanguageModelV3CallOptions,
  LanguageModelV3StreamPart,
} from "@ai-sdk/provider";
import type { LanguageModel } from "ai";
import { wrapLanguageModel } from "ai";
import { reportTraceLocalStorage } from "./traces.js";
import { getCacheContext, generateCacheKey } from "./cache.js";

const handlePromptContent = (
  content: LanguageModelV3CallOptions["prompt"][number]["content"][number]
): unknown | null => {
  if (typeof content === "string") {
    return {
      type: "text" as const,
      text: content,
    };
  }
  if (content.type === "text") {
    return {
      type: "text" as const,
      text: content.text,
    };
  }

  if (content.type === "tool-call") {
    return {
      type: "tool-call" as const,
      toolName: content.toolName,
      input: content.input,
      toolCallId: content.toolCallId,
    };
  }

  if (content.type === "tool-result") {
    return {
      type: "tool-result" as const,
      toolCallId: content.toolCallId,
      toolName: content.toolName,
      output: content.output,
    };
  }

  // Skip unsupported content types (reasoning, file, tool-approval-response, etc.)
  return null;
};

const processPromptForTracing = (
  prompt: LanguageModelV3CallOptions["prompt"]
) => {
  return prompt.map((prompt) => {
    if (!Array.isArray(prompt.content)) {
      return {
        role: prompt.role,
        content: prompt.content,
      };
    }

    const content = prompt.content.map(handlePromptContent).filter(Boolean);

    return {
      role: prompt.role,
      content,
    };
  });
};

const fixCacheResponse = (
  obj: any
): Awaited<ReturnType<LanguageModelV3["doGenerate"]>> => {
  if (obj?.response?.timestamp) {
    obj.response.timestamp = new Date(obj.response.timestamp);
  }
  return obj as Awaited<ReturnType<LanguageModelV3["doGenerate"]>>;
};

const getModelId = (model: LanguageModel): string => {
  if (typeof model === "string") return model;
  return model.modelId;
};

const extractUsageForTrace = (usage: {
  inputTokens: { total: number | undefined };
  outputTokens: { total: number | undefined };
}) => ({
  inputTokens: usage.inputTokens.total ?? 0,
  outputTokens: usage.outputTokens.total ?? 0,
  totalTokens: (usage.inputTokens.total ?? 0) + (usage.outputTokens.total ?? 0),
});

export const wrapAISDKModel = (
  model: LanguageModel,
  options?: { tracing?: boolean; caching?: boolean }
): LanguageModel => {
  const enableTracing = options?.tracing ?? true;
  const enableCaching = options?.caching ?? true;

  // If neither is enabled/available, return original model
  if (!enableCaching && !enableTracing) {
    return model;
  }

  const modelId = getModelId(model);

  return wrapLanguageModel({
    model: model as LanguageModelV3,
    middleware: {
      specificationVersion: "v3" as const,
      wrapGenerate: async (opts) => {
        const start = performance.now();
        let result: Awaited<ReturnType<typeof opts.doGenerate>> | undefined;
        const cacheContext = getCacheContext();

        // Try cache if enabled
        if (cacheContext) {
          const keyHash = generateCacheKey({
            model: modelId,
            params: opts.params,
            callType: "generate",
            callParams: opts.params,
          });

          try {
            const cacheResponse = await fetch(
              `http://localhost:${cacheContext.serverPort}/api/cache/${keyHash}`
            );

            if (cacheResponse.ok) {
              const cached = (await cacheResponse.json()) as {
                value?: unknown;
                duration: number;
              };
              if (cached?.value) {
                cacheContext.reportCacheHit({
                  keyHash,
                  hit: true,
                  savedDuration: cached.duration,
                });

                result = fixCacheResponse(cached.value) as Awaited<
                  ReturnType<typeof opts.doGenerate>
                >;
                result.usage = {
                  inputTokens: {
                    total: 0,
                    noCache: 0,
                    cacheRead: 0,
                    cacheWrite: 0,
                  },
                  outputTokens: { total: 0, text: 0, reasoning: 0 },
                };
              }
            }
          } catch (error) {
            console.warn("Cache fetch failed:", error);
          }
        }

        // Execute if not cached
        if (!result) {
          result = await opts.doGenerate();
          const duration = performance.now() - start;

          // Store in cache if caching enabled
          if (cacheContext) {
            const keyHash = generateCacheKey({
              model: modelId,
              params: opts.params,
              callType: "generate",
              callParams: opts.params,
            });

            try {
              await fetch(
                `http://localhost:${cacheContext.serverPort}/api/cache/${keyHash}`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ value: result, duration }),
                }
              );
            } catch (error) {
              console.warn("Cache write failed:", error);
            }

            cacheContext.reportCacheHit({
              keyHash,
              hit: false,
              savedDuration: 0,
            });
          }
        }

        const reportTraceFromContext = reportTraceLocalStorage.getStore();

        // Report trace if enabled
        if (reportTraceFromContext) {
          const end = performance.now();
          const textContent = result.content
            .filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("");

          const toolCalls = result.content
            .filter((c) => c.type === "tool-call")
            .map((c) =>
              c.type === "tool-call"
                ? {
                    toolName: c.toolName,
                    input: c.input,
                    toolCallId: c.toolCallId,
                  }
                : null
            )
            .filter(Boolean);

          reportTraceFromContext({
            output: {
              text: textContent,
              toolCalls,
            },
            input: processPromptForTracing(opts.params.prompt),
            usage: extractUsageForTrace(result.usage),
            start,
            end,
          });
        }

        return result;
      },
      wrapStream: async ({ doStream, params }) => {
        const start = performance.now();
        let cachedParts: LanguageModelV3StreamPart[] | undefined;

        const cacheContext = getCacheContext();
        const reportTraceFromContext = reportTraceLocalStorage.getStore();

        // Try cache if enabled
        if (cacheContext) {
          const keyHash = generateCacheKey({
            model: modelId,
            params: params,
            callType: "stream",
            callParams: params,
          });

          try {
            const cacheResponse = await fetch(
              `http://localhost:${cacheContext.serverPort}/api/cache/${keyHash}`
            );

            if (cacheResponse.ok) {
              const cached = (await cacheResponse.json()) as {
                value?: unknown;
                duration: number;
              };
              if (cached?.value) {
                cacheContext.reportCacheHit({
                  keyHash,
                  hit: true,
                  savedDuration: cached.duration,
                });

                cachedParts = cached.value as LanguageModelV3StreamPart[];

                // If tracing enabled, report trace for cached stream
                if (reportTraceFromContext) {
                  const usage = cachedParts.find(
                    (part) => part.type === "finish"
                  )?.usage;

                  reportTraceFromContext({
                    start,
                    end: performance.now(),
                    input: processPromptForTracing(params.prompt),
                    output: cachedParts,
                    usage: usage ? extractUsageForTrace(usage) : undefined,
                  });
                }

                // Reconstruct stream from cached parts
                const stream = new ReadableStream<LanguageModelV3StreamPart>({
                  async start(controller) {
                    for (const part of cachedParts!) {
                      controller.enqueue(part);
                      await new Promise((resolve) => setTimeout(resolve, 10));
                    }
                    controller.close();
                  },
                });

                return {
                  stream,
                  response: { headers: {} },
                };
              }
            }
          } catch (error) {
            console.warn("Cache fetch failed:", error);
          }
        }

        // Execute stream if not cached
        {
          const { stream, ...rest } = await doStream();
          const fullResponse: LanguageModelV3StreamPart[] = [];

          const transformStream = new TransformStream<
            LanguageModelV3StreamPart,
            LanguageModelV3StreamPart
          >({
            transform(chunk, controller) {
              fullResponse.push(chunk);
              controller.enqueue(chunk);
            },
            async flush() {
              const duration = performance.now() - start;

              // Store in cache if enabled
              if (cacheContext) {
                const keyHash = generateCacheKey({
                  model: modelId,
                  params: params,
                  callType: "stream",
                  callParams: params,
                });

                try {
                  await fetch(
                    `http://localhost:${cacheContext.serverPort}/api/cache/${keyHash}`,
                    {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        value: fullResponse,
                        duration,
                      }),
                    }
                  );
                } catch (error) {
                  console.warn("Cache write failed:", error);
                }

                cacheContext.reportCacheHit({
                  keyHash,
                  hit: false,
                  savedDuration: 0,
                });
              }

              // Report trace if enabled
              if (reportTraceFromContext) {
                const usage = fullResponse.find(
                  (part) => part.type === "finish"
                )?.usage;

                reportTraceFromContext({
                  start,
                  end: performance.now(),
                  input: processPromptForTracing(params.prompt),
                  output: fullResponse,
                  usage: usage ? extractUsageForTrace(usage) : undefined,
                });
              }
            },
          });

          return {
            stream: stream.pipeThrough(transformStream),
            ...rest,
          };
        }
      },
    },
  });
};

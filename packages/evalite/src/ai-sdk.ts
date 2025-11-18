import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { reportTraceLocalStorage } from "./traces.js";
import { getCacheContext, generateCacheKey } from "./cache.js";

const handlePromptContent = (
  content: LanguageModelV2CallOptions["prompt"][number]["content"][number]
): unknown => {
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
    const output = content.output;

    // Check for unsupported media content
    if (
      output.type === "content" &&
      output.value.find((item) => item.type === "media")
    ) {
      throw new Error(
        `Unsupported content type: media in tool-result. Not supported yet.`
      );
    }

    return {
      type: "tool-result" as const,
      toolCallId: content.toolCallId,
      toolName: content.toolName,
      output: content.output,
    };
  }

  // Unsupported content types are image and file
  throw new Error(
    `Unsupported content type: ${content.type}. Not supported yet.`
  );
};

const processPromptForTracing = (
  prompt: LanguageModelV2CallOptions["prompt"]
) => {
  return prompt.map((prompt) => {
    if (!Array.isArray(prompt.content)) {
      return {
        role: prompt.role,
        content: prompt.content,
      };
    }

    const content = prompt.content.map(handlePromptContent);

    return {
      role: prompt.role,
      content,
    };
  });
};

const fixCacheResponse = (
  obj: any
): Awaited<ReturnType<LanguageModelV2["doGenerate"]>> => {
  if (obj?.response?.timestamp) {
    obj.response.timestamp = new Date(obj.response.timestamp);
  }
  return obj as Awaited<ReturnType<LanguageModelV2["doGenerate"]>>;
};

export const wrapAISDKModel = (
  model: LanguageModelV2,
  options?: { tracing?: boolean; caching?: boolean }
): LanguageModelV2 => {
  const enableTracing = options?.tracing ?? true;
  const enableCaching = options?.caching ?? true;

  // If neither is enabled/available, return original model
  if (!enableCaching && !enableTracing) {
    return model;
  }

  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async (opts) => {
        const start = performance.now();
        let result: Awaited<ReturnType<typeof opts.doGenerate>> | undefined;
        const cacheContext = getCacheContext();

        // Try cache if enabled
        if (cacheContext) {
          const keyHash = generateCacheKey({
            model: model.modelId,
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
                  inputTokens: 0,
                  outputTokens: 0,
                  totalTokens: 0,
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
              model: model.modelId,
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
            usage: {
              inputTokens: result.usage.inputTokens ?? 0,
              outputTokens: result.usage.outputTokens ?? 0,
              totalTokens: result.usage.totalTokens ?? 0,
            },
            start,
            end,
          });
        }

        return result;
      },
      wrapStream: async ({ doStream, params }) => {
        const start = performance.now();
        let cachedParts: LanguageModelV2StreamPart[] | undefined;

        const cacheContext = getCacheContext();
        const reportTraceFromContext = reportTraceLocalStorage.getStore();

        // Try cache if enabled
        if (cacheContext) {
          const keyHash = generateCacheKey({
            model: model.modelId,
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

                cachedParts = cached.value as LanguageModelV2StreamPart[];

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
                    usage: usage
                      ? {
                          inputTokens: usage.inputTokens ?? 0,
                          outputTokens: usage.outputTokens ?? 0,
                          totalTokens: usage.totalTokens ?? 0,
                        }
                      : undefined,
                  });
                }

                // Reconstruct stream from cached parts
                const stream = new ReadableStream<LanguageModelV2StreamPart>({
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
          const fullResponse: LanguageModelV2StreamPart[] = [];

          const transformStream = new TransformStream<
            LanguageModelV2StreamPart,
            LanguageModelV2StreamPart
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
                  model: model.modelId,
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
                  usage: usage
                    ? {
                        inputTokens: usage.inputTokens ?? 0,
                        outputTokens: usage.outputTokens ?? 0,
                        totalTokens: usage.totalTokens ?? 0,
                      }
                    : undefined,
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

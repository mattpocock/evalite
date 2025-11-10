import type {
  LanguageModelV2,
  LanguageModelV2CallOptions,
  LanguageModelV2StreamPart,
} from "@ai-sdk/provider";
import { wrapLanguageModel } from "ai";
import { reportTrace, shouldReportTrace } from "./traces.js";
import { getCacheContext, generateCacheKey, reportCacheHit } from "./cache.js";

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

export const traceAISDKModel = (model: LanguageModelV2): LanguageModelV2 => {
  if (!shouldReportTrace()) return model;
  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async (opts) => {
        const start = performance.now();
        const generated = await opts.doGenerate();
        const end = performance.now();

        const textContent = generated.content
          .filter((c) => c.type === "text")
          .map((c) => c.text)
          .join("");

        const toolCalls = generated.content
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

        reportTrace({
          output: {
            text: textContent,
            toolCalls,
          },
          input: processPromptForTracing(opts.params.prompt),
          usage: {
            inputTokens: generated.usage.inputTokens ?? 0,
            outputTokens: generated.usage.outputTokens ?? 0,
            totalTokens: generated.usage.totalTokens ?? 0,
          },
          start,
          end,
        });

        return generated;
      },
      wrapStream: async ({ doStream, params }) => {
        const start = performance.now();
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
          flush() {
            const usage = fullResponse.find(
              (part) => part.type === "finish"
            )?.usage;

            reportTrace({
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
          },
        });

        return {
          stream: stream.pipeThrough(transformStream),
          ...rest,
        };
      },
    },
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

export const cacheModel = (
  model: LanguageModelV2,
  options?: { enabled?: boolean }
): LanguageModelV2 => {
  const context = getCacheContext();
  const enabled = options?.enabled ?? context?.cacheEnabled ?? true;

  if (!enabled || !context?.serverPort) {
    return model;
  }

  return wrapLanguageModel({
    model,
    middleware: {
      wrapGenerate: async (opts) => {
        const context = getCacheContext()!;

        // Generate cache key
        const keyHash = generateCacheKey({
          model: model.modelId,
          params: opts.params,
          callType: "generate",
          callParams: opts.params,
        });

        // Try to get from cache
        try {
          const cacheResponse = await fetch(
            `http://localhost:${context.serverPort}/api/cache/${keyHash}`
          );

          if (cacheResponse.ok) {
            const cached = (await cacheResponse.json()) as {
              value?: unknown;
              duration: number;
            };
            if (cached?.value) {
              reportCacheHit({
                keyHash,
                hit: true,
                savedDuration: cached.duration,
              });

              // Return cached result with 0 tokens to show it was cached
              const result = fixCacheResponse(cached.value) as Awaited<
                ReturnType<typeof opts.doGenerate>
              >;
              result.usage = {
                inputTokens: 0,
                outputTokens: 0,
                totalTokens: 0,
              };
              return result;
            }
          }
        } catch (error) {
          // Cache fetch failed, continue with normal execution
          console.warn("Cache fetch failed:", error);
        }

        // Cache miss - execute and cache
        const start = performance.now();
        const result = await opts.doGenerate();
        const duration = performance.now() - start;

        // Store in cache
        try {
          await fetch(
            `http://localhost:${context.serverPort}/api/cache/${keyHash}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ value: result, duration }),
            }
          );
        } catch (error) {
          // Cache write failed, but we have the result
          console.warn("Cache write failed:", error);
        }

        reportCacheHit({ keyHash, hit: false, savedDuration: 0 });

        return result;
      },
      wrapStream: async ({ doStream, params }) => {
        const context = getCacheContext()!;

        // Generate cache key
        const keyHash = generateCacheKey({
          model: model.modelId,
          params: params,
          callType: "stream",
          callParams: params,
        });

        // Try to get from cache
        try {
          const cacheResponse = await fetch(
            `http://localhost:${context.serverPort}/api/cache/${keyHash}`
          );

          if (cacheResponse.ok) {
            const cached = (await cacheResponse.json()) as {
              value?: unknown;
              duration: number;
            };
            if (cached?.value) {
              reportCacheHit({
                keyHash,
                hit: true,
                savedDuration: cached.duration,
              });

              // Reconstruct stream from cached parts
              const cachedParts = cached.value as LanguageModelV2StreamPart[];
              const stream = new ReadableStream<LanguageModelV2StreamPart>({
                async start(controller) {
                  for (const part of cachedParts) {
                    controller.enqueue(part);
                    // Small delay to simulate streaming
                    await new Promise((resolve) => setTimeout(resolve, 10));
                  }
                  controller.close();
                },
              });

              return {
                stream,
                rawResponse: { headers: new Headers() },
                warnings: [],
              };
            }
          }
        } catch (error) {
          // Cache fetch failed, continue with normal execution
          console.warn("Cache fetch failed:", error);
        }

        // Cache miss - execute, collect, and cache
        const start = performance.now();
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

            // Store in cache
            try {
              await fetch(
                `http://localhost:${context.serverPort}/api/cache/${keyHash}`,
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
              // Cache write failed
              console.warn("Cache write failed:", error);
            }

            reportCacheHit({ keyHash, hit: false, savedDuration: 0 });
          },
        });

        return {
          stream: stream.pipeThrough(transformStream),
          ...rest,
        };
      },
    },
  });
};

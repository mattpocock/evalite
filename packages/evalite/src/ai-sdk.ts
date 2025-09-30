import { wrapLanguageModel } from "ai";
import type {
  LanguageModelV2,
  LanguageModelV2Middleware,
} from "@ai-sdk/provider";
import { reportTrace, shouldReportTrace } from "./traces.js";

type PromptContent = {
  role: string;
  content:
    | string
    | Array<{
        type: string;
        text?: string;
        toolName?: string;
        args?: unknown;
        toolCallId?: string;
        result?: unknown;
        isError?: boolean;
        content?: Array<{ type: string; text?: string }>;
      }>;
};

const handlePromptContent = (
  content: PromptContent["content"][number]
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
      args: content.args,
      toolCallId: content.toolCallId,
    };
  }

  if (content.type === "tool-result") {
    return {
      type: "tool-result" as const,
      toolCallId: content.toolCallId,
      result: content.result,
      toolName: content.toolName,
      isError: content.isError,
      content: content.content?.map((c) => {
        if (c.type === "text") {
          return {
            type: "text" as const,
            text: c.text,
          };
        }

        if (c.type === "image") {
          throw new Error(
            `Unsupported content type: ${c.type}. Not supported yet.`
          );
        }
      }),
    };
  }

  // Unsupported content types are image and file
  throw new Error(
    `Unsupported content type: ${content.type}. Not supported yet.`
  );
};

const processPromptForTracing = (prompt: PromptContent[]) => {
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

  const middleware: LanguageModelV2Middleware = {
    wrapGenerate: async (opts) => {
      const start = performance.now();
      const generated = await opts.doGenerate();
      const end = performance.now();

      // Extract text from content array
      const textContent = generated.content
        .filter((c) => c.type === "text")
        .map((c) => (c.type === "text" ? c.text : ""))
        .join("");

      // Extract tool calls from content array
      const toolCalls = generated.content
        .filter((c) => c.type === "tool-call")
        .map((c) =>
          c.type === "tool-call"
            ? {
                toolName: c.toolName,
                args: c.input,
                toolCallId: c.toolCallId,
              }
            : null
        )
        .filter((c): c is NonNullable<typeof c> => c !== null);

      reportTrace({
        output: {
          text: textContent,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
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

      const fullResponse: unknown[] = [];

      const transformStream = new TransformStream({
        transform(chunk, controller) {
          fullResponse.push(chunk);
          controller.enqueue(chunk);
        },
        flush() {
          const finishChunk = fullResponse.find(
            (
              part
            ): part is {
              type: "finish";
              usage: {
                inputTokens?: number;
                outputTokens?: number;
                totalTokens?: number;
              };
            } =>
              typeof part === "object" &&
              part !== null &&
              "type" in part &&
              part.type === "finish"
          );
          const usage = finishChunk?.usage;

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
  };

  return wrapLanguageModel({
    model,
    middleware,
  });
};

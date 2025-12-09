import { generateObject, jsonSchema, type LanguageModel } from "ai";
import { type Graph, type Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import { promptBuilder } from "../../scorers/prompt-builder.js";

const SummarySchema = jsonSchema<{
  summary: string;
}>({
  type: "object",
  properties: {
    summary: {
      type: "string",
      description:
        "A concise summary of the content, capturing the main points and key information",
    },
  },
  required: ["summary"],
});

const extractSummaryPrompt = promptBuilder({
  prompt:
    "Generate a concise summary of the provided content. Capture the main points, key information, and essential details in a clear and coherent way. The summary should be comprehensive yet brief. Output JSON following the required schema.",
  examples: [
    {
      input: {
        content:
          "Apple Inc. announced that Tim Cook will speak at the conference in San Francisco on March 15, 2024. The conference will focus on the future of technology and innovation. Cook is expected to discuss Apple's latest developments in artificial intelligence and their vision for integrating AI into consumer products. Industry experts anticipate major announcements regarding new product lines.",
      },
      output: {
        summary:
          "Apple's CEO Tim Cook will speak at a technology conference in San Francisco on March 15, 2024, focusing on AI developments and Apple's vision for AI-integrated consumer products, with anticipated announcements of new product lines.",
      },
    },
  ],
  task: ["content"],
});

export function summaryExtractor<
  TInput extends { content: string },
  TEdges extends Record<string, any> = {},
>(options: {
  model: LanguageModel;
  filter?: (node: Node<TInput, TEdges>) => boolean;
}): Transformer<
  Graph<TInput, TEdges>,
  Graph<TInput & { summary?: string }, TEdges>
> {
  return async (graph) => {
    const cloned = graph.clone<TInput & { summary?: string }, TEdges>();
    const nodes = Array.from(cloned.getNodes().values());
    const filtered = options.filter ? nodes.filter(options.filter) : nodes;

    for (const node of filtered) {
      const result = await generateObject({
        model: options.model,
        schema: SummarySchema,
        prompt: extractSummaryPrompt({ content: node.data.content }),
      });

      node.data = { ...node.data, summary: result.object.summary };
    }

    return cloned;
  };
}

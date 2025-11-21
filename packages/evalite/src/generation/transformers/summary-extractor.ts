import { Graph, Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import { generateObject, jsonSchema, type LanguageModel } from "ai";
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

export function summaryExtractor<TInput extends { content: string }>({
  model,
  filter,
}: {
  model: LanguageModel;
  filter?: (node: Node<TInput>) => boolean;
}): Transformer<TInput, TInput & { summary?: string }> {
  return async (graph: Graph<TInput>) => {
    const nodes: Node<TInput & { summary?: string }>[] = [];

    for (const node of graph.getNodes().values()) {
      if (filter && !filter(node)) {
        nodes.push(
          new Node(node.id, node.type, {
            ...node.data,
          })
        );
        continue;
      }
      const result = await generateObject({
        model,
        schema: SummarySchema,
        prompt: extractSummaryPrompt({
          content: node.data.content,
        }),
      });

      nodes.push(
        new Node(node.id, node.type, {
          ...node.data,
          summary: result.object.summary,
        })
      );
    }

    return new Graph(nodes);
  };
}

import { generateObject, jsonSchema, type LanguageModel } from "ai";
import { type Graph, type Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import { promptBuilder } from "../../scorers/prompt-builder.js";

const TopicSchema = jsonSchema<{
  topics: string[];
}>({
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "string",
        description: "A key topic or keyword extracted from the content",
      },
    },
  },
  required: ["topics"],
});

const extractTopicPrompt = promptBuilder({
  prompt:
    "Extract a list of key topics or keywords from the provided content. These should represent the main themes or subjects discussed. Output JSON following the required schema.",
  examples: [
    {
      input: {
        content:
          "Machine learning is a field of inquiry devoted to understanding and building methods that 'learn', that is, methods that leverage data to improve performance on some set of tasks.",
      },
      output: {
        topics: [
          "Machine Learning",
          "Artificial Intelligence",
          "Data Science",
          "Algorithms",
        ],
      },
    },
  ],
  task: ["content"],
});

export function topicExtractor<
  TInput extends { content: string },
  TEdges extends Record<string, any> = {},
>(options: {
  model: LanguageModel;
  filter?: (node: Node<TInput, TEdges>) => boolean;
}): Transformer<
  Graph<TInput, TEdges>,
  Graph<TInput & { topics?: string[] }, TEdges>
> {
  return async (graph) => {
    const cloned = graph.clone<TInput & { topics?: string[] }, TEdges>();
    const nodes = Array.from(cloned.getNodes().values());
    const filtered = options.filter ? nodes.filter(options.filter) : nodes;

    for (const node of filtered) {
      const result = await generateObject({
        model: options.model,
        schema: TopicSchema,
        prompt: extractTopicPrompt({ content: node.data.content }),
      });

      node.data = {
        ...node.data,
        topics: result.object.topics.map((t) => t.trim().toLowerCase()),
      };
    }

    return cloned;
  };
}

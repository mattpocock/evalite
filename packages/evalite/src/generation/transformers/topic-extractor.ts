import { Graph, Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import { generateObject, jsonSchema, type LanguageModel } from "ai";
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
  TEdgeTypeDataMap extends Record<string, any> = {},
>({
  model,
  filter,
}: {
  model: LanguageModel;
  filter?: (node: Node<TInput, TEdgeTypeDataMap>) => boolean;
}): Transformer<
  TInput,
  TInput & { topics?: string[] },
  TEdgeTypeDataMap,
  TEdgeTypeDataMap
> {
  return async (graph: Graph<TInput, TEdgeTypeDataMap>) => {
    const clonedGraph = graph.clone<
      TInput & { topics?: string[] },
      TEdgeTypeDataMap
    >();
    const nodes = Array.from(clonedGraph.getNodes().values());

    for (const node of nodes) {
      if (filter && !filter(node)) {
        continue;
      }
      const result = await generateObject({
        model,
        schema: TopicSchema,
        prompt: extractTopicPrompt({
          content: node.data.content,
        }),
      });

      node.data = {
        ...node.data,
        topics: result.object.topics.map((topic) => topic.trim().toLowerCase()),
      };
    }

    return clonedGraph;
  };
}

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

export function topicExtractor<TInput extends { content: string }>({
  model,
  filter,
}: {
  model: LanguageModel;
  filter?: (node: Node<TInput>) => boolean;
}): Transformer<TInput, TInput & { topics?: string[] }> {
  return async (graph: Graph<TInput>) => {
    const nodes: Node<TInput & { topics?: string[] }>[] = [];

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
        schema: TopicSchema,
        prompt: extractTopicPrompt({
          content: node.data.content,
        }),
      });

      nodes.push(
        new Node(node.id, node.type, {
          ...node.data,
          topics: result.object.topics.map((topic) =>
            topic.trim().toLowerCase()
          ),
        })
      );
    }

    return new Graph(nodes);
  };
}

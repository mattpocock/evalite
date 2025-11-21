import { Graph, Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import { generateObject, jsonSchema, type LanguageModel } from "ai";
import { promptBuilder } from "../../scorers/prompt-builder.js";

const EntitiesSchema = jsonSchema<{
  entities: Array<{
    type: string;
    value: string;
    description?: string;
  }>;
}>({
  type: "object",
  properties: {
    entities: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            description:
              "The type or category of the entity (e.g., PERSON, ORGANIZATION, LOCATION, DATE, etc.)",
          },
          value: {
            type: "string",
            description: "The actual entity value extracted from the content",
          },
          description: {
            type: "string",
            description:
              "Optional additional context or description about the entity",
          },
        },
        required: ["type", "value"],
      },
    },
  },
  required: ["entities"],
});

const extractEntitiesPrompt = promptBuilder({
  prompt:
    "Extract all named entities from the provided content. Identify entities such as people, organizations, locations, dates, products, or any other relevant entities. For each entity, provide its type, value, and optionally a brief description. Output JSON following the required schema.",
  examples: [
    {
      input: {
        content:
          "Apple Inc. announced that Tim Cook will speak at the conference in San Francisco on March 15, 2024.",
      },
      output: {
        entities: [
          {
            type: "ORGANIZATION",
            value: "Apple Inc.",
            description: "Technology company",
          },
          {
            type: "PERSON",
            value: "Tim Cook",
            description: "CEO of Apple",
          },
          {
            type: "LOCATION",
            value: "San Francisco",
            description: "City location of the conference",
          },
          {
            type: "DATE",
            value: "March 15, 2024",
            description: "Conference date",
          },
        ],
      },
    },
  ],
  task: ["content"],
});

export function entityExtractor<TInput extends { content: string }>({
  model,
  filter,
}: {
  model: LanguageModel;
  filter?: (node: Node<TInput>) => boolean;
}): Transformer<
  TInput,
  TInput & {
    entities?: { type: string; value: string; description?: string }[];
  }
> {
  return async (graph: Graph<TInput>) => {
    const nodes: Node<
      TInput & {
        entities?: { type: string; value: string; description?: string }[];
      }
    >[] = [];

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
        schema: EntitiesSchema,
        prompt: extractEntitiesPrompt({
          content: node.data.content,
        }),
      });

      nodes.push(
        new Node(node.id, node.type, {
          ...node.data,
          entities: result.object.entities,
        })
      );
    }

    return new Graph(nodes);
  };
}

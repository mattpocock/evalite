import { generateObject, jsonSchema, type LanguageModel } from "ai";
import { type Graph, type Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import { promptBuilder } from "../../scorers/prompt-builder.js";

const EntitiesSchema = jsonSchema<{
  entities: Array<{ type: string; value: string; description?: string }>;
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
          { type: "PERSON", value: "Tim Cook", description: "CEO of Apple" },
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

type Entity = { type: string; value: string; description?: string };

export function entityExtractor<
  TInput extends { content: string },
  TEdges extends Record<string, any> = {},
>(options: {
  model: LanguageModel;
  filter?: (node: Node<TInput, TEdges>) => boolean;
}): Transformer<
  Graph<TInput, TEdges>,
  Graph<TInput & { entities?: Entity[] }, TEdges>
> {
  return async (graph) => {
    const cloned = graph.clone<TInput & { entities?: Entity[] }, TEdges>();
    const nodes = Array.from(cloned.getNodes().values());
    const filtered = options.filter ? nodes.filter(options.filter) : nodes;

    for (const node of filtered) {
      const result = await generateObject({
        model: options.model,
        schema: EntitiesSchema,
        prompt: extractEntitiesPrompt({ content: node.data.content }),
      });

      node.data = { ...node.data, entities: result.object.entities };
    }

    return cloned;
  };
}

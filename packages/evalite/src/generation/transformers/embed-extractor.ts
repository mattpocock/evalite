import { embed } from "ai";
import { Graph, Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import type { EmbeddingModelV2 } from "@ai-sdk/provider";

export function embedExtractor<
  TInput extends { content: string },
  Field extends keyof TInput & string,
>({
  model,
  field,
  filter,
}: {
  model: EmbeddingModelV2<string>;
  field: Field;
  filter?: (node: Node<TInput>) => boolean;
}): Transformer<TInput, TInput & { [K in `${Field}Embedding`]?: number[] }> {
  return async (graph: Graph<TInput>) => {
    const nodes: Node<TInput & { [K in `${Field}Embedding`]?: number[] }>[] =
      [];

    for (const node of graph.getNodes().values()) {
      if (filter && !filter(node)) {
        nodes.push(
          new Node(node.id, node.type, {
            ...node.data,
          })
        );
        continue;
      }
      const value = node.data[field];

      if (typeof value !== "string") {
        throw new Error(
          `Field "${field}" must be a string to be embedded. Found type: ${typeof value}`
        );
      }

      const { embedding } = await embed({
        model,
        value,
      });

      const newData = {
        ...node.data,
        [`${field}Embedding`]: embedding,
      } as TInput & { [K in `${Field}Embedding`]: number[] };

      nodes.push(new Node(node.id, node.type, newData));
    }

    return new Graph(nodes);
  };
}

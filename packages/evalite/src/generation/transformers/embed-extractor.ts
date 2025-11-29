import { embed, type EmbeddingModel } from "ai";
import { type Graph, type Node } from "../graph.js";
import type { Transformer } from "./transformer.js";

export function embedExtractor<
  TInput extends Record<string, unknown>,
  TEdges extends Record<string, any> = {},
  TProperty extends keyof TInput & string = keyof TInput & string,
>(options: {
  model: EmbeddingModel<string>;
  property: TProperty;
  filter?: (node: Node<TInput, TEdges>) => boolean;
}): Transformer<
  Graph<TInput, TEdges>,
  Graph<TInput & { [K in `${TProperty}Embedding`]: number[] }, TEdges>
> {
  return async (graph) => {
    const cloned = graph.clone<
      TInput & { [K in `${TProperty}Embedding`]: number[] },
      TEdges
    >();
    const nodes = Array.from(cloned.getNodes().values());
    const filtered = options.filter ? nodes.filter(options.filter) : nodes;

    const embeddingKey =
      `${options.property}Embedding` as `${TProperty}Embedding`;

    for (const node of filtered) {
      if (node.data[options.property] == null) continue;

      const { embedding } = await embed({
        model: options.model,
        value: String(node.data[options.property]),
      });
      node.data = {
        ...node.data,
        [embeddingKey]: embedding,
      };
    }

    return cloned;
  };
}

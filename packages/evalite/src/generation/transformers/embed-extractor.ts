import { embed } from "ai";
import { Graph, Node } from "../graph.js";
import type { Transformer } from "./transformer.js";
import type { EmbeddingModel } from "ai";

export function embedExtractor<
  TInput,
  TKey extends keyof TInput,
  TEdgeTypeDataMap extends Record<string, any> = {},
>({
  model,
  field,
  filter,
}: {
  model: EmbeddingModel<any>;
  field: TKey;
  filter?: (node: Node<TInput, TEdgeTypeDataMap>) => boolean;
}): Transformer<
  TInput,
  TInput & { [K in TKey as `${string & K}Embedding`]: number[] },
  TEdgeTypeDataMap,
  TEdgeTypeDataMap
> {
  return async (graph: Graph<TInput, TEdgeTypeDataMap>) => {
    const nodes = Array.from(graph.getNodes().values());

    for (const node of nodes) {
      if (filter && !filter(node)) continue;
      if (node.data[field] == null) continue;

      const value = String(node.data[field]);

      const { embedding } = await embed({
        model,
        value,
      });

      node.data = {
        ...node.data,
        [`${String(field)}Embedding`]: embedding,
      } as any;
    }

    return graph as unknown as Graph<
      TInput & { [K in TKey as `${string & K}Embedding`]: number[] },
      TEdgeTypeDataMap
    >;
  };
}

import {
  node,
  type AddEdgeTypes,
  type Graph,
  type Node,
  type NoData,
} from "../graph.js";
import type { Transformer } from "./transformer.js";

export type ChunkerFn = (content: string) => string[];

export function chunkExtractor<
  TInput extends { content: string },
  TEdges extends Record<string, any> = {},
>(options: {
  chunker: ChunkerFn;
  filter?: (node: Node<TInput, TEdges>) => boolean;
}): Transformer<
  Graph<TInput, TEdges>,
  Graph<TInput, AddEdgeTypes<TEdges, { chunk: NoData; parent: NoData }>>
> {
  return async (graph) => {
    const originalNodes = Array.from(graph.getNodes().values());
    const filteredIds = new Set(
      (options.filter
        ? originalNodes.filter(options.filter)
        : originalNodes
      ).map((n) => n.id)
    );

    const cloned = graph.clone<
      TInput,
      AddEdgeTypes<TEdges, { chunk: NoData; parent: NoData }>
    >();

    for (const n of cloned.getNodes().values()) {
      if (!filteredIds.has(n.id)) continue;
      const chunks = options.chunker(n.data.content);

      for (const chunk of chunks) {
        const newNode = cloned.addNode(
          node("chunk", { content: chunk } as TInput)
        );
        cloned.addEdge(n.id, newNode.id, "chunk", {});
        cloned.addEdge(newNode.id, n.id, "parent", {});
      }
    }

    return cloned;
  };
}

import { cosineSimilarity } from "ai";
import { type AddEdgeTypes, type Graph, type Node } from "../graph.js";
import type { Transformer } from "./transformer.js";

export function embeddingSimilarity<
  TInput extends Record<string, unknown>,
  TEdges extends Record<string, any> = {},
>(options: {
  property: keyof TInput & string;
  threshold?: number;
  filter?: (node: Node<TInput, TEdges>) => boolean;
}): Transformer<
  Graph<TInput, TEdges>,
  Graph<
    TInput,
    AddEdgeTypes<
      TEdges,
      {
        embeddingSimilarity: { score: number; property: keyof TInput & string };
      }
    >
  >
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
      AddEdgeTypes<
        TEdges,
        {
          embeddingSimilarity: {
            score: number;
            property: keyof TInput & string;
          };
        }
      >
    >();
    const filtered = Array.from(cloned.getNodes().values()).filter((n) =>
      filteredIds.has(n.id)
    );
    const threshold = options.threshold ?? 0.5;

    for (let i = 0; i < filtered.length; i++) {
      for (let j = i + 1; j < filtered.length; j++) {
        const nodeA = filtered[i];
        const nodeB = filtered[j];
        if (!nodeA || !nodeB) continue;

        const valueA = nodeA.data[options.property];
        const valueB = nodeB.data[options.property];
        if (!valueA || !valueB) continue;
        if (!Array.isArray(valueA) || !Array.isArray(valueB)) continue;

        const similarity = cosineSimilarity(valueA, valueB);
        if (similarity > threshold) {
          cloned.addEdge(nodeA.id, nodeB.id, "embeddingSimilarity", {
            score: similarity,
            property: options.property,
          });
        }
      }
    }

    return cloned;
  };
}

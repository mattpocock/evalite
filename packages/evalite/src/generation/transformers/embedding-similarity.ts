import { cosineSimilarity } from "ai";
import type { Transformer } from "./transformer.js";
import { Graph, Node } from "../graph.js";

export function embeddingSimilarity<
  TInput,
  TKey extends keyof TInput & string,
>({
  property,
  filter,
  threshold = 0.5,
}: {
  property: TKey;
  filter?: (node: Node<TInput>) => boolean;
  threshold?: number;
}): Transformer<TInput, TInput> {
  return async (graph: Graph<TInput>) => {
    const nodes = Array.from(graph.getNodes().values());

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const nodeA = nodes[i];
        const nodeB = nodes[j];

        if (!nodeA || !nodeB) continue;

        if (filter && (!filter(nodeA) || !filter(nodeB))) {
          continue;
        }

        const valueA = nodeA.data[property];
        const valueB = nodeB.data[property];

        if (!valueA || !valueB) continue;

        if (!Array.isArray(valueA) || !Array.isArray(valueB)) {
          continue;
        }

        const similarity = cosineSimilarity(valueA, valueB);

        if (similarity > threshold) {
          graph.addEdge(nodeA.id, nodeB.id, "similarity");
        }
      }
    }

    return graph;
  };
}

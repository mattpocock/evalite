import type { Transformer } from "./transformer.js";
import { Graph, Node } from "../graph.js";

export function jaccardSimilarity<
  TInput,
  TKey extends keyof TInput & string,
  TInputEdgeTypeDataMap extends Record<string, any> = {},
>({
  property,
  filter,
  threshold = 0.5,
}: {
  property: TKey;
  filter?: (node: Node<TInput, TInputEdgeTypeDataMap>) => boolean;
  threshold?: number;
}): Transformer<
  TInput,
  TInput,
  TInputEdgeTypeDataMap,
  TInputEdgeTypeDataMap & {
    [K in `${Uppercase<TKey>}_JACCARD_SIMILARITY`]: { score: number };
  }
> {
  return async (graph: Graph<TInput, TInputEdgeTypeDataMap>) => {
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

        const setA = new Set(
          Array.isArray(valueA)
            ? valueA
            : String(valueA).toLowerCase().split(/\s+/)
        );
        const setB = new Set(
          Array.isArray(valueB)
            ? valueB
            : String(valueB).toLowerCase().split(/\s+/)
        );

        const intersection = new Set([...setA].filter((x) => setB.has(x)));
        const union = new Set([...setA, ...setB]);

        const similarity =
          union.size === 0 ? 0 : intersection.size / union.size;

        if (similarity > threshold) {
          (graph as any).addEdge(
            nodeA.id,
            nodeB.id,
            `${property.toUpperCase()}_JACCARD_SIMILARITY`,
            {
              score: similarity,
            }
          );
        }
      }
    }

    return graph as unknown as Graph<
      TInput,
      TInputEdgeTypeDataMap & {
        [K in `${Uppercase<TKey>}_JACCARD_SIMILARITY`]: { score: number };
      }
    >;
  };
}

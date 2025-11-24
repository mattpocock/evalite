import { transformer } from "./transformer.js";

export const jaccardSimilarity = transformer<
  { property: string; threshold?: number },
  Record<string, unknown>,
  {},
  { jaccardSimilarity: { score: number; property: string } }
>(async ({ property, threshold = 0.5 }, { graph, nodes }) => {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      if (!nodeA || !nodeB) continue;

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
      const similarity = union.size === 0 ? 0 : intersection.size / union.size;

      if (similarity > threshold) {
        graph.addEdge(nodeA.id, nodeB.id, "jaccardSimilarity", {
          score: similarity,
          property,
        });
      }
    }
  }
});

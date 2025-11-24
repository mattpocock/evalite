import { cosineSimilarity } from "ai";
import { transformer } from "./transformer.js";

export const embeddingSimilarity = transformer<
  { property: string; threshold?: number },
  Record<string, unknown>,
  {},
  { embeddingSimilarity: { score: number; property: string } }
>(async ({ property, threshold = 0.5 }, { graph, nodes }) => {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const nodeA = nodes[i];
      const nodeB = nodes[j];
      if (!nodeA || !nodeB) continue;

      const valueA = nodeA.data[property];
      const valueB = nodeB.data[property];
      if (!valueA || !valueB) continue;
      if (!Array.isArray(valueA) || !Array.isArray(valueB)) continue;

      const similarity = cosineSimilarity(valueA, valueB);
      if (similarity > threshold) {
        graph.addEdge(nodeA.id, nodeB.id, "embeddingSimilarity", {
          score: similarity,
          property,
        });
      }
    }
  }
});

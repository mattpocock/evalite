import { node, type NoData } from "../graph.js";
import { transformer } from "./transformer.js";

export type ChunkerFn = (content: string) => string[];

export const chunkExtractor = transformer<
  { chunker: ChunkerFn },
  { content: string },
  {},
  { chunk: NoData; parent: NoData }
>(async ({ chunker }, { graph, nodes }) => {
  for (const n of nodes) {
    const chunks = chunker(n.data.content);

    for (const chunk of chunks) {
      const newNode = graph.addNode(node("chunk", { content: chunk }));
      graph.addEdge(n.id, newNode.id, "chunk", {});
      graph.addEdge(newNode.id, n.id, "parent", {});
    }
  }
});

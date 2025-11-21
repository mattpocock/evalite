import { Edge, Graph, Node } from "../graph.js";
import type { Transformer } from "./transformer.js";

export type ChunkerFn = (content: string) => string[];

export function chunkExtractor<TInput extends { content: string }>({
  chunker,
  filter,
}: {
  chunker: ChunkerFn;
  filter?: (node: Node<TInput>) => boolean;
}): Transformer<TInput, { content: string } & Partial<TInput>> {
  return async (graph: Graph<TInput>) => {
    const newGraph = new Graph<{ content: string } & Partial<TInput>>();

    for (const node of graph.getNodes().values()) {
      if (filter && !filter(node)) {
        newGraph.addNode(new Node(node.id, node.type, node.data));
        continue;
      }

      const chunks = chunker(node.data.content);
      newGraph.addNode(new Node(node.id, node.type, node.data));

      for (const chunk of chunks) {
        const newNode = new Node(crypto.randomUUID(), "chunk", {
          content: chunk,
        } as { content: string } & Partial<TInput>);
        newGraph.addNode(newNode);
        newGraph.addEdge(node.id, newNode.id, "chunk" as const);
        newGraph.addEdge(newNode.id, node.id, "parent" as const);
      }
    }

    return newGraph;
  };
}

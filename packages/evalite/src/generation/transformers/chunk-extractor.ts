import { Graph, Node, type Edge } from "../graph.js";
import type { Transformer } from "./transformer.js";

export type ChunkerFn = (content: string) => string[];

export function chunkExtractor<
  TInput extends { content: string },
  TInputEdgeTypeDataMap extends Record<string, any> = {},
>({
  chunker,
  filter,
}: {
  chunker: ChunkerFn;
  filter?: (node: Node<TInput, TInputEdgeTypeDataMap>) => boolean;
}): Transformer<
  TInput,
  { content: string } & Partial<TInput>,
  TInputEdgeTypeDataMap,
  TInputEdgeTypeDataMap & { chunk: undefined; parent: undefined }
> {
  return async (graph: Graph<TInput, TInputEdgeTypeDataMap>) => {
    const newGraph = new Graph<
      { content: string } & Partial<TInput>,
      TInputEdgeTypeDataMap & { chunk: undefined; parent: undefined }
    >();

    for (const node of graph.getNodes().values()) {
      if (filter && !filter(node)) {
        newGraph.addNode(new Node(node.id, node.type, node.data));
        continue;
      }

      const chunks = chunker(node.data.content);
      newGraph.addNode(
        new Node<
          { content: string } & Partial<TInput>,
          TInputEdgeTypeDataMap & { chunk: undefined; parent: undefined }
        >(node.id, node.type, node.data)
      );

      for (const chunk of chunks) {
        const newNode = new Node<
          { content: string } & Partial<TInput>,
          TInputEdgeTypeDataMap & { chunk: undefined; parent: undefined }
        >(crypto.randomUUID(), "chunk", {
          content: chunk,
        } as { content: string } & Partial<TInput>);
        newGraph.addNode(newNode);
        newGraph.addEdge(node.id, newNode.id, "chunk", undefined);
        newGraph.addEdge(newNode.id, node.id, "parent", undefined);
      }
    }

    return newGraph;
  };
}

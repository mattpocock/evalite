export type Edge<
  TNodeData,
  TEdgeTypeDataMap extends Record<string, any> = {},
> = {
  [K in keyof TEdgeTypeDataMap]: {
    type: K;
    data: TEdgeTypeDataMap[K];
    from: Node<TNodeData, TEdgeTypeDataMap>;
    to: Node<TNodeData, TEdgeTypeDataMap>;
  };
}[keyof TEdgeTypeDataMap];

export class Graph<
  TNodeData,
  TEdgeTypeDataMap extends Record<string, any> = {},
> {
  private nodes: Map<string, Node<TNodeData, TEdgeTypeDataMap>> = new Map();

  constructor(nodes?: Node<TNodeData, TEdgeTypeDataMap>[]) {
    if (nodes) {
      nodes.forEach((node) => this.addNode(node));
    }
  }

  addNode(node: Node<TNodeData, TEdgeTypeDataMap>) {
    this.nodes.set(node.id, node);
  }

  getNode(id: string) {
    return this.nodes.get(id);
  }

  getNodes() {
    return this.nodes;
  }

  addEdge<K extends keyof TEdgeTypeDataMap>(
    node1: string,
    node2: string,
    type: K,
    data: TEdgeTypeDataMap[K]
  ) {
    const node1Node = this.nodes.get(node1);
    const node2Node = this.nodes.get(node2);
    if (!node1Node || !node2Node) {
      throw new Error("One or more nodes not found");
    }
    const edge = {
      from: node1Node,
      to: node2Node,
      type,
      data,
    } as Edge<TNodeData, TEdgeTypeDataMap>;
    node1Node.addEdge(edge);
  }
}

export class Node<
  TNodeData,
  TEdgeTypeDataMap extends Record<string, any> = {},
> {
  data: TNodeData;
  readonly type: "document" | "chunk";
  private edges: Map<string, Edge<TNodeData, TEdgeTypeDataMap>> = new Map();

  constructor(
    readonly id: string,
    type: "document" | "chunk",
    data: TNodeData
  ) {
    this.type = type;
    this.data = data;
  }

  addEdge(edge: Edge<TNodeData, TEdgeTypeDataMap>) {
    this.edges.set(edge.to.id, edge);
  }

  getEdges() {
    return Array.from(this.edges.values());
  }
}

export function graph<
  TNodeData,
  TEdgeTypeDataMap extends Record<string, any> = {},
>(nodes?: Node<TNodeData, TEdgeTypeDataMap>[]) {
  return new Graph<TNodeData, TEdgeTypeDataMap>(nodes);
}

export function node<
  TNodeData,
  TEdgeTypeDataMap extends Record<string, any> = {},
>(type: "document" | "chunk", data: TNodeData) {
  return new Node<TNodeData, TEdgeTypeDataMap>(crypto.randomUUID(), type, data);
}

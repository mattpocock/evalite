export class Graph<T> {
  private nodes: Map<string, Node<T>> = new Map();

  constructor(nodes?: Node<T>[]) {
    if (nodes) {
      nodes.forEach((node) => this.addNode(node));
    }
  }

  addNode(node: Node<T>) {
    this.nodes.set(node.id, node);
  }

  getNode(id: string) {
    return this.nodes.get(id);
  }

  getNodes() {
    return this.nodes;
  }

  addEdge(node1: string, node2: string, type: string) {
    const node1Node = this.nodes.get(node1);
    const node2Node = this.nodes.get(node2);
    if (!node1Node || !node2Node) {
      throw new Error("One or more nodes not found");
    }
    node1Node.addEdge(new Edge(node1Node, node2Node, type));
  }
}

export class Node<T> {
  data: T;
  readonly type: "document" | "chunk";
  private edges: Map<string, Edge<T>> = new Map();

  constructor(
    readonly id: string,
    type: "document" | "chunk",
    data: T
  ) {
    this.type = type;
    this.data = data;
  }

  addEdge(edge: Edge<T>) {
    this.edges.set(edge.to.id, edge);
  }

  getEdges() {
    return Array.from(this.edges.values());
  }
}

export class Edge<T> {
  constructor(
    readonly from: Node<T>,
    readonly to: Node<T>,
    readonly type: string
  ) {}
}

export function graph<T>(nodes?: Node<T>[]) {
  return new Graph<T>(nodes);
}

export function node<T>(type: "document" | "chunk", data: T) {
  return new Node<T>(crypto.randomUUID(), type, data);
}

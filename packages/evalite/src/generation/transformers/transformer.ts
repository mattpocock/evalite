import type { Graph, Node } from "../graph.js";

export type Transformer<
  TInput extends Graph<any, any> = Graph<{}, {}>,
  TOutput extends Graph<any, any> = Graph<{}, {}>,
> = (graph: TInput) => PromiseLike<TOutput>;

export type TransformerPipeline<TGraph extends Graph<any, any>> = {
  pipe<TNext extends Graph<any, any>>(
    transformer: Transformer<TGraph, TNext>
  ): TransformerPipeline<TNext>;
  build(): Promise<TGraph>;
};

type FilterFn<T> = (node: Node<T, Record<string, unknown>>) => boolean;

export function transformer<
  TOptions,
  TInputConstraint,
  TDataAdditions = {},
  TEdgeAdditions extends Record<string, any> = {},
>(
  handler: (
    options: TOptions,
    data: {
      graph: Graph<TInputConstraint & TDataAdditions, TEdgeAdditions>;
      nodes: Node<TInputConstraint & TDataAdditions, TEdgeAdditions>[];
    }
  ) => PromiseLike<void>
): <TInput extends TInputConstraint, TEdgeMap extends Record<string, any> = {}>(
  options: TOptions & { filter?: FilterFn<TInputConstraint> }
) => Transformer<
  Graph<TInput, TEdgeMap>,
  Graph<TInput & TDataAdditions, TEdgeMap & TEdgeAdditions>
> {
  return <
    TInput extends TInputConstraint,
    TEdgeMap extends Record<string, any>,
  >(
    options: TOptions & { filter?: FilterFn<TInputConstraint> }
  ): Transformer<
    Graph<TInput, TEdgeMap>,
    Graph<TInput & TDataAdditions, TEdgeMap & TEdgeAdditions>
  > => {
    return async (
      graph: Graph<TInput, TEdgeMap>
    ): Promise<Graph<TInput & TDataAdditions, TEdgeMap & TEdgeAdditions>> => {
      const clonedGraph = graph.clone() as unknown as Graph<
        TInputConstraint & TDataAdditions,
        TEdgeAdditions
      >;

      const { filter, ...restOptions } = options;
      const allNodes = Array.from(clonedGraph.getNodes().values());
      const filteredNodes = filter
        ? allNodes.filter((n) =>
            filter(
              n as unknown as Node<TInputConstraint, Record<string, unknown>>
            )
          )
        : allNodes;

      await handler(restOptions as TOptions, {
        graph: clonedGraph,
        nodes: filteredNodes,
      });
      return clonedGraph as Graph<
        TInput & TDataAdditions,
        TEdgeMap & TEdgeAdditions
      >;
    };
  };
}

export function transform<TGraph extends Graph<any, any>>(
  graph: TGraph
): TransformerPipeline<TGraph> {
  const createPipeline = <TCurrentGraph extends Graph<any, any>>(
    currentGraph: PromiseLike<TCurrentGraph>
  ): TransformerPipeline<TCurrentGraph> => ({
    pipe<TNextGraph extends Graph<any, any>>(
      transformer: Transformer<TCurrentGraph, TNextGraph>
    ) {
      const nextGraph = Promise.resolve(currentGraph).then((resolvedGraph) =>
        transformer(resolvedGraph)
      );
      return createPipeline<TNextGraph>(nextGraph);
    },
    build() {
      return Promise.resolve(currentGraph);
    },
  });

  return createPipeline(Promise.resolve(graph));
}

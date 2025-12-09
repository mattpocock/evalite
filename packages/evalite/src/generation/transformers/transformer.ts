import type { Graph } from "../graph.js";

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

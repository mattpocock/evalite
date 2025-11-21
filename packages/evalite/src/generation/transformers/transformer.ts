import type { Graph } from "../graph.js";

export type Transformer<TInput = {}, TOutput = {}> = (
  graph: Graph<TInput>
) => PromiseLike<Graph<TOutput>>;

export type TransformerPipeline<TCurrent> = {
  pipe<TNext>(
    transformer: Transformer<TCurrent, TNext>
  ): TransformerPipeline<TNext>;
  build(): Promise<Graph<TCurrent>>;
};

export function transform<TInput>(
  graph: Graph<TInput>
): TransformerPipeline<TInput> {
  const createPipeline = <TCurrent>(
    currentGraph: PromiseLike<Graph<TCurrent>>
  ): TransformerPipeline<TCurrent> => ({
    pipe<TNext>(transformer: Transformer<TCurrent, TNext>) {
      const nextGraph = Promise.resolve(currentGraph).then((resolvedGraph) =>
        transformer(resolvedGraph)
      );
      return createPipeline<TNext>(nextGraph);
    },
    build() {
      return Promise.resolve(currentGraph);
    },
  });

  return createPipeline(Promise.resolve(graph));
}

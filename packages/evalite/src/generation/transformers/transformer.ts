import type { Graph } from "../graph.js";

export type Transformer<
  TInputNodeData = {},
  TOutputNodeData = {},
  TInputEdgeTypeDataMap extends Record<string, any> = {},
  TOutputEdgeTypeDataMap extends Record<string, any> = {},
> = (
  graph: Graph<TInputNodeData, TInputEdgeTypeDataMap>
) => PromiseLike<Graph<TOutputNodeData, TOutputEdgeTypeDataMap>>;

export type TransformerPipeline<
  TCurrentNodeData,
  TCurrentEdgeTypeDataMap extends Record<string, any>,
> = {
  pipe<TNextNodeData, TNextEdgeTypeDataMap extends Record<string, any>>(
    transformer: Transformer<
      TCurrentNodeData,
      TNextNodeData,
      TCurrentEdgeTypeDataMap,
      TNextEdgeTypeDataMap
    >
  ): TransformerPipeline<TNextNodeData, TNextEdgeTypeDataMap>;
  build(): Promise<Graph<TCurrentNodeData, TCurrentEdgeTypeDataMap>>;
};

export function transform<
  TInputNodeData,
  TInputEdgeTypeDataMap extends Record<string, any> = {},
>(
  graph: Graph<TInputNodeData, TInputEdgeTypeDataMap>
): TransformerPipeline<TInputNodeData, TInputEdgeTypeDataMap> {
  const createPipeline = <
    TCurrentNodeData,
    TCurrentEdgeTypeDataMap extends Record<string, any>,
  >(
    currentGraph: PromiseLike<Graph<TCurrentNodeData, TCurrentEdgeTypeDataMap>>
  ): TransformerPipeline<TCurrentNodeData, TCurrentEdgeTypeDataMap> => ({
    pipe<TNextNodeData, TNextEdgeTypeDataMap extends Record<string, any>>(
      transformer: Transformer<
        TCurrentNodeData,
        TNextNodeData,
        TCurrentEdgeTypeDataMap,
        TNextEdgeTypeDataMap
      >
    ) {
      const nextGraph = Promise.resolve(currentGraph).then((resolvedGraph) =>
        transformer(resolvedGraph)
      );
      return createPipeline<TNextNodeData, TNextEdgeTypeDataMap>(nextGraph);
    },
    build() {
      return Promise.resolve(currentGraph);
    },
  });

  return createPipeline(Promise.resolve(graph));
}

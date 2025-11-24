import { embed, type EmbeddingModel } from "ai";
import { transformer } from "./transformer.js";

export const embedExtractor = transformer<
  { model: EmbeddingModel<string>; field: string },
  Record<string, unknown>,
  { embedding: number[]; embeddingField: string }
>(async ({ model, field }, { nodes }) => {
  for (const node of nodes) {
    if (node.data[field] == null) continue;

    const { embedding } = await embed({
      model,
      value: String(node.data[field]),
    });
    node.data = { ...node.data, embedding, embeddingField: field };
  }
});

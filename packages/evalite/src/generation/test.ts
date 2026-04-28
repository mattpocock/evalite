import { jaccardSimilarity } from "./transformers/jaccard-similarity.js";
import { topicExtractor } from "./transformers/topic-extractor.js";
import { summaryExtractor } from "./transformers/summary-extractor.js";
import { graph, node } from "./graph.js";
import { transform } from "./transformers/transformer.js";
import { openai } from "@ai-sdk/openai";
import { embedExtractor } from "./transformers/embed-extractor.js";
import { embeddingSimilarity } from "./transformers/embedding-similarity.js";
import { chunkExtractor } from "./transformers/chunk-extractor.js";
import { generatePersona } from "./persona.js";

const g = await transform(graph([node("document", { content: "Hello world" })]))
  .pipe(chunkExtractor({ chunker: (content) => content.split(" ") }))
  .pipe(summaryExtractor({ model: openai("gpt-4.1") }))
  .pipe(topicExtractor({ model: openai("gpt-4.1") }))
  .pipe(jaccardSimilarity({ property: "topics" }))
  .pipe(
    embedExtractor({
      model: openai.embedding("text-embedding-3-small"),
      property: "summary",
    })
  )
  .pipe(embeddingSimilarity({ property: "summaryEmbedding" }))
  .pipe(embeddingSimilarity({ property: "content" }))
  .build();

g.getNodes().forEach((node) => {
  node.getEdges().forEach((edge) => {
    if (edge.type === "jaccardSimilarity") {
      console.log(
        `  Jaccard score: ${edge.data.score} (property: ${edge.data.property})`
      );
    } else if (edge.type === "embeddingSimilarity") {
      console.log(
        `  Embedding score: ${edge.data.score} (property: ${edge.data.property})`
      );
    } else if (edge.type === "chunk" || edge.type === "parent") {
      console.log(`  Chunk relationship (no score data)`);
    }
  });
});

generatePersona(g, { model: openai("gpt-4.1") }).then((personas) => {
  console.log(personas);
});

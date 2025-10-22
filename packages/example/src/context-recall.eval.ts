import { openai } from "@ai-sdk/openai";
import { evalite } from "evalite";
import { contextRecall, faithfulness } from "evalite/scorers";

evalite("RAG Context Recall", {
  data: [
    {
      input: {
        query: "What can you tell me about Albert Einstein?",
        retrievedContexts: [
          "Albert Einstein (14 March 1879 - 18 April 1955) was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. Best known for developing the theory of relativity, he also made important contributions to quantum mechanics, and was thus a central figure in the revolutionary reshaping of the scientific understanding of nature that modern physics accomplished in the first decades of the twentieth century. His mass-energy equivalence formula E = mc2, which arises from relativity theory, has been called 'the world's most famous equation'. He received the 1921 Nobel Prize in Physics 'for his services to theoretical physics, and especially for his discovery of the law of the photoelectric effect', a pivotal step in the development of quantum theory.",
        ],
      },
    },
  ],
  task() {
    return "Albert Einstein, born on 14 March 1879, was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time. He received the 1921 Nobel Prize in Physics for his services to theoretical physics. He published 4 papers in 1905. Einstein moved to Switzerland in 1895.";
  },
  scorers: [
    contextRecall({
      model: openai("gpt-4.1-mini"),
    }),
    faithfulness({
      model: openai("gpt-4.1-mini"),
    }),
  ],
});

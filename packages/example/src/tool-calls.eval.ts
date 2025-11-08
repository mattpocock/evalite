import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { evalite } from "evalite";
import { toolCallAccuracy } from "evalite/scorers";
import { z } from "zod";

const model = openai("gpt-4.1-mini");

evalite("Tool Calls", {
  data: [
    {
      input: "What calendar events do I have today?",
    },
  ],
  task: async (input) => {
    const result = await generateText({
      model,
      prompt: input,
      tools: {
        getCalendarEvents: tool({
          description: "Get calendar events",
          inputSchema: z.object({
            date: z.string(),
          }),
          execute: async ({ date }) => {
            return `You have a meeting with John on ${date}`;
          },
        }),
      },
      system: `You are a helpful assistant that can get calendar events. Today's date is 2024-04-27.`,
    });

    return result.toolCalls;
  },
  scorers: [
    {
      scorer: ({ output }) => {
        return toolCallAccuracy({
          actualCalls: output,
          expectedCalls: [
            {
              toolName: "getCalendarEvents",
              input: {
                date: "2024-04-27",
              },
            },
          ],
          mode: "flexible",
        });
      },
    },
  ],
});

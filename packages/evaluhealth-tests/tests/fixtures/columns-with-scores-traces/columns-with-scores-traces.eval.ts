import { evaluhealth } from "evaluhealth";
import { reportTrace } from "evaluhealth/traces";

evaluhealth("Columns with Scores and Traces", {
  data: () => {
    return [
      {
        input: "hello",
        expected: "HELLO",
      },
    ];
  },
  task: async (input) => {
    reportTrace({
      start: 0,
      end: 100,
      output: "traced output",
      input: [
        {
          role: "user",
          content: input,
        },
      ],
      usage: {
        inputTokens: 10,
        outputTokens: 20,
        totalTokens: 30,
      },
    });

    reportTrace({
      start: 100,
      end: 200,
      output: "second trace",
      input: "second input",
      usage: {
        inputTokens: 5,
        outputTokens: 15,
        totalTokens: 20,
      },
    });

    return input.toUpperCase();
  },
  scorers: [
    {
      name: "exact-match",
      scorer: ({ output, expected }) => {
        return {
          score: output === expected ? 1 : 0,
          metadata: { matched: output === expected },
        };
      },
    },
    {
      name: "length-score",
      scorer: ({ output }) => {
        return {
          score: output.length / 10,
          metadata: { length: output.length },
        };
      },
    },
  ],
  columns: async ({ input, output, expected, scores, traces }) => {
    return [
      {
        label: "Input",
        value: input,
      },
      {
        label: "Output",
        value: output,
      },
      {
        label: "Expected",
        value: expected,
      },
      {
        label: "Exact Match Score",
        value: scores.find((s) => s.name === "exact-match")?.score,
      },
      {
        label: "Exact Match Metadata",
        value: JSON.stringify(
          scores.find((s) => s.name === "exact-match")?.metadata
        ),
      },
      {
        label: "Length Score",
        value: scores.find((s) => s.name === "length-score")?.score,
      },
      {
        label: "Length Metadata",
        value: JSON.stringify(
          scores.find((s) => s.name === "length-score")?.metadata
        ),
      },
      {
        label: "Trace Count",
        value: traces.length,
      },
      {
        label: "First Trace Input Tokens",
        value: traces[0]?.usage?.inputTokens,
      },
      {
        label: "Total Tokens",
        value: traces.reduce((sum, t) => sum + (t.usage?.totalTokens || 0), 0),
      },
    ];
  },
});

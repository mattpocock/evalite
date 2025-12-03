// Reproduction case for issue #358: CLI crashes when table content exceeds terminal width
// https://github.com/mattpocock/evalite/issues/358
//
// This eval should crash when run in a narrow terminal (COLUMNS=80 or less)
// with error: "Subject parameter value width cannot be greater than the container width"

import { createScorer, evalite } from "evalite";

evalite("Issue 358: CLI Table Width Crash", {
  data: () => [
    {
      // Long email spam (matches issue description) - 150+ chars with emoji
      input:
        "From: promo@onlinestore.com Subject: 🔥 FLASH SALE: 50% OFF Everything Today Only! Body: Don't miss out on our biggest sale of the year! Use code SAVE50 at checkout.",
      expected: "SPAM_LOW_PRIORITY",
    },
    {
      // Long single word (tests word boundary handling)
      input:
        "ThisIsAnExtremelyLongSingleWordWithNoSpacesThatShouldTriggerTheTableWidthBugBecauseItCannotBeWrappedAtWordBoundariesAndWillExceedColumnWidth",
      expected: "INVALID_INPUT",
    },
    {
      // Long sentence with spaces (tests normal word wrapping)
      input:
        "This is a very long sentence with many words that should normally wrap at word boundaries but will still cause issues when the calculated column width is too narrow for the table package to handle properly in the terminal.",
      expected: "NORMAL_TEXT",
    },
    {
      // Mix of short input, long output (edge case testing)
      input: "short",
      expected:
        "This is a very long expected value that will appear in the Output column and should also trigger the table width crash when the terminal is narrow enough",
    },
  ],
  task: async (input) => {
    // Return a long output string to trigger width issues in both Input and Output columns
    if (input === "short") {
      return "This is a very long expected value that will appear in the Output column and should also trigger the table width crash when the terminal is narrow enough";
    }
    // For other inputs, classify them
    if (input.includes("FLASH SALE")) {
      return "SPAM_LOW_PRIORITY";
    }
    if (input.includes("ThisIsAnExtremely")) {
      return "INVALID_INPUT";
    }
    return "NORMAL_TEXT";
  },
  scorers: [
    createScorer({
      name: "Exact Match",
      scorer: ({ output, expected }) => {
        return output === expected ? 1 : 0;
      },
    }),
  ],
  columns: async ({ input, output, expected }) => [
    {
      label: "Email From",
      value: input.substring(0, 50),
    },
    {
      label: "Email Subject",
      value: input.substring(50, 150),
    },
    {
      label: "Classification",
      value: output,
    },
    {
      label: "Expected Classification",
      value: expected,
    },
    {
      label: "Full Email Body",
      value: input,
    },
  ],
});

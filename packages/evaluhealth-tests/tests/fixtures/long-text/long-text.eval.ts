import { evaluhealth } from "evaluhealth";
import { Levenshtein } from "autoevals";

evaluhealth("Long Text", {
  data: () => {
    return [
      {
        input: [
          `Some extremely long text that will test the bounds of our system.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
        ].join("\n"),
        expected: [
          `Some extremely long text that will test the bounds of our system.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
          `This is a test to see if we can handle long text inputs.`,
        ].join("\n"),
      },
    ];
  },
  task: (input) => {
    return input;
  },
  scorers: [Levenshtein],
});

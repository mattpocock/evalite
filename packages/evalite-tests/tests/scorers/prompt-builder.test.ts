import { describe, it, expect } from "vitest";
import { promptBuilder } from "evalite/_internal";

describe("promptBuilder", () => {
  describe("XML input formatting", () => {
    it("Should format simple input object as XML without indentation", () => {
      const builder = promptBuilder({
        prompt: "Test prompt",
        examples: [
          {
            input: {
              question: "What is AI?",
              answer: "Artificial Intelligence",
            },
            output: { result: "correct" },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain(
        "<input><question>What is AI?</question><answer>Artificial Intelligence</answer></input>"
      );
    });

    it("Should format nested objects as XML without indentation", () => {
      const builder = promptBuilder({
        prompt: "Test prompt",
        examples: [
          {
            input: {
              data: {
                user: "John",
                age: 25,
              },
            },
            output: { result: "success" },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain("<data><user>John</user><age>25</age></data>");
    });

    it("Should format arrays in input as compact XML", () => {
      const builder = promptBuilder({
        prompt: "Test prompt",
        examples: [
          {
            input: {
              items: ["apple", "banana", "cherry"],
            },
            output: { count: 3 },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain("<items>applebananacherry</items>");
    });

    it("Should handle multiple examples in compact format", () => {
      const builder = promptBuilder({
        prompt: "Classify sentiment",
        examples: [
          {
            input: { text: "I love this!" },
            output: { sentiment: "positive" },
          },
          {
            input: { text: "This is terrible" },
            output: { sentiment: "negative" },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain(
        '<example index="0"><input><text>I love this!</text></input>'
      );
      expect(result).toContain(
        '<example index="1"><input><text>This is terrible</text></input>'
      );
    });

    it("Should handle string, number, and boolean primitives in compact format", () => {
      const builder = promptBuilder({
        prompt: "Test primitives",
        examples: [
          {
            input: {
              name: "Alice",
              age: 30,
              active: true,
            },
            output: { status: "valid" },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain(
        "<name>Alice</name><age>30</age><active>true</active>"
      );
    });

    it("Should keep output as JSON format", () => {
      const builder = promptBuilder({
        prompt: "Test prompt",
        examples: [
          {
            input: { question: "test" },
            output: {
              statements: ["statement1", "statement2"],
              count: 2,
            },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain("<output>");
      expect(result).toContain('"statements"');
      expect(result).toContain('"count"');
      expect(result).toContain("</output>");
    });
  });

  describe("Template variable interpolation", () => {
    it("Should interpolate variables in prompt", () => {
      const builder = promptBuilder({
        prompt: "Classify {text}",
      });

      const result = builder({ text: "hello world" });

      expect(result).toContain('"hello world"');
    });
  });

  describe("Array-based task definition", () => {
    it("Should convert task array to XML", () => {
      const builder = promptBuilder({
        prompt: "Analyze statements",
        task: ["context", "statements"],
      });

      const result = builder({
        context: "Test context",
        statements: "Test statements",
      });

      expect(result).toContain(
        "<task><context>Test context</context><statements>Test statements</statements></task>"
      );
    });

    it("Should handle complex values in array-based task", () => {
      const builder = promptBuilder({
        prompt: "Evaluate",
        task: ["context", "statements"],
      });

      const result = builder({
        context: "Some context text",
        statements: ["statement 1", "statement 2", "statement 3"],
      });

      expect(result).toContain("<task><context>Some context text</context>");
      expect(result).toContain(
        "<statements>statement 1statement 2statement 3</statements></task>"
      );
    });

    it("Should handle nested objects in array-based task", () => {
      const builder = promptBuilder({
        prompt: "Test",
        task: ["data"],
      });

      const result = builder({
        data: {
          user: "John",
          age: 30,
        },
      });

      expect(result).toContain(
        "<task><data><user>John</user><age>30</age></data></task>"
      );
    });

    it("Should only include specified fields in task", () => {
      const builder = promptBuilder({
        prompt: "Test",
        task: ["context"],
      });

      const result = builder({
        context: "Only this",
        // @ts-expect-error - otherField is not included in the task
        otherField: "Not included",
      });

      expect(result).toContain("<task><context>Only this</context></task>");
      expect(result).not.toContain("otherField");
      expect(result).not.toContain("Not included");
    });

    it("Should work with empty array", () => {
      const builder = promptBuilder({
        prompt: "Test",
        task: [],
      });

      const result = builder({});

      expect(result).toContain("<task></task>");
    });
  });

  describe("Prompt structure", () => {
    it("Should wrap prompt in instructions tag", () => {
      const builder = promptBuilder({
        prompt: "Test instructions",
      });

      const result = builder({});

      expect(result).toContain(
        "<instructions>Test instructions</instructions>"
      );
    });

    it("Should include examples section when examples provided", () => {
      const builder = promptBuilder({
        prompt: "Test",
        examples: [
          {
            input: { test: "value" },
            output: { result: "output" },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain("<examples>");
      expect(result).toContain("</examples>");
    });

    it("Should not include examples section when no examples", () => {
      const builder = promptBuilder({
        prompt: "Test",
      });

      const result = builder({});

      expect(result).not.toContain("<examples>");
    });

    it("Should include task section when task provided", () => {
      const builder = promptBuilder({
        prompt: "Test",
        task: ["data"],
      });

      const result = builder({ data: "test" });

      expect(result).toContain("<task><data>test</data></task>");
    });

    it("Should structure sections in correct order", () => {
      const builder = promptBuilder({
        prompt: "Instructions here",
        examples: [
          {
            input: { x: 1 },
            output: { y: 2 },
          },
        ],
        task: ["data"],
      });

      const result = builder({ data: "test" });

      const instructionsIndex = result.indexOf("<instructions>");
      const examplesIndex = result.indexOf("<examples>");
      const taskIndex = result.indexOf("<task>");

      expect(instructionsIndex).toBeLessThan(examplesIndex);
      expect(examplesIndex).toBeLessThan(taskIndex);
    });
  });

  describe("Edge cases", () => {
    it("Should handle empty objects", () => {
      const builder = promptBuilder({
        prompt: "Test",
        examples: [
          {
            input: {},
            output: {},
          },
        ],
      });

      const result = builder({});

      expect(result).toContain("<input>");
      expect(result).toContain("</input>");
    });

    it("Should handle null and undefined values", () => {
      const builder = promptBuilder({
        prompt: "Test",
        examples: [
          {
            input: {
              value1: null,
              value2: undefined,
            },
            output: {},
          },
        ],
      });

      const result = builder({});

      expect(result).toContain("<input>");
    });

    it("Should handle long text content in compact format", () => {
      const longText =
        "Albert Einstein (14 March 1879 - 18 April 1955) was a German-born theoretical physicist, widely held to be one of the greatest and most influential scientists of all time.";

      const builder = promptBuilder({
        prompt: "Test",
        examples: [
          {
            input: {
              context: longText,
            },
            output: { result: "ok" },
          },
        ],
      });

      const result = builder({});

      expect(result).toContain(`<context>${longText}</context>`);
    });
  });
});

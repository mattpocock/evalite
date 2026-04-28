/**
 * Internal utility for building prompts used by
 * scorers.
 *
 * Most users won't need to use this directly -
 * it's used internally by the built-in scorers
 * to create consistent prompt formats.
 */
export namespace PromptBuilder {
  /**
   * Example with input and output for prompt building.
   */
  export interface Example {
    input: unknown;
    output: unknown;
  }

  /**
   * Extracts placeholder keys from a template string.
   * E.g., "Hello {name}, you are {age}" => "name" | "age"
   */
  export type ExtractPlaceholders<S extends string> =
    S extends `${infer _Start}{${infer Key}}${infer Rest}`
      ? Key | ExtractPlaceholders<Rest>
      : never;

  /**
   * Extracts keys from a readonly string array or returns never.
   */
  export type TaskKeys<T extends readonly string[] | undefined> =
    T extends readonly string[] ? T[number] : never;

  /**
   * Combines placeholder keys and task keys.
   */
  export type RequiredKeys<
    PromptT extends string,
    TaskT extends readonly string[] | undefined,
  > = ExtractPlaceholders<PromptT> | TaskKeys<TaskT>;
}

/**
 * Creates a type-safe prompt builder function that generates
 * structured prompts with instructions, examples, and task
 * sections in XML format. Interpolates placeholder values from
 * templates and wraps content in corresponding XML tags.
 */
export function promptBuilder<
  PromptT extends string,
  const TaskT extends readonly string[] | undefined = undefined,
>(config: {
  prompt: PromptT;
  examples?: PromptBuilder.Example[];
  task?: TaskT;
}) {
  const { prompt, examples = [], task } = config;

  return (
    values: PromptBuilder.RequiredKeys<PromptT, TaskT> extends never
      ? Record<string, never>
      : Record<PromptBuilder.RequiredKeys<PromptT, TaskT>, unknown>
  ): string => {
    const interpolatedPrompt = replaceTemplateVariables(prompt, values);

    let result = `<instructions>${interpolatedPrompt}</instructions>`;

    if (examples.length > 0) {
      result += `\n\n<examples>${examples
        .map(
          (example, index) =>
            `\n<example index="${index}"><input>${objectToXml(example.input)}</input><output>${JSON.stringify(example.output)}</output></example>`
        )
        .join("")}\n</examples>`;
    }

    if (task) {
      const taskObject = task.reduce(
        (acc, key) => {
          if (key in values) {
            acc[key] = values[key as keyof typeof values];
          }
          return acc;
        },
        {} as Record<string, unknown>
      );
      const taskXml = objectToXml(taskObject);
      result += `\n\n<task>${taskXml}</task>`;
    }

    return result;
  };
}

function objectToXml(obj: unknown, metadata?: Record<string, unknown>): string {
  if (
    typeof obj === "string" ||
    typeof obj === "number" ||
    typeof obj === "boolean"
  ) {
    return String(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map((item, index) => objectToXml(item, { index })).join("");
  }

  if (obj === null || obj === undefined) {
    return "";
  }

  if (typeof obj === "object") {
    return Object.entries(obj)
      .map(([key, value]) => {
        const xmlValue = objectToXml(value);
        return `<${key}${metadata && "index" in metadata ? ` index="${metadata["index"]}"` : ""}>${xmlValue}</${key}>`;
      })
      .join("");
  }

  return String(obj);
}

function replaceTemplateVariables(
  template: string,
  values: Record<string, unknown>
): string {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    if (key in values) {
      const value = values[key];
      return JSON.stringify(value);
    }
    return match;
  });
}

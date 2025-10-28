interface Example {
  input: unknown;
  output: unknown;
}

type ExtractPlaceholders<S extends string> =
  S extends `${infer _Start}{${infer Key}}${infer Rest}`
    ? Key | ExtractPlaceholders<Rest>
    : never;

export function promptBuilder<
  PromptT extends string,
  const TaskT extends readonly string[] | undefined = undefined,
>(config: { prompt: PromptT; examples?: Example[]; task?: TaskT }) {
  const { prompt, examples = [], task } = config;

  return (
    values:
      | ExtractPlaceholders<PromptT>
      | (TaskT extends readonly string[] ? TaskT[number] : never) extends never
      ? Record<string, never>
      : Record<
          | ExtractPlaceholders<PromptT>
          | (TaskT extends readonly string[] ? TaskT[number] : never),
          unknown
        >
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

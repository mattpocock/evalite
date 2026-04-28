import { generateObject, jsonSchema, type LanguageModel } from "ai";
import type { Graph, Node } from "./graph.js";
import { promptBuilder } from "../scorers/prompt-builder.js";

export interface Persona {
  description: string;
  knowledgeLevel: "novice" | "intermediate" | "expert";
}

const PersonaSchema = jsonSchema<{
  description: string;
}>({
  type: "object",
  properties: {
    description: {
      type: "string",
      description:
        "A detailed description of the fictional persona who would consume this content, including their background, motivations, and how they would interact with the material",
    },
  },
  required: ["description"],
});

const generatePersonaPrompt = promptBuilder({
  prompt:
    "Generate a fictional persona who would be interested in consuming the following content. The persona should represent a realistic reader/user with the specified knowledge level ({knowledgeLevel}). Provide a detailed description of who they are, their motivations for engaging with this content, and their background. Output JSON following the required schema.",
  examples: [
    {
      input: {
        summary:
          "A comprehensive guide to machine learning algorithms, covering supervised and unsupervised learning techniques with practical Python examples.",
        knowledgeLevel: "intermediate",
      },
      output: {
        description:
          "Sarah is a 32-year-old software developer at a mid-sized tech company. She has 5 years of experience in backend development and recently became interested in adding ML capabilities to her team's products. She's comfortable with Python but has limited exposure to data science concepts beyond basic statistics. She wants to understand the fundamentals well enough to have meaningful conversations with data scientists and potentially prototype simple ML features.",
      },
    },
    {
      input: {
        summary:
          "Introduction to gardening for beginners, covering basic soil preparation, plant selection, and watering techniques.",
        knowledgeLevel: "novice",
      },
      output: {
        description:
          "Emily is a 45-year-old office manager who just bought her first home with a backyard. She grew up in apartments and has never had outdoor space before. She's excited to start a vegetable garden but feels overwhelmed by all the options and doesn't know where to begin. She has no prior gardening experience and needs step-by-step guidance.",
      },
    },
    {
      input: {
        summary:
          "Advanced distributed systems architecture patterns for high-availability microservices deployments.",
        knowledgeLevel: "expert",
      },
      output: {
        description:
          "David is a 40-year-old principal engineer at a large fintech company. He has 15+ years of experience building distributed systems and has led several large-scale migrations. He's looking to stay current with the latest patterns and validate his architectural decisions against industry best practices. He often mentors junior engineers and needs authoritative references to share with his team.",
      },
    },
  ],
  task: ["summary", "knowledgeLevel"],
});

export async function generatePersona<
  TNodeData extends { content: string; summary?: string },
  TEdgeMap extends Record<string, unknown> = Record<string, unknown>,
>(
  graph: Graph<TNodeData, TEdgeMap>,
  {
    model,
    amount,
    filter = (node) => node.type === "document",
  }: {
    model: LanguageModel;
    amount?: number;
    filter?: (node: Node<TNodeData, TEdgeMap>) => boolean;
  }
): Promise<Persona[]> {
  const allNodes = Array.from(graph.getNodes().values());
  const filteredNodes = allNodes.filter(filter);

  if (filteredNodes.length === 0) {
    return [];
  }

  const nodesWithSummaries = filteredNodes.filter(
    (node) => node.data.summary !== undefined && node.data.summary.trim() !== ""
  );

  if (nodesWithSummaries.length === 0) {
    return [];
  }

  const totalPersonas = amount ?? nodesWithSummaries.length;

  if (totalPersonas === 0) {
    return [];
  }

  const distribution = calculatePersonasPerNode(
    totalPersonas,
    nodesWithSummaries.length
  );

  const generationPromises: Promise<Persona>[] = [];

  for (let i = 0; i < nodesWithSummaries.length; i++) {
    const node = nodesWithSummaries[i]!;
    const personaCount = distribution[i] ?? 0;

    for (let j = 0; j < personaCount; j++) {
      const knowledgeLevel = getRandomKnowledgeLevel();

      const promise = generateObject({
        model,
        schema: PersonaSchema,
        prompt: generatePersonaPrompt({
          summary: node.data.summary!,
          knowledgeLevel,
        }),
      }).then((result) => ({
        description: result.object.description,
        knowledgeLevel,
      }));

      generationPromises.push(promise);
    }
  }

  return Promise.all(generationPromises);
}

function getRandomKnowledgeLevel(): "novice" | "intermediate" | "expert" {
  const levels: readonly ["novice", "intermediate", "expert"] = [
    "novice",
    "intermediate",
    "expert",
  ];
  const index = Math.floor(Math.random() * levels.length);
  return levels[index] ?? "intermediate";
}

function calculatePersonasPerNode(
  totalAmount: number,
  nodeCount: number
): number[] {
  if (nodeCount === 0) return [];
  const baseCount = Math.floor(totalAmount / nodeCount);
  const remainder = totalAmount % nodeCount;
  return Array.from(
    { length: nodeCount },
    (_, i) => baseCount + (i < remainder ? 1 : 0)
  );
}

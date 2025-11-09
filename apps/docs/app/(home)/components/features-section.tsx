import { cn } from "@/lib/cn";
import {
  FileCode,
  Zap,
  Box,
  Unlock,
  Rocket,
  Target,
  type LucideIcon,
} from "lucide-react";

interface Feature {
  title: string;
  description: string;
  icon: LucideIcon;
}

const features: Feature[] = [
  {
    title: "Just A Test Runner",
    description:
      "`.eval.ts` is the new `.test.ts`. Write evals in TypeScript with an instantly familiar API.",
    icon: FileCode,
  },
  {
    title: "Instant Feedback",
    description:
      "Explore your outputs, traces and logs in a beautiful, interactive UI that runs on `localhost`.",
    icon: Zap,
  },
  {
    title: "Built on Vitest",
    description:
      "Works out of the box with your stack. Use mocks, fixtures, and more to simulate real-world scenarios.",
    icon: Box,
  },
  {
    title: "No Vendor Lock-In",
    description:
      "Work with any LLM, and test outputs against each other seamlessly.",
    icon: Unlock,
  },
  {
    title: "Great On CI",
    description:
      "Export your evals as static HTML bundles for CI/CD. Use score thresholds to fail the build.",
    icon: Rocket,
  },
  {
    title: "Built-in Scorers",
    description:
      "Create custom scorers or use pre-built ones from autoevals. Score outputs with ease.",
    icon: Target,
  },
];

export function FeaturesSection() {
  return (
    <section className="flex flex-col border-b border-border w-full">
      <div className="hidden lg:grid grid-cols-6 border-b border-fd-border">
        <div className="col-span-1 py-13 w-full h-full relative overflow-hidden border-r border-fd-border">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                repeating-linear-gradient(
                  to bottom,
                  transparent,
                  transparent 15px,
                  currentColor 15px,
                  currentColor 16px
                ),
                repeating-linear-gradient(
                  to right,
                  transparent,
                  transparent 15px,
                  currentColor 15px,
                  currentColor 16px
                )
              `,
              backgroundPosition: "0 0",
              color: "hsl(var(--border))",
              opacity: 0.3,
            }}
          />
        </div>
        <div className="col-span-1 py-13 w-full h-full relative overflow-hidden border-r border-fd-border"></div>
        <div className="col-span-2 flex flex-col items-center justify-center border-r border-fd-border">
          <h2 className="text-4xl font-semibold text-center">Features</h2>
        </div>
        <div className="col-span-1 py-13 w-full h-full border-r border-fd-border" />
        <div className="col-span-1 py-13 w-full h-full relative overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `radial-gradient(circle, currentColor 0.85px, transparent 0.75px)`,
              backgroundSize: "8px 8px",
              backgroundPosition: "4px 4px",
              color: "hsl(var(--border))",
              opacity: 0.3,
            }}
          />
        </div>
      </div>
      <div className="lg:hidden flex flex-col items-center justify-center py-8 border-b border-fd-border">
        <h2 className="text-3xl sm:text-4xl font-semibold text-center">
          Features
        </h2>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 border-b border-fd-border">
        {features.map((feature, index) => {
          const Icon = feature.icon;
          const isLastInRow = (index + 1) % 3 === 0;
          const isLastItem = index === features.length - 1;
          const isInFirstRow = index < 3;
          const isSecondColInTwoCol = (index + 1) % 2 === 0; // For 2-column grid (sm)
          const isThirdColInThreeCol = (index + 1) % 3 === 0; // For 3-column grid (lg)
          return (
            <div
              key={index}
              className={cn(
                "flex flex-col gap-3 p-6 sm:p-8",
                // Mobile: no border-r, border-b except last
                "border-r-0 border-b border-fd-border last:border-b-0",
                // Tablet (sm): border-r on left column only, border-b except last row
                "sm:border-r",
                isSecondColInTwoCol && "sm:border-r-0",
                index >= features.length - 2 && "sm:border-b-0",
                // Desktop (lg): border-r except right column, border-b only on first row
                "lg:border-r lg:border-b-0",
                isThirdColInThreeCol && "lg:border-r-0",
                isInFirstRow && "lg:border-b border-fd-border"
              )}
            >
              <Icon className="size-8 text-fd-foreground" />
              <h3 className="text-lg sm:text-xl font-semibold">
                {feature.title}
              </h3>
              <p className="text-fd-muted-foreground leading-relaxed text-sm sm:text-base">
                {feature.description}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}

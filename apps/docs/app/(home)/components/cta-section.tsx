import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { ArrowRight, BookOpen, Code, Rocket } from "lucide-react";

export function CTASection() {
  return (
    <section className="flex flex-col border-b border-border w-full">
      <div className="grid grid-cols-2 border-b border-fd-border">
        <div className="flex flex-col justify-center gap-6 p-12 border-r border-fd-border bg-fd-accent/30">
          <div className="flex flex-col gap-3">
            <h2 className="text-5xl font-semibold leading-tight">
              Start building better AI apps
            </h2>
            <p className="text-fd-muted-foreground text-lg leading-relaxed">
              Get started with Evalite in minutes. Write your first eval and see
              results instantly.
            </p>
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/docs">
              <button
                className={cn(
                  buttonVariants({ color: "primary" }),
                  "rounded-none gap-2 w-full justify-between group"
                )}
              >
                <span className="flex items-center gap-2">
                  <BookOpen className="size-4" />
                  Read Documentation
                </span>
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
            <Link href="/docs/guides/quickstart">
              <button
                className={cn(
                  buttonVariants({ color: "outline" }),
                  "rounded-none gap-2 w-full justify-between group"
                )}
              >
                <span className="flex items-center gap-2">
                  <Rocket className="size-4" />
                  Quick Start Guide
                </span>
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </button>
            </Link>
          </div>
        </div>
        <div className="flex flex-col justify-center gap-8 p-12">
          <div className="flex items-start gap-4">
            <div className="p-3 border border-fd-border bg-fd-accent/20">
              <Code className="size-6 text-fd-foreground" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <h3 className="text-xl font-semibold">TypeScript Native</h3>
              <p className="text-fd-muted-foreground">
                Write evals in TypeScript with full type safety and IntelliSense
                support.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-4">
            <div className="p-3 border border-fd-border bg-fd-accent/20">
              <Rocket className="size-6 text-fd-foreground" />
            </div>
            <div className="flex flex-col gap-2 flex-1">
              <h3 className="text-xl font-semibold">Local Development</h3>
              <p className="text-fd-muted-foreground">
                Run everything locally. No API keys, no cloud services, just
                your code.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

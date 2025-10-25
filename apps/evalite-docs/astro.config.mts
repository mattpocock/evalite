import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  redirects: {
    "/what-is-evalite": "/guides/what-is-evalite",
    "/quickstart": "/guides/quickstart",
    "/guides/environment-variables": "/guides/configuration",
    "/guides/skipping": "/tips/only-run-certain-evals",
    "/guides/customizing-the-ui": "/tips/customize-the-ui",
    "/guides/ci": "/tips/run-evals-on-ci-cd",
    "/guides/running-programmatically": "/tips/run-evals-programmatically",
    "/examples/ai-sdk": "/tips/vercel-ai-sdk",
    "/guides/traces": "/tips/adding-traces",
    "/guides/variant-comparison": "/tips/comparing-different-approaches",
    "/guides/multi-modal": "/tips/images-and-media",
    "/guides/cli": "/tips/watch-mode",
    "/tips/skip-evals-during-development": "/tips/only-run-certain-evals",
    "/tips/track-individual-llm-calls": "/tips/adding-traces",
    "/tips/integrate-with-ai-sdk": "/tips/vercel-ai-sdk",
    "/tips/work-with-images-and-media": "/tips/images-and-media",
    "/tips/use-watch-mode-effectively": "/tips/watch-mode",
    "/tips/set-score-thresholds": "/tips/score-thresholds",
    "/tips/run-specific-eval-files": "/tips/only-run-certain-evals",
  },
  integrations: [
    starlight({
      title: "Evalite",
      favicon: "/favicon.ico",
      editLink: {
        baseUrl:
          "https://github.com/mattpocock/evalite/edit/main/apps/evalite-docs",
      },
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:url",
            content: "https://evalite.dev",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://evalite.dev/og-image.jpg",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:width",
            content: "1280",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:height",
            content: "640",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image:alt",
            content: "Evalite Logo",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:card",
            content: "summary_large_image",
          },
        },
        {
          tag: "meta",
          attrs: {
            name: "twitter:image",
            content: "https://evalite.dev/og-image.jpg",
          },
        },
      ],
      social: {
        github: "https://github.com/mattpocock/evalite",
        discord: "https://mattpocock.com/ai-discord",
      },
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
      },
      sidebar: [
        {
          label: "Guides",
          items: [
            {
              label: "What Is Evalite?",
              slug: "guides/what-is-evalite",
            },
            {
              label: "Quickstart",
              slug: "guides/quickstart",
            },
            {
              label: "Scorers",
              slug: "guides/scorers",
            },
            {
              label: "Configuration",
              slug: "guides/configuration",
            },
          ],
        },
        {
          label: "Tips",
          items: [
            {
              label: "Only Run Certain Evals",
              slug: "tips/only-run-certain-evals",
            },
            {
              label: "Customize The UI",
              slug: "tips/customize-the-ui",
            },
            {
              label: "CI/CD",
              slug: "tips/run-evals-on-ci-cd",
            },
            {
              label: "Adding Traces",
              slug: "tips/adding-traces",
            },
            {
              label: "Vercel AI SDK",
              slug: "tips/vercel-ai-sdk",
            },
            {
              label: "Comparing Different Approaches",
              slug: "tips/comparing-different-approaches",
            },
            {
              label: "Run Evals Programmatically",
              slug: "tips/run-evals-programmatically",
            },
            {
              label: "Images And Media",
              slug: "tips/images-and-media",
            },
            {
              label: "Run Same Eval Multiple Times",
              slug: "tips/run-same-eval-multiple-times",
            },
            {
              label: "Watch Mode",
              slug: "tips/watch-mode",
            },
            {
              label: "Score Thresholds",
              slug: "tips/score-thresholds",
            },
          ],
        },
        {
          label: "Reference",
          items: [
            {
              label: "evalite()",
              slug: "api/evalite",
            },
            {
              label: "CLI",
              slug: "api/cli",
            },
            {
              label: "defineConfig()",
              slug: "api/define-config",
            },
            {
              label: "createScorer()",
              slug: "api/create-scorer",
            },
            {
              label: "EvaliteFile",
              slug: "api/evalite-file",
            },
            {
              label: "Traces",
              slug: "api/traces",
            },
            {
              label: "runEvalite()",
              slug: "api/run-evalite",
            },
            {
              label: "Storage",
              slug: "api/storage",
            },
          ],
        },
      ],
    }),
  ],
});

import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
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
        {
          tag: "script",
          attrs: {
            src: "https://www.googletagmanager.com/gtag/js?id=G-KBWLHSRCHD",
            async: true,
          },
        },
        {
          tag: "script",
          content: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-KBWLHSRCHD');
          `,
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
              label: "The Dev Loop",
              slug: "guides/dev-loop",
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
              label: "Customize The UI",
              slug: "tips/customize-the-ui",
            },
            {
              label: "A/B Testing",
              slug: "tips/comparing-different-approaches",
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
              label: "Images And Media",
              slug: "tips/images-and-media",
            },
            {
              label: "CI/CD",
              slug: "tips/run-evals-on-ci-cd",
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

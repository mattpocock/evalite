import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";

// https://astro.build/config
export default defineConfig({
  integrations: [
    starlight({
      title: "Evaluhealth",
      favicon: "/favicon.ico",
      components: {
        Banner: "./src/components/Banner.astro",
      },
      editLink: {
        baseUrl:
          "https://github.com/kernelius-hq/evaluhealth/edit/main/apps/evaluhealth-docs",
      },
      head: [
        {
          tag: "meta",
          attrs: {
            property: "og:url",
            content: "https://evalu.health",
          },
        },
        {
          tag: "meta",
          attrs: {
            property: "og:image",
            content: "https://evalu.health/og-image.jpg",
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
            content: "Evaluhealth Logo",
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
            content: "https://evalu.health/og-image.jpg",
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
        github: "https://github.com/kernelius-hq/evaluhealth",
        discord: "https://kernelius.com/discord",
      },
      logo: {
        light: "./src/assets/logo-light.svg",
        dark: "./src/assets/logo-dark.svg",
      },
      sidebar: [
        {
          label: "Getting Started",
          items: [
            {
              label: "What Is Evaluhealth?",
              slug: "what-is-evaluhealth",
            },
            {
              label: "Quickstart",
              slug: "quickstart",
            },
          ],
        },
        {
          label: "Guides",
          items: [
            {
              label: "Environment Variables",
              slug: "guides/environment-variables",
            },
            {
              label: "Scorers",
              slug: "guides/scorers",
            },
            {
              label: "Traces",
              slug: "guides/traces",
            },
            {
              label: "A/B Testing",
              slug: "guides/variant-comparison",
            },
            {
              label: "Multi-Modal",
              slug: "guides/multi-modal",
            },
            {
              label: "Configuration",
              slug: "guides/configuration",
            },
            {
              label: "Streams",
              slug: "guides/streams",
            },
            {
              label: "CLI",
              slug: "guides/cli",
            },
            {
              label: "Running Programmatically",
              slug: "guides/running-programmatically",
            },
            {
              label: "CI/CD",
              slug: "guides/ci",
            },
            {
              label: "Skipping Evals",
              slug: "guides/skipping",
            },
            {
              label: "Customizing The UI",
              slug: "guides/customizing-the-ui",
            },
          ],
        },
        {
          label: "Integrations",
          items: [{ label: "Vercel AI SDK", slug: "examples/ai-sdk" }],
        },
      ],
    }),
  ],
});

import { defineConfig } from "../src/index.js";

export default defineConfig({
  title: "Vellum",
  description: "Markdown-first documentation, built on Fairyfly.",
  lang: "en",
  base: "/",
  nav: [
    { label: "Guide", link: "/guide/getting-started/" },
    { label: "Reference", link: "/reference/cli/" },
  ],
  sidebar: [
    {
      label: "Overview",
      items: [{ label: "Introduction", link: "/" }],
    },
    {
      label: "Guide",
      items: [
        { label: "Getting started", link: "/guide/getting-started/" },
        { label: "Configuration", link: "/guide/configuration/" },
        { label: "Writing Markdown", link: "/guide/markdown/" },
        { label: "Theming", link: "/guide/theming/" },
        { label: "Landing pages", link: "/guide/landing-pages/" },
        { label: "Build and bundling", link: "/guide/bundling/" },
        { label: "Type safety with Flow", link: "/guide/flow/" },
        { label: "Deployment", link: "/guide/deployment/" },
      ],
    },
    {
      label: "Reference",
      items: [
        { label: "CLI", link: "/reference/cli/" },
        { label: "Public API", link: "/reference/api/" },
        { label: "Architecture", link: "/reference/architecture/" },
        { label: "Fairyfly compatibility", link: "/reference/fairyfly/" },
        { label: "Limitations", link: "/reference/limitations/" },
      ],
    },
  ],
  theme: {
    accent: "#6d5efc",
  },
  markdown: {
    tables: true,
    callouts: true,
    headingAnchors: true,
  },
  search: {
    enabled: true,
    maxResults: 10,
  },
  bundler: {
    provider: "auto",
  },
});

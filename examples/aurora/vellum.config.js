import { defineConfig } from "vellum-docs";

export default defineConfig({
  title: "Aurora",
  description: "A tiny event bus for JavaScript.",
  nav: [
    { label: "Guide", link: "/guide/installation/" },
    { label: "Reference", link: "/reference/api/" },
  ],
  sidebar: [
    {
      label: "Overview",
      items: [{ label: "Introduction", link: "/" }],
    },
    {
      label: "Guide",
      items: [
        { label: "Installation", link: "/guide/installation/" },
        { label: "Usage", link: "/guide/usage/" },
        { label: "Recipes", link: "/guide/recipes/" },
      ],
    },
    {
      label: "Reference",
      items: [{ label: "API", link: "/reference/api/" }],
    },
  ],
  theme: {
    accent: "#0f766e",
    logo: "/aurora.svg",
    favicon: "/aurora.svg",
    customCss: ["src/styles/aurora.css"],
  },
  search: {
    enabled: true,
  },
  bundler: {
    provider: "builtin",
  },
  dev: {
    port: 4500,
  },
});

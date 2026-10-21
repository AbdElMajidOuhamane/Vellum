---
title: Vellum
description: Markdown-first documentation, built on Fairyfly.
layout: splash
hero:
  eyebrow: Documentation
  tagline: Write Markdown. Ship a fast, accessible documentation site without a client framework, a database, or a build service.
  actions:
    - text: Get started
      link: /guide/getting-started/
      variant: primary
    - text: Read the architecture
      link: /reference/architecture/
      variant: secondary
features:
  - title: Markdown-first
    description: Plain .md files with a small YAML frontmatter block and no component syntax.
  - title: Static by default
    description: Pre-rendered HTML, CSS, JSON, and XML with no hydration layer.
  - title: Landing pages
    description: A splash layout with hero images, action buttons, and feature cards.
  - title: Search included
    description: A compact client-side index, generated at build time.
  - title: Fairyfly-native
    description: Content, routing, rendering, and the dev server run in Fairyfly.
  - title: Typed with Flow
    description: Comment-syntax annotations execute without a transform step.
---

## Why Vellum

Vellum turns a folder of Markdown files into a complete documentation site. Pages
are pre-rendered to HTML, navigation and search are generated at build time, and
the default theme is responsive, keyboard-friendly, and dark-mode aware.

## Quick start

```sh
# Scaffold a site
vellum new my-docs
cd my-docs

# Install the framework and the optional frontend bundler
npm install

# Start the dev server
npm run dev
```

Open `http://localhost:4321/`. Edit a Markdown file and the page reloads.

When you are ready to deploy:

```sh
npm run build
npm run preview
```

The output is written to `dist/`.

## What a page looks like

```md
---
title: Installation
description: Install Vellum and create your first site.
order: 2
sidebar:
  label: Install
  group: Guide
---

# Installation

Vellum is an ES module framework that runs on Fairyfly.

> [!TIP]
> Run `vellum check` before you deploy. It validates routes and internal links.

| Command | Purpose |
| --- | --- |
| `vellum dev` | Development server with live reload |
| `vellum build` | Static site generation |
| `vellum preview` | Serve the built output |
```

The file path becomes the route: `guide/install.md` is served at
`/guide/install/`. The frontmatter drives the page title, meta description,
sidebar label, and ordering.

## Design principles

1. **Predictable output.** Every page is a self-contained HTML document with
   semantic landmarks, canonical metadata, and no hydration requirement.
2. **Small surface area.** The framework owns Markdown, content collection,
   routing, rendering, and the dev server. The browser build is isolated behind a
   replaceable adapter.
3. **Honest runtime boundaries.** If Rsbuild is unavailable, Vellum says so and
   uses its built-in asset pipeline. It never pretends a Node.js tool is running
   inside Fairyfly.
4. **Accessible by default.** Skip links, visible focus, reduced-motion support,
   labelled navigation, keyboard search, and print styles ship in the theme.

## Next steps

- Read [Getting started](/guide/getting-started/) for the full local workflow.
- Learn the [configuration schema](/guide/configuration/).
- See exactly what [Fairyfly supports](/reference/fairyfly/) before relying on a
  Node.js API.

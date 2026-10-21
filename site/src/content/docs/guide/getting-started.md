---
title: Getting started
description: Install Fairyfly, scaffold a Vellum site, and run the development and build workflows.
order: 1
---

# Getting started

Vellum is a Markdown-first documentation framework that runs on
[Fairyfly](https://github.com/AbdElMajidOuhamane/ff). The framework runtime needs
Fairyfly only. Node.js, npm, Rsbuild, and Flow are optional tooling.

## Requirements

| Tool | Why it is needed |
| --- | --- |
| `ff` 0.2.0+ | Runs the Vellum CLI, content pipeline, renderer, dev server, and build |
| Node.js 18+ | Optional; runs Rsbuild when you want bundled browser assets |
| Flow 0.279+ | Optional; type-checks framework source |
| npm | Optional; one way to install `vellum-docs` and `@rsbuild/core` |

Fairyfly is not Node.js. A Fairyfly project is described by **`ff.json`**, and
dependencies are installed with **`ff imprint`**. `package.json` is npm metadata
and is read only when resolving packages inside `node_modules`.

```sh
ff --version
# optional:
node --version
flow version
```

If `ff` is not installed, use the official installer or build it from source:

```sh
curl -fsSL https://raw.githubusercontent.com/AbdElMajidOuhamane/ff/main/install.sh | sh
```

## Scaffold a site

```sh
vellum new my-docs
cd my-docs

# Fairyfly-native dependency install
ff imprint vellum-docs
```

`vellum new` writes a complete starter project:

```text
my-docs/
  ff.json                 project manifest; main is vellum.js
  vellum.js       runCli + findFrameworkRoot entry for ff
  vellum.config.js
  package.json            optional npm scripts and dev dependencies
  public/
    favicon.svg
  src/content/docs/
    index.md
    guide/
      getting-started.md
      writing.md
```

If you prefer npm, `npm install` also works. It additionally installs
`@rsbuild/core` for the bundled browser pipeline. `ff imprint` installs only the
pure-ESM runtime dependency, so an ff-only project uses the built-in asset
pipeline.

It refuses to write into a non-empty directory unless you pass `--force`:

```sh
vellum new existing-dir --force
```

## Develop

```sh
ff start
```

`ff start` reads `main` from `ff.json` and runs `vellum.js`, which starts
the Vellum dev server. You can also invoke the command directly:

```sh
ff vellum.js dev
```

The CLI starts Fairyfly's HTTP server on port `4321` and prints the URL. The dev
server renders pages on demand, includes a small live-reload client, and watches
your content and theme files by fingerprint polling.

```text
✓ Vellum dev server listening on http://localhost:4321/
  • watching Markdown and theme files (polling, no fs.watch)
```

Edit `src/content/docs/index.md` and save. The browser reloads after the watcher
notices the change.

### Change the port

```sh
ff vellum.js dev --port 5000
```

The port can also be set in configuration or with `VELLUM_PORT`:

```js
export default {
  dev: { port: 5000 },
};
```

## Build

```sh
ff vellum.js build
```

The build:

1. Collects Markdown files and parses frontmatter.
2. Renders every page to a complete HTML document.
3. Generates `search-index.json`, `sitemap.xml` (when `site` is set), and
   `robots.txt`.
4. Copies files from `public/` to the output root.
5. Emits the theme CSS and browser client, either through Rsbuild or the built-in
   asset pipeline.

The default output directory is `dist/`. Override it with `--out` or `outDir`:

```sh
ff vellum.js build --out public-build
```

> [!WARNING]
> Vellum clears the output directory before writing. Never point `outDir` at the
> project root or at a folder containing source files.

## Preview

```sh
ff vellum.js preview
```

`preview` serves `dist/` with the right MIME types, directory indexes, and the
generated `404.html`. It does not run the dev watcher.

## Validate

```sh
ff vellum.js check
```

This validates sidebar and navigation targets, duplicate routes, and internal
links. Add `--json` for a machine-readable result.

Flow is a separate, optional development check:

```sh
npm run check:flow
```

It runs over framework source; it is not part of the Fairyfly runtime.

## Common commands

| Command | What it does |
| --- | --- |
| `ff start` | Run `vellum.js` from `ff.json` (dev server) |
| `ff vellum.js build` | Generate the static site |
| `ff vellum.js preview` | Serve the generated site |
| `ff vellum.js check` | Validate content, routes, and links |
| `vellum new <dir>` | Scaffold a site (CLI installed separately) |
| `ff vellum.js version` | Print the framework version |

Continue with [Configuration](/guide/configuration/) or jump to
[Writing Markdown](/guide/markdown/).

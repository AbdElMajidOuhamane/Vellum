# Vellum

**Markdown-first documentation, built on Fairyfly.**

Vellum turns a folder of Markdown files into a complete documentation site:
pre-rendered HTML, generated navigation, client-side search, responsive light and
dark themes, and a fast development loop. It is an independent framework inspired
by the ergonomics of Astro and Starlight, not a port of either.

- **Runtime:** [Fairyfly](https://github.com/AbdElMajidOuhamane/ff) `0.2.0+`
- **Type checking:** [Flow](https://flow.org/) using comment syntax
- **Browser bundling:** [Rsbuild](https://rsbuild.dev/) / [Rspack](https://rspack.dev/) as an optional Node subprocess
- **Output:** static HTML, CSS, JavaScript, JSON, XML, and copied assets

> Status: `0.1.0`, pre-1.0. The runtime contract is tested against Fairyfly
> `0.2.0-beta` on macOS and is designed for POSIX systems.

---

## Why Vellum

- **Markdown-first.** Pages are plain `.md` files with a small YAML frontmatter
  block. No component syntax is required.
- **Static by default.** Every page is pre-rendered. There is no hydration layer
  and no server runtime in production.
- **Landing pages included.** `layout: splash` renders a hero with optional image
  and actions plus a feature-card grid, and drops the sidebar and TOC for that
  page only.
- **Theming without a fork.** Accent, logo, favicon, and semantic CSS tokens are
  configurable; `theme.customCss` appends your stylesheet to the built theme.
- **Small dependency surface.** The framework owns Markdown, content collection,
  routing, rendering, search indexing, and the dev server. Rsbuild is optional.
- **Honest boundaries.** Content processing, the CLI, and the dev server run in
  Fairyfly. Rsbuild runs in Node and is invoked as a child process. The CLI says
  which path it used.
- **Typed without a transform.** Flow annotations live in comments, so framework
  modules are executable by QuickJS exactly as written.
- **Accessible defaults.** Skip links, labelled landmarks, keyboard search,
  visible focus, reduced-motion support, and print styles ship in the theme.

---

## Quick start

Requirements:

- **Fairyfly `0.2.0+`** runs the CLI, content pipeline, renderer, and dev server.
- **Node.js 18+** is optional and only used by Rsbuild for browser bundling.
- **Flow `0.279+`** is optional and only used for type checking.
- **npm** is optional; it is one way to install Vellum. `ff imprint` is the
  Fairyfly-native package installer.

Fairyfly uses **`ff.json`** as the project manifest. `package.json` is package
metadata used by npm and by Fairyfly's `node_modules` resolution; it is not a
Fairyfly project manifest, and the Vellum runtime does not use Node.

```sh
# Install the CLI from GitHub (npm is only the bootstrap here)
npm install -g github:AbdElMajidOuhamane/Vellum#v0.1.0

# Scaffold a site
vellum new my-docs
cd my-docs

# Fairyfly-native install and run
ff imprint github:AbdElMajidOuhamane/Vellum#v0.1.0
ff start
```

Without npm, clone the repository and run
`ff Vellum/bin/vellum.js new my-docs` from the clone's parent directory.

`ff.json` points at `vellum.js`, which calls the Vellum CLI through
Fairyfly. Open `http://localhost:4321/`. Edit `src/content/docs/index.md`; the dev
server re-renders and reloads the browser.

```sh
ff vellum.js build     # static output in dist/
ff vellum.js preview   # serve dist/
ff vellum.js check     # content/link validation
```

If you prefer npm tooling, the scaffold also includes package scripts:

```sh
npm install       # also installs @rsbuild/core for bundled browser assets
npm run dev
npm run build
npm run preview
npm run check     # Flow + content/link validation
```

`ff imprint` installs only pure-ESM runtime dependencies, so an ff-only setup
uses the built-in asset pipeline. Install `@rsbuild/core` (usually with npm) if
you want Rsbuild and Rspack for the browser bundle.

## Runnable examples

[`examples/aurora`](examples/aurora/) is a small, Node-free site documenting a
fictional event bus. It shows frontmatter, routes, nav, sidebar, search, TOC,
callouts, tables, code blocks, the built-in asset pipeline, a splash landing page
with hero image and feature cards, and a custom CSS theme layer.

[`examples/fairyfly`](examples/fairyfly/) is the full Fairyfly runtime
documentation — 46 pages copied from
the [Fairyfly repository](https://github.com/AbdElMajidOuhamane/ff) under
MPL-2.0. It exercises `base: "/docs/"` with absolute links written for another
site, a six-group explicit sidebar, dense tables, and static sitemap output.

```sh
cd examples/aurora
./setup-local.sh   # copies the framework into node_modules without npm
ff start           # dev server on http://localhost:4500/
ff vellum.js build # static output in dist/
```

```sh
cd examples/fairyfly
./setup-local.sh
ff start             # http://localhost:4600/docs/
ff vellum.js check   # 46 pages, 237 links
ff vellum.js build
```

Both examples use the same `ff.json` + `vellum.js` shape as `vellum new`. On an
installed project, `setup-local.sh` is replaced by
`ff imprint github:AbdElMajidOuhamane/Vellum#v0.1.0`.

A minimal site is just a config file and a Markdown file:

```js
// vellum.config.js
import { defineConfig } from "vellum-docs";

export default defineConfig({
  title: "My docs",
  description: "Documentation for My Project.",
  nav: [{ label: "Guide", link: "/guide/" }],
  sidebar: "auto",
});
```

```md
---
title: Introduction
description: Start here.
---

# Introduction

Welcome to the docs.
```

---

## Commands

| Command | Purpose |
| --- | --- |
| `vellum dev` | Development server with live reload |
| `vellum build` | Static site generation |
| `vellum preview` | Serve the generated site |
| `vellum check` | Validate config, routes, and internal links |
| `vellum new <dir>` | Scaffold a documentation site |
| `vellum version` | Print the version |

Useful flags: `--config`, `--root`, `--port`, `--out`, `--bundler`, `--drafts`,
`--no-search`, `--json`, `--verbose`. Full reference:
[`site/src/content/docs/reference/cli.md`](site/src/content/docs/reference/cli.md).

---

## Project layout

```text
ff.json                   Fairyfly project manifest (repo entry)
package.json              npm metadata; not a Fairyfly project manifest
bin/
  vellum                  POSIX launcher (sets VELLUM_ROOT)
  vellum.js               CLI entry executed by ff (no shebang)
src/
  cli.js                  command dispatch
  cli/                    argument parser and scaffolder
  config.js               config loading, validation, defaults
  content/                frontmatter, YAML subset, Markdown, routes, sidebar
  render/                 document head, layout, components, error pages
  build/                  static build, assets, search, sitemap, Rsbuild adapter
  server/                 dev server, preview, router, watcher, live client
  theme/                  default CSS and browser client
  types.js                shared Flow types (comment syntax)
  index.js                public API
flow-typed/globals.js     Fairyfly globals for Flow
test/                     ff test suites
examples/aurora/          small Node-free example site
examples/fairyfly/        Fairyfly runtime docs (46 pages, MPL-2.0)
site/                     the framework's own documentation site
docs/                     internal architecture, compatibility, and ADRs
```

A scaffolded Vellum project uses the same split:

```text
ff.json                   project manifest; main is vellum.js
vellum.js         runCli + findFrameworkRoot entry for ff
vellum.config.js          site configuration
package.json              optional npm scripts and dev dependencies
```

---

## Architecture

```text
Markdown + frontmatter
        |
        v
  collectContent  -->  entries (route, HTML, headings, links)
        |
        v
   buildSite / dev server
        |
        +--> HTML pages, search index, sitemap, robots.txt
        |
        +--> built-in asset pipeline
        |      theme CSS + browser client
        |
        +--> Rsbuild adapter (Node subprocess)
               entry.js -> Rsbuild/Rspack -> assets
```

- `resolveConfig` validates untrusted config input and returns a fully populated
  `ResolvedConfig`.
- `renderMarkdown` parses blocks and inline syntax, records headings and links,
  and rewrites `.md` links to routes with the configured base.
- `renderPage` emits a complete document with SEO, navigation, TOC, search, and
  pagination.
- The dev server uses fingerprint polling because Fairyfly has no `fs.watch` or
  file metadata API.
- The browser client is a classic script; it can be copied verbatim or bundled by
  Rsbuild.

See [`docs/architecture.md`](docs/architecture.md) and the published
[architecture page](site/src/content/docs/reference/architecture.md).

---

## Flow without a transform

Fairyfly's QuickJS runtime does not parse Flow annotations. Vellum uses Flow's
comment syntax so every module is valid JavaScript:

```js
// @flow
/*:: import type { Page } from "./types.js"; */

export function titleOf(page /*: Page */) /*: string */ {
  return page.title;
}
```

There is no `flow-remove-types` or Babel step in the runtime path. Type checking is
a development task:

```sh
npm run check:flow     # flow check --max-warnings 0
```

`src/types.js` holds the shared contract. `flow-typed/globals.js` declares
Fairyfly globals such as `fs`, `http`, `child_process`, and `process`.

---

## Rsbuild, honestly

Rsbuild and Rspack require Node built-ins and native bindings. They cannot execute
inside Fairyfly. Vellum:

1. Detects `@rsbuild/core` and a working Node executable.
2. Generates `.vellum/rsbuild/entry.js` and `.vellum/rsbuild/build.mjs`.
3. Runs the build with Node as a child process.
4. Copies `assets/vellum.{css,js}` into `dist/assets/`.
5. Falls back to the built-in CSS/client copier only when Rsbuild is unavailable.

`bundler.provider` accepts `auto`, `rsbuild`, or `builtin`. See
[`docs/decisions/0002-rsbuild-subprocess.md`](docs/decisions/0002-rsbuild-subprocess.md).

---

## Fairyfly compatibility summary

Verified against `ff 0.2.0-beta`:

- ES modules, top-level `await`, dynamic `import()`, and `node_modules` resolution
  work. `require()` and CommonJS do not.
- A Fairyfly project is described by **`ff.json`** (`ff start` runs its `main`).
  `package.json` is used for npm metadata and for resolving packages inside
  `node_modules`; it is not the project manifest.
- `ff imprint` installs pure-JS ESM packages into `node_modules` and records them
  in `ff.json`/`ff.lock`. Node.js is not embedded in Fairyfly.
- `import.meta.url` is empty; Vellum derives its package root from `VELLUM_ROOT` or
  `process.argv[1]`.
- Shebangs break module parsing; `bin/vellum` is a POSIX shell wrapper.
- Sync `fs` failures are silent. Vellum wraps them with existence checks and
  actionable errors.
- `fs.writeFile` accepts text only. Binary copies use `cp`.
- There is no `fs.stat` or `fs.watch`; the dev server hashes file contents on a
  timer.
- `console.log` writes to stderr; response bodies are buffered; request bodies are
  capped around 4 KB.
- HTTP handlers get `(url, method, body)` strings and return a `Response`.
- Rsbuild cannot run in-process.

Full notes and probe results:
[`docs/fairyfly-compatibility.md`](docs/fairyfly-compatibility.md).

---

## Development

```sh
npm install
flow version          # 0.279+ (brew install flow / npm i -g flow-bin)
npm run check:flow
npm test
npm run build
npm run check:content
```

`npm test` runs `ff test`, which executes every `test/*.test.js` file. Test files
use Fairyfly globals and the shared harness in `test/lib.js`.

Build the documentation site:

```sh
ff bin/vellum.js build --config site/vellum.config.js
ff bin/vellum.js check --config site/vellum.config.js
```

The output is `site/dist/`.

---

## Limitations

Vellum is not a general application framework. It has no MDX, footnotes, i18n,
versioned docs, incremental builds, HMR, or server-side rendering. The Markdown
engine is a documented subset, not a CommonMark conformance suite. Content is
trusted; raw HTML is not sanitized.

See [`site/src/content/docs/reference/limitations.md`](site/src/content/docs/reference/limitations.md).

---

## License

MIT. Vellum is an independent project and does not include code from Astro,
Starlight, or Fairyfly.

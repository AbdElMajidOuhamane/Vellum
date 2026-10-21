---
title: Public API
description: Programmatic exports for config, content, Markdown, rendering, builds, and servers.
order: 2
---

# Public API

The package entry point re-exports the supported integration surface. Framework
internals are still importable for advanced use, but these are the stable names.

```js
import {
  defineConfig,
  loadConfig,
  resolveConfig,
  findFrameworkRoot,
  runCli,
  collectContent,
  renderMarkdown,
  buildToc,
  renderPage,
  buildSite,
  createDevServer,
  createPreviewServer,
  VERSION,
} from "vellum-docs";
```

Flow types live in `src/types.js` and are written in comment syntax. They are not
runtime exports.

## Configuration

### `defineConfig(config)`

Identity helper for `vellum.config.js`. Returns the same object.

```js
import { defineConfig } from "vellum-docs";

export default defineConfig({ title: "Docs" });
```

### `loadConfig(options)`

Loads and validates a config file. Returns a `ResolvedConfig`.

```js
const config = await loadConfig({
  root: "/project",
  configPath: "/project/vellum.config.js",
  frameworkRoot: "/project/node_modules/vellum-docs",
});
```

| Option | Description |
| --- | --- |
| `root` | Project root; defaults to the config directory |
| `configPath` | Explicit config file |
| `cwd` | Base for relative paths; defaults to `process.cwd()` |
| `frameworkRoot` | Framework package root, used to import the config reliably |

The config can default-export an object or an async function returning an object.

### `findFrameworkRoot(start)`

Locates the installed `vellum-docs` package by walking up from `start` through
`node_modules/vellum-docs`, or from `VELLUM_ROOT`. It exists because Fairyfly has
no `import.meta.url`.

```js
const frameworkRoot = findFrameworkRoot(process.cwd());
```

### `runCli(argv, { frameworkRoot })`

Runs the Vellum command dispatcher. This is what the generated project entry uses
with `ff.json`:

```js
// vellum.js
import { findFrameworkRoot, runCli } from "vellum-docs";

const command = process.argv[2] || "dev";
await runCli([command, ...process.argv.slice(3)], {
  frameworkRoot: findFrameworkRoot(process.cwd()),
});
```

With `"main": "vellum.js"` in `ff.json`, `ff start` runs the dev server.

### `resolveConfig(raw, metadata)`

Validates an already-imported object and fills defaults. Useful for tests and
custom integrations.

```js
const config = resolveConfig(
  { title: "Docs", base: "/docs/" },
  { root: "/project", configPath: "/project/vellum.config.js" },
);
```

## Content

### `collectContent(config, options)`

Reads Markdown, parses frontmatter, renders pages, and returns entries keyed by
route.

```js
const { entries, byRoute, warnings } = collectContent(config, {
  includeDrafts: false,
});
```

Each `ContentEntry` includes `route`, `outputFile`, `frontmatter`, `title`,
`description`, `html`, `headings`, `bodyText`, `links`, and sidebar metadata.

### `renderMarkdown(source, options)`

Renders Markdown without collecting a project.

```js
const { html, headings, bodyText, links } = renderMarkdown("# Hello", {
  base: "/docs/",
  currentFile: "guide/intro.md",
  currentRoute: "/guide/intro/",
  trailingSlash: true,
});
```

Options mirror the configuration's Markdown flags plus the link-resolution
context (`base`, `currentFile`, `currentRoute`, `trailingSlash`).

### `buildToc(headings, maxLevel)`

Builds a nested table-of-contents tree from parsed headings. The default maximum
level is `3`.

## Rendering

### `renderPage(context)`

Renders a complete HTML document. The context includes the resolved config, the
entry, all entries, navigation, sidebar, TOC, previous/next entries, asset URLs,
`dev`, and `version`.

This is the function the build uses for every page. Custom renderers can import
components from `src/render/components.js` or build their own document.

## Build

### `buildSite(config, options)`

```js
const result = await buildSite(config, {
  frameworkRoot: "/project/node_modules/vellum-docs",
  logger,
  includeDrafts: false,
});
```

`frameworkRoot` is required so the theme assets can be found. The CLI sets it
automatically. Returns a `BuildResult` with page count, asset URLs, output path,
duration, warnings, and the selected bundler (`builtin` or `rsbuild`).

The build clears `config.outDir` before writing.

## Servers

### `createDevServer(config, frameworkRoot, logger)`

Starts Fairyfly's HTTP server, returns `{ port, url, stop }`, and begins the
fingerprint watcher. `stop()` clears the watcher interval; Fairyfly does not expose
an HTTP server close API.

### `createPreviewServer(config, options)`

Serves `config.outDir` with directory indexes, `.html` fallbacks, MIME types, and
the generated 404 page. Returns `{ port, url, stop }`.

## Version

```js
import { VERSION } from "vellum-docs";
```

`VERSION` is also used in the generator meta tag and CLI output.

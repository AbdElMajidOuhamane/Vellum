---
title: Architecture
description: The layers, data flow, and runtime boundaries behind Vellum.
order: 3
---

# Architecture

Vellum is organized around a one-way content pipeline. Configuration and Markdown
come in; HTML, search data, and assets come out. The dev server reuses the same
pipeline on demand.

```text
CLI (Fairyfly)
  |
  +-- loadConfig / resolveConfig
  |     config validation and path resolution
  |
  +-- collectContent
  |     Markdown -> frontmatter -> parser -> entries
  |
  +-- buildSite                         +-- createDevServer
        sidebar, nav, prev/next          |     same renderer, per request
        renderPage                       |     fingerprint watcher
        write HTML / search / sitemap    |     live-reload endpoint
        emit assets                      |
              |                          |
              +---- builtin pipeline ----+
              |        CSS + client
              |
              +---- Rsbuild adapter -----> Node subprocess
                       entry.js             Rsbuild / Rspack
                       build.mjs            assets/vellum.{css,js}
```

## Layers

| Layer | Modules | Responsibility |
| --- | --- | --- |
| CLI | `bin/vellum`, `src/cli.js`, `src/cli/flags.js` | Parse flags, load config, dispatch commands |
| Config | `src/config.js` | Validate user input, resolve paths, apply defaults |
| Content | `src/content/` | Frontmatter, YAML subset, Markdown, routes, sidebar, links |
| Render | `src/render/` | Document head, layout, components, 404 and error pages |
| Build | `src/build/` | Static generation, assets, search index, sitemap, Rsbuild adapter |
| Server | `src/server/` | Routing, static files, dev server, preview, fingerprint watcher |
| Theme | `src/theme/` | CSS, browser client, logos |
| Types | `src/types.js`, `flow-typed/` | Flow contract and Fairyfly globals |

The content and render layers are pure JavaScript. They do not import Node
modules, use `Buffer`, or depend on the DOM. The browser client is the only code
written for a browser runtime.

## Content pipeline

1. `collectContent` walks `srcDir` for `.md` and `.markdown` files.
2. `splitFrontmatter` separates the YAML block and parses it with the strict YAML
   subset in `src/content/yaml.js`.
3. `routeForFile` derives the route from the relative path, or uses `slug`.
4. `renderMarkdown` parses blocks, then inlines, and rewrites `.md` links to
   routes. It records headings, plain text, and link references.
5. `titleFor` and `descriptionFor` fill metadata from frontmatter, the first
   heading, or the first paragraph.
6. Sidebar metadata is normalized into `sidebarLabel`, `sidebarOrder`,
   `sidebarGroup`, and `sidebarHidden`.
7. Duplicate routes are a hard error.

Entries are sorted by sidebar order, label, and route. Navigation is built from
the explicit config or generated from the groups.

## Rendering

`renderPage` assembles a complete document:

- `<head>` with title, description, canonical URL, Open Graph, Twitter, robots,
  theme color, CSS links, and a tiny pre-paint theme script.
- A sticky header with primary navigation, search, theme toggle, and optional
  GitHub link.
- A labelled sidebar, breadcrumbs, mobile TOC, article, on-page TOC, edit link,
  and previous/next pagination.
- A search dialog and the browser client.
- The footer and a skip link.

All user content is escaped except attribute values that explicitly pass through a
validator (URLs, colors, asset paths). Raw block HTML from Markdown is trusted;
document this if you accept third-party content.

## Dev server

Fairyfly has no `fs.watch` and no streaming response body. The dev server therefore:

- Polls content, theme, and custom CSS files at `dev.watchInterval`.
- Hashes file contents with FNV-1a to detect edits, additions, and deletions.
- Exposes `/__vellum/version` with a revision string.
- Injects a browser client that polls that endpoint and reloads on change.
- Re-collects content lazily on the next request after a change.
- Renders a development error page with the message, hint, and stack.

This is polling, not HMR. It trades instant rebuilds for a small, auditable
implementation that works within Fairyfly's constraints.

## Build

The build clears `outDir`, copies `publicDir`, emits theme assets, renders every
entry, writes `404.html`, and generates search and SEO files. Output is plain
files; there is no manifest or server process.

The built-in asset pipeline is always available. Rsbuild is optional and isolated
in `src/build/rsbuild-adapter.js`; it runs as a Node subprocess because Rsbuild and
Rspack depend on Node and native bindings.

## Runtime boundary

Everything except the Rsbuild subprocess runs in Fairyfly. The CLI is launched by a
POSIX shell wrapper because Fairyfly does not support shebangs in JavaScript
modules. The wrapper resolves its own location, sets `VELLUM_ROOT`, and executes
`ff`.

`import.meta.url` is empty under Fairyfly, so the framework never relies on it.
Config loading uses a path relative to the framework source, and the CLI passes
its package root explicitly.

# Vellum architecture (internal notes)

This file is for contributors. The user-facing version lives at
`site/src/content/docs/reference/architecture.md`.

## Invariants

1. Framework runtime code must execute in Fairyfly without a transform.
   - Use Flow comment syntax (`/*:: ... */`, `/*: T */`).
   - No `import type` statements outside comments.
   - No TypeScript.
2. No Node built-ins in framework code.
   - No `node:fs`, `node:path`, `node:url`, `Buffer`, `require`, or CommonJS.
   - Use the `fs` global, the local path toolkit, and `TextEncoder`/`TextDecoder`.
3. No assumptions about `import.meta.url`.
   - It is empty in Fairyfly.
   - The launcher sets `VELLUM_ROOT`; the CLI falls back to `process.argv[1]`.
4. Filesystem failures are checked explicitly.
   - Sync `fs` calls return `undefined` on failure.
   - Writes are verified; binary copies use `cp`.
5. Content is trusted; raw HTML is passed through.
   - If untrusted Markdown support is added, it needs a sanitizer and a separate
     security review.
6. Rendering is a pure function of the render context.
   - No global mutable cache in the renderer.
   - Dev state lives in `src/server/dev.js`.

## Layers and write scopes

| Layer | Owns | Must not own |
| --- | --- | --- |
| `src/cli*` | Argument parsing, command dispatch, scaffolding | Markdown or HTTP internals |
| `src/config.js` | Validation and defaults | Rendering |
| `src/content/` | Files to entries | HTTP or DOM |
| `src/render/` | Entries to HTML | Filesystem writes |
| `src/build/` | Output orchestration, assets | Request handling |
| `src/server/` | HTTP, routing, watching | Markdown parsing |
| `src/theme/` | Browser CSS/JS | Server state |

## Content model

`ContentEntry` is the contract between content and rendering:

- `route` is canonical and does not include `base`.
- `outputFile` is relative to `outDir`.
- `html` is trusted rendered Markdown.
- `headings` powers the TOC and search index.
- `links` contains raw hrefs for `checkLinks`; it is not used for rendering.
- `source` is the Markdown body without frontmatter.

Frontmatter is parsed once in `collectContent`. Rendering never re-parses YAML.

## Link resolution

There are two related paths:

1. `renderMarkdown` rewrites `.md` links and absolute paths with the configured
   base, so the emitted HTML is directly usable.
2. `checkLinks` validates the raw hrefs in `entry.links`, resolving relative paths
   against the source file directory (not the route URL).

If you add a new link surface (for example, a custom directive), add it to
`entry.links` so `vellum check` sees it.

## Dev server state machine

```text
start
  |
  +-- initial collect (may fail; request shows error page)
  |
  +-- watcher.start()
  |
  +-- every request
        if watcher.consumeDirty(): mark model dirty
        ensureModel(): re-collect on dirty or previous error
        route -> render
        on error: 500 error page, keep dirty so the next request retries
```

`watcher.getVersion()` is a revision plus a content hash. The live client polls
`/__vellum/version`; when the value changes, it calls `location.reload()`.

## Build order

1. Validate `srcDir`.
2. Collect content (drafts filtered unless requested).
3. Build sidebar and nav (this validates explicit sidebar targets).
4. Clear `outDir`.
5. Copy `publicDir` (hidden files included).
6. Resolve and emit assets.
7. Render and write pages.
8. Write `404.html`.
9. Write search index, sitemap, and robots.
10. Return a `BuildResult`.

Clearing before writing means a failed build can leave a partial output directory.
Do not "optimize" this into an in-place update without adding atomic staging.

## Extension points

- **Markdown:** `src/content/markdown.js` and `src/content/inline.js`.
- **Layout:** `src/render/layout.js` and `src/render/components.js`.
- **Assets:** `src/build/assets.js` (built-in) and `src/build/rsbuild-adapter.js`.
- **Routing:** `src/server/routing.js` (pure) and `src/server/dev.js` (stateful).
- **Config:** `resolveConfig` in `src/config.js`; add validation and a Flow type at
  the same time.

When adding an option:

1. Add it to `ProjectConfig` and `ResolvedConfig` in `src/types.js`.
2. Validate and default it in `resolveConfig`.
3. Thread it through the relevant context.
4. Add a unit test for the default and the validated value.
5. Document it in `site/src/content/docs/guide/configuration.md`.

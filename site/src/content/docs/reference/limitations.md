---
title: Limitations
description: Known constraints, non-goals, and the current roadmap for Vellum.
order: 5
---

# Limitations

Vellum is deliberately small. These are the current boundaries, not a promise that
they will never change.

## Content and Markdown

- No MDX, JSX, or component syntax.
- No footnotes, definition lists, or attribute syntax.
- No Markdown parsing inside raw HTML blocks.
- Reference links are resolved within a single page.
- No automatic heading numbering.
- No i18n routing or versioned documentation trees.
- Content is trusted. Raw HTML is not sanitized.
- `vellum check` validates Markdown links and images, not links written inside
  raw HTML blocks.

## Navigation

- `sidebar: "auto"` groups by the first content directory. It does not build a
  deeply nested tree from directory structure; use an explicit sidebar for that.
- There is no generated tag index, author index, or collection API.
- Previous/next links follow the sidebar order. Pages omitted from an explicit
  sidebar still build, but do not participate in pagination.

## Search

- Substring matching with field weighting, not fuzzy matching or stemming.
- The entire index is loaded on first search.
- Search runs in the browser; there is no server-side search endpoint in
  production.
- Disabling search removes the index and the UI, but does not remove the generated
  `search-index.json` from an older build until the next build clears the output.

## Development server

- Change detection is polling. Large content trees increase the cost of each poll.
- There is no HMR, React refresh, or module-level replacement. Changes reload the
  page.
- Config changes require a restart; the config module is not reloaded.
- Fairyfly exposes no signal handler or server close API, so shutdown is `Ctrl-C`.
- The server binds to `0.0.0.0` because Fairyfly has no host option.

## Build

- The build is a full rebuild. There is no incremental cache.
- The built-in asset pipeline does not minify, hash filenames, or split chunks.
- Rsbuild is optional and runs as a Node subprocess. It is not executed inside
  Fairyfly.
- The sitemap has no `lastmod` values because Fairyfly exposes no file metadata.
- `robots.txt` is generated only when `public/robots.txt` is absent.
- Draft pages are excluded from production output unless explicitly included.

## Theme

- One built-in theme. There is no theme package loader yet.
- Customization is CSS variables, custom CSS, and configuration values rather than
  component overrides.
- No MDX-powered interactive examples.
- No image optimization pipeline; use appropriately sized assets in `public/`.

## Runtime

- Fairyfly is POSIX-only. Vellum is therefore POSIX-only.
- No CommonJS dependencies, `Buffer`, or Node built-ins in framework code.
- Binary file writes go through `cp` because Fairyfly's `fs.writeFile` is text-only.
- HTTP request bodies are small (about 4 KB) and response bodies are capped at
  10 MB.
- There is no `AbortController` for outbound fetches.

## Non-goals

Vellum is not trying to be a general-purpose application framework, a React
meta-framework, or a Node.js clone. It is a documentation generator with a narrow,
tested runtime contract.

## Roadmap

- Additional built-in themes and a documented theme adapter.
- A plugin hook for custom content transforms.
- Optional content-adjacent asset copying.
- More Markdown extensions (footnotes and heading attributes are candidates).
- Incremental builds when a metadata API becomes available.
- Optional search backends for very large sites.

If a missing feature blocks a real documentation site, document the use case in an
issue rather than adding an unverified runtime dependency.

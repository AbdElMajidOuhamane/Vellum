# Changelog

All notable changes to Vellum are documented here. The project follows semantic
versioning once it reaches 1.0.

## 0.1.0

Initial release.

### Framework

- Fixed the theme cascade: `theme.accent` and `theme.accentContrast` were
  emitted in an inline style that the stylesheet's own `:root` defaults
  overrode, so every site rendered with the purple fallback. Configured tokens
  are now written into the stylesheet after the defaults, so the order is
  defaults < `theme.accent` < `theme.customCss`.
- `theme.customCss` accepts a single path as well as an array, and rejects
  anything else instead of ignoring it.
- Landing pages: `layout: splash` drops the sidebar, TOC, breadcrumbs, edit link,
  and pagination for one page while keeping the header, search, and footer.
- Hero options: `eyebrow`, `image` (path or Astro-style `{ file, alt }`),
  `imageAlt`, and actions with `primary`, `secondary`, or `minimal` variants;
  `template: splash` works as an alias for `layout: splash`. Heroes can come
  from frontmatter or from `hero` in the config.
- `features` cards (`title`, `description`, optional `link`) render as a
  responsive grid under the hero, from frontmatter or the config.
- Theme options: `theme.logo` replaces the header mark and `theme.favicon`
  replaces the tab icon. Without a custom favicon, the icon is drawn from
  `accent` and `accentContrast`.
- `withBase` is idempotent: absolute links that already include the configured
  base (for example `/docs/api/fs` with `base: "/docs/"`) are not prefixed
  twice, so docs copied from another site keep their Markdown unchanged.
- Markdown-first content collection with a strict YAML frontmatter subset.
- Independent Markdown engine: headings, paragraphs, emphasis, strong, strike,
  code spans, fenced and indented code, blockquotes, callouts, ordered and
  unordered lists, task lists, tables, links, images, references, autolinks,
  hard breaks, rules, and raw HTML blocks.
- Route generation from file paths with `slug` overrides, duplicate-route checks,
  and base-aware link rewriting.
- Static build with HTML pages, 404 page, search index, sitemap, robots.txt, and
  public-file copying.
- Built-in asset pipeline and optional Rsbuild/Rspack adapter running in a Node
  subprocess.
- Development server with on-demand rendering, fingerprint polling, live reload,
  error overlay, static assets, and search index endpoint.
- Preview server for the built output.
- Accessible default theme with responsive navigation, dark mode, search dialog,
  copy buttons, TOC scroll spy, and print styles.
- CLI with `dev`, `build`, `preview`, `check`, `new`, `version`, and `help`.
- Content and link validation with `vellum check`.

### Type safety

- Flow annotations in comment syntax so framework modules execute directly in
  Fairyfly.
- Shared type contract in `src/types.js`.
- Fairyfly global declarations in `flow-typed/globals.js`.
- `flow check` integrated into the development workflow and CI.

### Fairyfly-native projects

- Scaffolded projects include `ff.json` and `vellum.js`; `ff start` runs
  the dev server through Fairyfly.
- Added `findFrameworkRoot` and `runCli` public APIs for generated entries.
- `ff imprint vellum-docs` is the primary dependency install; npm is optional.
- Documented the distinction between `ff.json` (project manifest) and
  `package.json` (npm metadata / `node_modules` resolution).

### Runtime integration

- POSIX launcher that sets `VELLUM_ROOT` because `import.meta.url` is empty.
- Filesystem helpers that check Fairyfly's silent sync failures.
- Binary asset copies through `cp`.
- Documented compatibility probes and runtime limits.

### Documentation

- Runnable Node-free example site in `examples/aurora`, with `ff.json`, a
  `vellum.js` entry, setup helper, generated search index, and built-in assets.
  Its home page is a splash landing page with a custom CSS theme layer.
- `vellum new` scaffolds a splash home page with a hero and feature cards.
- `examples/fairyfly` builds the Fairyfly runtime's own 47-page documentation
  from Markdown extracted verbatim from the upstream repository (MPL-2.0),
  published under `/docs/` with an explicit sidebar and a splash landing page
  that uses the upstream logo as `theme.logo` and `theme.favicon`.
- Dogfooded documentation site built with Vellum.
- Guides for configuration, Markdown, theming, landing pages, bundling, Flow, and
  deployment.
- CLI, public API, architecture, compatibility, and limitations references.
- Architecture notes and ADRs for the major technical decisions.

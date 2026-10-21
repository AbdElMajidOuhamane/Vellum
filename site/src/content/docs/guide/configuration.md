---
title: Configuration
description: Reference for vellum.config.js, paths, navigation, sidebar, theme, markdown, search, and bundler settings.
order: 2
---

# Configuration

Vellum reads `vellum.config.js` from the project root. The file is an ES module
and must default-export a configuration object. `defineConfig` is optional; it
exists for editor assistance and Flow-friendly typing.

```js
import { defineConfig } from "vellum-docs";

export default defineConfig({
  title: "My docs",
  description: "Documentation for My Project.",
  site: "https://docs.example.com",
  nav: [{ label: "Guide", link: "/guide/" }],
  sidebar: "auto",
});
```

The config can also export a function, which is useful for environment-specific
settings:

```js
export default async function () {
  return {
    title: process.env.SITE_TITLE || "My docs",
  };
}
```

## Top-level options

| Option | Type | Default | Purpose |
| --- | --- | --- | --- |
| `title` | string | Project folder name | Site name in the header, `<title>`, and search |
| `description` | string | empty | Default meta description and social text |
| `site` | string | empty | Absolute origin for canonical URLs, Open Graph, and sitemap |
| `lang` | string | `"en"` | `<html lang>` value |
| `srcDir` | string | `"src/content/docs"` | Folder containing Markdown |
| `publicDir` | string | `"public"` | Files copied to the output root |
| `outDir` | string | `"dist"` | Build output; cleared before each build |
| `base` | string | `"/"` | Deployment subpath, such as `"/docs/"` |
| `trailingSlash` | boolean | `true` | Emit `/guide/` instead of `/guide` |
| `nav` | array | `[]` | Header links |
| `sidebar` | `"auto"` or array | `"auto"` | Sidebar structure |
| `theme` | object | defaults | Accent color and custom CSS |
| `markdown` | object | defaults | Markdown feature switches |
| `search` | object | enabled | Search index and dialog |
| `bundler` | object | `auto` | Browser asset pipeline |
| `dev` | object | port 4321 | Dev server options |
| `drafts` | boolean | `false` | Include drafts in production builds |
| `footer` | string | empty | Extra footer text |
| `hero` | object | none | Default hero for the home page |
| `features` | array | `[]` | Feature cards for the home page |
| `editLink` | object | none | “Edit this page” link template |
| `integrations` | array | `[]` | Reserved for future adapters |

Paths are resolved relative to the directory containing the config file, unless
they are absolute.

## Navigation

```js
nav: [
  { label: "Guide", link: "/guide/getting-started/" },
  { label: "Reference", link: "/reference/cli/" },
  { label: "GitHub", link: "https://github.com/example/project" },
],
```

Internal links receive the configured `base` automatically. External links are
left untouched and rendered with `rel="noreferrer noopener"`. A link that
already starts with `base` is not prefixed again, so Markdown copied from a site
that publishes under the same subpath can be used as-is.

## Sidebar

Use `"auto"` to group pages by their first content directory:

```js
sidebar: "auto"
```

For editorial control, write an explicit tree. Groups may contain links or nested
groups. Every internal link must resolve to a page; `vellum build` and
`vellum check` fail if one does not.

```js
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
    ],
  },
]
```

Groups with nested `items` render as collapsible `<details>` elements. The current
page is marked with `aria-current="page"`.

## Theme

```js
theme: {
  accent: "#6d5efc",
  accentContrast: "#ffffff",
  logo: "/logo.svg",
  favicon: "/favicon.svg",
  customCss: ["src/styles/extra.css"],
  socialImage: "/social-card.png",
}
```

| Option | Default | Notes |
| --- | --- | --- |
| `accent` | `#5b5bd6` | Hex, rgb, hsl, or oklch CSS color |
| `accentContrast` | `#ffffff` | Text color on accent backgrounds |
| `customCss` | `[]` | CSS file or list of files appended after the theme |
| `logo` | none | Header image; public path or absolute URL |
| `favicon` | none | Tab icon; defaults to an SVG drawn from the accent |
| `socialImage` | none | Open Graph and Twitter image URL or public path |

`logo` and `favicon` accept a path in `public/` (the site `base` is applied) or
an absolute `http(s)` URL. The logo is rendered at 28×28 next to the site name.

## Hero and features

`hero` and `features` can be set here for the home page or in a page's
frontmatter. See [Landing pages](/guide/landing-pages/) for the full walkthrough.

| Field | Type | Notes |
| --- | --- | --- |
| `hero.title` | string | Defaults to the page title |
| `hero.tagline` | string | Defaults to the page description |
| `hero.eyebrow` | string | Label above the headline; defaults to `Documentation` |
| `hero.image` | string or `{ file, alt }` | Public path or absolute URL |
| `hero.imageAlt` | string | Alt text; empty means decorative |
| `hero.actions` | array | `{ text, link, variant }` with variant `primary`, `secondary`, or `minimal` |
| `features` | array | `{ title, description, link? }` cards under the hero |

## Markdown features

```js
markdown: {
  tables: true,
  callouts: true,
  headingAnchors: true,
  externalLinksNewTab: false,
}
```

- `tables` enables GitHub-style pipe tables.
- `callouts` enables `> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`,
  `> [!WARNING]`, and `> [!CAUTION]`.
- `headingAnchors` adds a permalink `#` next to headings.
- `externalLinksNewTab` adds `target="_blank"` to external links.

## Search

```js
search: {
  enabled: true,
  maxResults: 10,
}
```

The build writes `search-index.json` with page titles, descriptions, headings, and
a trimmed text excerpt. The search dialog loads it on first use. Disable search
with `search: { enabled: false }` or `vellum build --no-search`; the theme then
omits the search button, dialog, and index.

## Bundler

```js
bundler: {
  provider: "auto", // "auto" | "rsbuild" | "builtin"
  node: "node",
}
```

- `auto` uses Rsbuild when `@rsbuild/core` is installed and Node is available,
  otherwise it falls back to the built-in asset pipeline with a warning.
- `rsbuild` requires Rsbuild and fails the build if it is missing or broken.
- `builtin` always concatenates the theme CSS and copies the browser client. It
  needs no Node process and is the default outcome of an `ff imprint` install.

See [Build and bundling](/guide/bundling/) for the subprocess boundary and the
fallback behavior.

## Dev server

```js
dev: {
  port: 4321,
  watchInterval: 700,
  liveReload: true,
}
```

Fairyfly does not expose `fs.watch`, so the dev server polls content and theme
files and hashes their contents. A lower `watchInterval` reacts faster and reads
more often. Live reload injects a small polling client; it is never included in
production output. Set `liveReload: false` to keep the watcher and version
endpoint but omit the browser reload client.

## Edit links

```js
editLink: {
  baseUrl: "https://github.com/example/repo/edit/main/docs/",
  label: "Edit this page",
}
```

The content-relative path is appended to `baseUrl`. Disable the link for a single
page with `editLink: false` in its frontmatter.

## Frontmatter

| Field | Type | Purpose |
| --- | --- | --- |
| `title` | string | Page title and sidebar fallback |
| `description` | string | Meta description and search excerpt |
| `slug` | string | Override the route |
| `order` | number | Sort order in generated navigation |
| `draft` | boolean | Exclude from production builds |
| `sidebar.label` | string | Sidebar text |
| `sidebar.group` | string | Auto-sidebar group |
| `sidebar.order` | number | Sidebar sort order |
| `sidebar.hidden` | boolean | Hide from generated sidebar |
| `hero` | object | Hero title, tagline, eyebrow, image, and actions |
| `features` | array | Feature cards rendered under the hero |
| `layout` | `"splash"` or `"404"` | Page layout hint; `splash` drops the sidebar and TOC |
| `template` | `"splash"` | Alias for `layout`, matching Astro's spelling |
| `robots` | string | Override the robots meta value |
| `editLink` | boolean | Set `false` to hide the edit link |
| `toc` | boolean | Reserved for TOC control |

Unknown frontmatter keys are preserved and ignored by the renderer.

---
title: Writing Markdown
description: The supported Markdown subset, frontmatter, callouts, tables, links, and code blocks.
order: 3
---

# Writing Markdown

Vellum uses its own Markdown engine. It is intentionally smaller than a
CommonMark conformance suite, but it covers the syntax documentation sites need
and produces predictable HTML.

## Files and routes

Every `.md` or `.markdown` file under `src/content/docs/` becomes a page:

| File | Route |
| --- | --- |
| `index.md` | `/` |
| `guide/index.md` | `/guide/` |
| `guide/install.md` | `/guide/install/` |
| `guide/deep/page.md` | `/guide/deep/page/` |

Files and folders beginning with `_` or `.` are ignored. A frontmatter `slug`
overrides the route:

```yaml
---
slug: /install/
---
```

## Frontmatter

Frontmatter is optional and uses a strict YAML subset: mappings, sequences,
scalars, inline arrays, and literal or folded text blocks.

```yaml
---
title: Installation
description: Install Vellum in a new or existing project.
order: 2
draft: false
sidebar:
  label: Install
  group: Guide
  order: 2
tags:
  - setup
  - cli
---
```

Drafts are excluded from `vellum build` unless you pass `--drafts` or set
`drafts: true` in configuration. The dev server always includes them.

## Headings

```md
# Page title

## Section

### Subsection
```

Heading IDs are generated from the text, de-duplicated (`same`, `same-2`), and
linkable. The table of contents is built from `##` and `###` headings.

## Text

```md
**bold**, *italic*, ***both***, ~~strikethrough~~, and `inline code`.
```

Smart quotes are not applied. HTML is escaped unless you deliberately write raw
HTML in a block.

## Links and images

```md
[Guide](/guide/)
[Relative page](./configuration.md)
[External](https://example.com)
<https://example.com>
![Diagram](/images/diagram.png "Optional title")
```

A `.md` link is rewritten to its route and receives the configured `base`. Use
absolute paths for images stored in `public/`:

```md
![Logo](/logo.svg)
```

Relative image paths are left as written; copy images into `public/` and reference
them from the site root.

## Lists

```md
- one
- two
  - nested
  - nested two

1. first
2. second

- [ ] unfinished
- [x] finished
```

Nested lists are supported. Task lists render disabled checkboxes.

## Code

````md
```js
const greeting = "hello";
console.log(greeting);
```
````

The language becomes a class on the `<code>` element (`language-js`) and a
`data-language` attribute on the `<pre>`. The browser client adds a copy button.
Indented code blocks (four spaces) are also supported.

## Tables

```md
| Option | Default | Purpose |
| --- | --- | --- |
| `base` | `/` | Deployment subpath |
| `outDir` | `dist` | Build output |
```

Column alignment follows the separator row:

```md
| Left | Center | Right |
| :--- | :---: | ---: |
| a | b | c |
```

## Blockquotes and callouts

```md
> A normal quote.

> [!TIP]
> A callout with a title and body.
```

Supported callout types are `NOTE`, `TIP`, `IMPORTANT`, `WARNING`, and `CAUTION`.

## Raw HTML

Block-level HTML is passed through:

```html
<div class="card-grid">
  <div class="card">A custom card</div>
</div>
```

> [!CAUTION]
> Documentation content is trusted. Do not render Markdown from untrusted users;
> raw HTML and inline HTML are not sanitized.

## What is not supported

- MDX or JSX components.
- Footnotes and definition lists.
- Attribute syntax such as `{#custom-id}`.
- Markdown inside raw HTML blocks.
- File watching is polling; there is no `fs.watch` integration.

If you need a custom component, use the theme's CSS classes and a raw HTML block,
or extend the renderer in `src/render/`.

---
title: Landing pages
description: Build a marketing-style home page with a splash layout, hero, and feature cards.
order: 8
---

# Landing pages

A documentation site usually opens with a landing page: a headline, a short
pitch, two calls to action, and a few highlights. Vellum has a built-in `splash`
layout for that page, driven entirely by frontmatter.

## Splash layout

```md
---
title: Aurora
description: A tiny event bus for JavaScript.
layout: splash
hero:
  eyebrow: Event bus
  tagline: Publish events, subscribe anywhere, and keep your modules decoupled.
  image: /aurora.svg
  imageAlt: Aurora logo
  actions:
    - text: Install
      link: /guide/installation/
      variant: primary
    - text: Read the API
      link: /reference/api/
      variant: secondary
features:
  - title: Tiny
    description: One event bus, one file, no dependencies.
  - title: Portable
    description: Plain ES modules that run in Fairyfly, Node, and the browser.
    link: /guide/usage/
---

## Why Aurora

Regular Markdown continues below the feature cards.
```

A splash page:

- hides the sidebar, table of contents, breadcrumbs, edit link, and
  previous/next pagination;
- keeps the header, search, theme toggle, skip link, and footer;
- renders the hero full width, with an optional image beside it;
- renders `features` as a responsive card grid under the hero;
- still appears in `nav`, search, the sitemap, and any sidebar that lists it.

Only the page with `layout: splash` changes. Every other page keeps the
documentation layout.

## Coming from Astro or Starlight

The splash layout follows the same shape as Starlight's `template: splash`:

| Starlight | Vellum |
| --- | --- |
| `template: splash` | `layout: splash`, or `template: splash` if you prefer |
| `hero: { title, tagline, actions }` | same fields |
| `hero.image: { file, alt }` | same mapping, or a plain path with `hero.imageAlt` |
| `actions[].variant: primary \| secondary \| minimal` | same three values |
| `<CardGrid><Card title link>` | `features` with `title`, `description`, `link?` |

Two differences: Vellum has no component imports, so the card grid is declared
in frontmatter or config instead of typed as JSX; and Starlight's light/dark
image pair plus `actions[].icon` are not supported — use one image and plain
text labels.

## Hero fields

| Field | Type | Purpose |
| --- | --- | --- |
| `title` | string | Headline; defaults to the page title |
| `tagline` | string | Supporting sentence; defaults to the page description |
| `eyebrow` | string | Small label above the headline; defaults to `Documentation` |
| `image` | string or `{ file, alt }` | Public path or absolute `http(s)` URL |
| `imageAlt` | string | Alternative text; leave empty for a decorative image |
| `actions` | array | Buttons with `text`, `link`, and optional `variant` |

`variant` is `primary` (default), `secondary`, or `minimal`. Internal links receive the
site's `base`; external links open with `rel="noreferrer noopener"`.

Images are loaded lazily and sized by CSS. Put files in `public/` and reference
them by their public path, as in the example above.

## Feature cards

Each feature needs a `title` and a `description`:

| Field | Type | Purpose |
| --- | --- | --- |
| `title` | string | Card heading |
| `description` | string | One-sentence explanation |
| `link` | string | Optional; makes the whole card a link |

`vellum check` and `vellum build` reject cards without a title or description.
They also resolve internal `hero.actions[].link` and `features[].link` values the
same way as `nav`: a link to a missing route fails the command, while anchors,
external URLs, and links to files in `public/` are skipped.
Card titles are `<h2>` elements, so the hero's `<h1>` remains the only top-level
heading on the page.

## Configuration form

`hero` and `features` can also live in `vellum.config.js`. The config values
apply to the home page (`/`) only; frontmatter on a page always wins.

```js
export default {
  hero: {
    eyebrow: "Documentation",
    tagline: "Write Markdown. Ship a fast documentation site.",
    actions: [
      { text: "Get started", link: "/guide/getting-started/", variant: "primary" },
    ],
  },
  features: [
    { title: "Static by default", description: "Every page is pre-rendered HTML." },
    { title: "Search included", description: "A small index, built at build time." },
  ],
};
```

If the home page has no `hero` in frontmatter, the config hero renders there. To
use a different hero on another page, put it in that page's frontmatter and add
`layout: splash` to drop the documentation chrome.

## Styling

Splash pages expose stable class names that you can target from
[`theme.customCss`](/guide/theming/):

| Selector | Element |
| --- | --- |
| `.page-shell.is-splash` | Page shell with the sidebar removed |
| `.hero-splash` | Splash hero |
| `.hero-with-media` | Hero with a side image |
| `.hero-media` | Image container |
| `.features` | Card grid |
| `.feature` | Card; adds `.is-link` when the card links somewhere |
| `.feature-title`, `.feature-description` | Card text |

```css
.hero-splash h1 {
  letter-spacing: -0.05em;
}

.features {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

## Accessibility

- The hero renders exactly one `<h1>`; put your page intro in the hero rather
  than a second Markdown heading.
- Set `imageAlt` when the image carries meaning, or leave it empty when the
  headline already says the same thing.
- Actions are ordinary links, so keyboard and screen-reader behaviour comes from
  the browser.
- The default theme keeps visible focus rings and reduced-motion support on
  splash pages; see [Theming](/guide/theming/) before overriding them.

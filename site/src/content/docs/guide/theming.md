---
title: Theming
description: Customize the default Vellum theme with tokens, custom CSS, and accessible dark mode.
order: 4
---

# Theming

The default theme is a single CSS file with no web fonts and no CDN requests. It
uses semantic custom properties so you can adjust it without forking the layout.

## Accent color

```js
export default {
  theme: {
    accent: "#6d5efc",
    accentContrast: "#ffffff",
  },
};
```

The accent is applied to links, buttons, active navigation, callout borders, and
focus rings. It must be a hex, rgb, hsl, or oklch color; Vellum rejects values that
could break out of the inline stylesheet. The generated favicon uses the accent
and `accentContrast` too, so the tab icon follows your brand automatically.

## Cascade order

Theme values are layered in one stylesheet, so each level wins over the one
before it:

1. the defaults in `vellum.css` (`#5b5bd6`);
2. `theme.accent` and `theme.accentContrast` from `vellum.config.js`;
3. `theme.customCss`, which always has the last word.

This is why a `:root { --vellum-accent: … }` rule in custom CSS overrides
`theme.accent`, and why no edit to `vellum.css` is needed to rebrand a site.

## Logo and favicon

```js
export default {
  theme: {
    logo: "/logo.svg",
    favicon: "/favicon.svg",
  },
};
```

`logo` replaces Vellum's default mark in the header and is rendered at 28×28
next to the site name. `favicon` replaces the generated tab icon. Both accept a
path inside `public/` (the site `base` is applied) or an absolute `http(s)` URL.
Leave `favicon` unset to keep the accent-colored default.

## Custom CSS

```js
export default {
  theme: {
    // A single path or an array of paths.
    customCss: ["src/styles/extra.css"],
  },
};
```

Custom files are resolved relative to the project root and appended after the
default theme and the configured tokens. With the built-in asset pipeline they
are concatenated into `assets/vellum.css`; with Rsbuild they are imported into
the browser entry.

Worth knowing:

- `customCss` accepts one path or a list. A missing file fails the build.
- The header logo is rendered at 28×28 with `object-fit: contain`. If your logo
  is a wide canvas with transparent padding, override `.brand-logo` — for
  example `object-fit: cover` with a larger box — instead of leaving the mark
  squeezed into the square.

## Tokens

The theme exposes these custom properties:

| Token | Purpose |
| --- | --- |
| `--vellum-accent` | Primary accent |
| `--vellum-accent-contrast` | Text on accent backgrounds |
| `--bg` | Page background |
| `--bg-subtle` | Subtle background tint |
| `--surface` | Cards, dialogs, and header |
| `--surface-2` | Hover and secondary surfaces |
| `--text` | Primary text |
| `--text-muted` | Secondary text |
| `--text-faint` | Labels and metadata |
| `--border` | Default border |
| `--border-strong` | Emphasized border |
| `--code-bg` | Inline code background |
| `--code-block-bg` | Code block background |
| `--font-sans` | Body font stack |
| `--font-mono` | Code font stack |
| `--header-height` | Sticky header height |
| `--sidebar-width` | Desktop sidebar width |
| `--content-width` | Article column width |
| `--radius` | Card and panel corner radius |
| `--shadow-sm` | Subtle elevation |
| `--shadow-md` | Dialog and popover elevation |

Example:

```css
:root {
  --vellum-accent: #0f766e;
  --font-sans: "Iowan Old Style", Georgia, serif;
  --content-width: 820px;
  --radius: 16px;
}

.prose h2 {
  letter-spacing: -0.01em;
}
```

Landing pages have their own stable class names (`hero-splash`, `features`,
`feature`, and so on); see [Landing pages](/guide/landing-pages/#styling).

## Dark mode

The theme ships light and dark palettes. It follows `prefers-color-scheme` until
the reader chooses a mode; the choice is stored in `localStorage` under
`vellum-theme`. The toggle updates `data-theme` on `<html>` and sets
`aria-pressed`.

To add dark-specific rules:

```css
html[data-theme="dark"] .prose img {
  opacity: 0.9;
}
```

## Accessibility

The default layout includes:

- A skip link to `#main-content`.
- Semantic `<header>`, `<nav>`, `<main>`, `<aside>`, `<article>`, and `<footer>`.
- Visible `:focus-visible` outlines.
- `aria-current="page"` on the active navigation item.
- Labelled search dialog, listbox, and result options.
- Reduced-motion support for transitions and smooth scrolling.
- Print styles that remove navigation and show link URLs.

If you replace the theme, keep these behaviours. `vellum check` does not test
accessibility; the defaults are the contract.

## Social metadata

```js
export default {
  site: "https://docs.example.com",
  theme: {
    socialImage: "/social-card.png",
  },
};
```

When `site` is set, pages receive canonical URLs, `og:url`, `og:title`,
`og:description`, and Twitter card metadata. With `socialImage`, the card type
switches to `summary_large_image`.

# Aurora example

A small, Node-free Vellum site. It documents a fictional event bus and shows
frontmatter, routes, navigation, search, callouts, tables, code blocks, the
built-in asset pipeline, a splash landing page, and a custom theme layer.

It uses the same `ff.json` + `vellum.js` shape as a project scaffolded with
`vellum new`.

## Run in this checkout (no Node)

```sh
cd examples/aurora
./setup-local.sh     # copies ../../src + bin into node_modules/vellum-docs
ff start
```

`setup-local.sh` is only for this repository checkout. It simulates the package
install without npm.

## Run as a real project

Install from the GitHub tag:

```sh
cd examples/aurora
ff imprint github:AbdElMajidOuhamane/Vellum#v0.1.0
ff start
```

Or, if you prefer npm:

```sh
npm install
ff start
```

Open `http://localhost:4500/`. Edit a Markdown file and the dev server reloads.

## Build and inspect

```sh
ff vellum.js build
ff vellum.js check
find dist -type f | sort
```

The build uses `bundler.provider: "builtin"`, so **no Node process is involved**.
The output contains HTML, `assets/vellum.css`, `assets/vellum.js`,
`search-index.json`, `robots.txt`, `404.html`, and the copied public SVG.

## Landing page and styling

`src/content/docs/index.md` uses `layout: splash` with a `hero` (eyebrow,
tagline, logo image, two actions) and four `features`. Splash hides the sidebar,
TOC, breadcrumbs, edit link, and pagination for that page only. The rest of the
site keeps the documentation layout.

`src/styles/aurora.css` is listed in `theme.customCss`. It is appended after the
default theme by the built-in pipeline, so it can override tokens and component
classes without forking `vellum.css`:

```css
:root {
  --content-width: 800px;
  --font-sans: "Avenir Next", "Segoe UI", system-ui, sans-serif;
}

.features {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
```

`theme.logo` and `theme.favicon` point at the same public SVG, so the header mark
and the tab icon match. Removing `theme.favicon` falls back to an icon drawn from
the accent color.

## Explore

- `/` — splash landing page with hero image, actions, and feature cards
- `/guide/installation/` — code blocks, table, callout
- `/guide/usage/` — subscription and publish examples
- `/guide/recipes/` — lists, nested lists, blockquotes
- `/reference/api/` — API tables and signatures

## Layout

```text
ff.json                 Fairyfly project manifest (main: vellum.js)
vellum.js               entry: findFrameworkRoot + runCli
vellum.config.js        site title, nav, sidebar, theme, custom CSS, builtin assets
setup-local.sh          local checkout helper (no npm)
package.json            optional npm scripts and file dependency
src/content/docs/       Markdown pages (index.md is the splash landing page)
src/styles/aurora.css   custom theme layer appended after the default theme
public/aurora.svg       copied static asset, used as logo and favicon
```

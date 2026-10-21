---
title: Deployment
description: Deploy the static output to GitHub Pages, Netlify, Vercel, Cloudflare Pages, or any static host.
order: 7
---

# Deployment

`vellum build` produces a static directory. There is no server runtime to deploy,
no database, and no hydration step.

## Output

```text
dist/
  404.html
  index.html
  guide/
    getting-started/
      index.html
  assets/
    vellum.css
    vellum.js
  search-index.json
  sitemap.xml
  robots.txt
```

Set `site` in configuration to generate canonical URLs, Open Graph URLs, and a
sitemap:

```js
export default {
  site: "https://docs.example.com",
};
```

## Deploying to a subpath

If the site lives at `https://example.com/docs/`, set `base`:

```js
export default {
  site: "https://example.com",
  base: "/docs/",
};
```

Vellum prefixes internal links, asset URLs, the search index URL, canonical URLs,
sitemap entries, and the dev server route with the base. Output files stay at the
root of `dist/`; upload the contents of `dist/` into the subdirectory.

Links written in Markdown that already include the base (for example
`/docs/api/fs` with `base: "/docs/"`) are left unchanged. That makes it possible
to publish documentation copied from another repository without rewriting its
absolute links; see `examples/fairyfly`.

## GitHub Pages

```yaml
name: Deploy docs
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

For a project site served from `https://user.github.io/repo/`, set
`base: "/repo/"`.

## Netlify

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `dist` |
| Node version | 20 |

Netlify serves `404.html` automatically for missing paths.

## Vercel

| Setting | Value |
| --- | --- |
| Framework preset | Other |
| Build command | `npm run build` |
| Output directory | `dist` |

## Cloudflare Pages

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Build output directory | `dist` |

## Caching

Static hosts usually cache hashed assets aggressively. Vellum's built-in pipeline
uses stable filenames (`assets/vellum.css`, `assets/vellum.js`), so configure a
short cache lifetime or add a content hash with a custom adapter. HTML should
always be revalidated.

Example headers for Netlify:

```text
/*
  Cache-Control: public, max-age=0, must-revalidate

/assets/*
  Cache-Control: public, max-age=3600
```

## Pre-deploy checklist

```sh
vellum check
vellum build
vellum preview
```

- [ ] `site` and `base` match the deployment URL.
- [ ] `vellum check` reports no broken links.
- [ ] `dist/404.html` exists.
- [ ] Search opens and finds a known page.
- [ ] The site works with JavaScript disabled for reading.
- [ ] Canonical URLs and the sitemap use the production origin.

> [!NOTE]
> Fairyfly's HTTP server is used for development and preview. Production hosting
> only needs a static file server.

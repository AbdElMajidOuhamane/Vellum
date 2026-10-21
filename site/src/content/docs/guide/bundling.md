---
title: Build and bundling
description: How Vellum separates Fairyfly content processing from the optional Rsbuild browser build.
order: 5
---

# Build and bundling

Vellum has one required execution environment and one optional one:

1. **Fairyfly** runs the CLI, reads content, renders HTML, generates the search
   index, serves the dev server, and emits the built-in assets.
2. **Node.js** runs Rsbuild and Rspack only when you choose the bundled browser
   asset pipeline.

They are deliberately separate. Vellum does not claim that Rsbuild runs inside
Fairyfly.

## Fairyfly-only build

If you install with `ff imprint github:AbdElMajidOuhamane/Vellum#v0.1.0` and do
not install Rsbuild, no Node process is involved:

```sh
ff imprint github:AbdElMajidOuhamane/Vellum#v0.1.0
ff vellum.js build
```

The built-in pipeline copies the theme CSS and browser client. `@rsbuild/core` is
not a runtime dependency and does not pass Fairyfly's pure-ESM package gate, so it
is never installed by `ff imprint`. Set the provider explicitly if you want to
make that contract visible:

```js
export default {
  bundler: { provider: "builtin" },
};
```

## The default pipeline

```js
export default {
  bundler: { provider: "auto" },
};
```

With `auto`:

- If `@rsbuild/core` is installed and `node --version` succeeds, Vellum generates
  a temporary browser entry and runs Rsbuild as a subprocess.
- Otherwise Vellum warns and uses its built-in asset pipeline.

The built-in pipeline is intentionally small and has no Node dependency:

- Reads `src/theme/vellum.css`.
- Appends `theme.customCss` files.
- Copies `src/theme/client.js`.
- Writes both to `dist/assets/`.

It performs no minification, tree shaking, or code splitting. For many docs sites
that is enough; the output is a few dozen kilobytes before compression.

## The Rsbuild path

The adapter lives in `src/build/rsbuild-adapter.js`. It:

1. Detects Node and `node_modules/@rsbuild/core` by walking up from the project
   root.
2. Writes `.vellum/rsbuild/entry.js` and `.vellum/rsbuild/build.mjs` inside the
   project.
3. Runs the generated script with the configured Node executable.
4. Copies `assets/vellum.js` and `assets/vellum.css` from the temporary bundle
   into `dist/assets/`.

The generated entry imports the theme CSS, custom CSS files, and the browser
client. Rsbuild handles CSS extraction and JavaScript bundling; the rest of the
build remains in Fairyfly.

```js
export default {
  bundler: { provider: "rsbuild", node: "node" },
};
```

`rsbuild` is strict: if the package is missing or the build fails, `vellum build`
fails with the Rsbuild output. `auto` only falls back when Rsbuild is *unavailable*,
not when it is installed and broken.

## Why a subprocess?

Rsbuild is a Node.js tool. Its CLI and configuration API depend on Node built-ins,
native Rspack bindings, and CommonJS interop that Fairyfly does not provide. The
adapter keeps that dependency behind one module and one subprocess boundary.

If you replace the bundler, implement the same contract:

```js
{
  assets: {
    css: ["/assets/vellum.css"],
    js: ["/assets/vellum.js"],
  },
  bundler: "builtin" | "rsbuild",
}
```

The renderer only needs the URLs. Any future adapter can emit different filenames
as long as the returned paths are correct.

## Dev server assets

The dev server never invokes Rsbuild. It serves the theme CSS and browser client
directly from the framework source, so edits to the theme are reflected on the
next request. This keeps the local loop fast and avoids a Node dependency for
development.

## Inspecting the output

```sh
vellum build --verbose
```

The build reports the selected bundler. To force a known pipeline:

```sh
vellum build --bundler builtin
vellum build --bundler rsbuild
```

> [!NOTE]
> Rsbuild may copy your `public/` directory into its temporary bundle. Vellum only
> reads `assets/vellum.js` and `assets/vellum.css` from that bundle; the real
> public copy is handled by the main build.

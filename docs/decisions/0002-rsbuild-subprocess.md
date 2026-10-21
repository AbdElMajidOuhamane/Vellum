# ADR 0002: Rsbuild runs as a Node subprocess

## Status

Accepted.

## Context

Rsbuild is the required frontend build interface, with Rspack underneath. Both are
Node.js tools. Their configuration API, native Rspack bindings, and dependency
graph assume Node built-ins and CommonJS interop that Fairyfly does not provide.
Attempting to run Rsbuild inside Fairyfly would require shimming Node, which would
be fragile and dishonest about the runtime boundary.

## Decision

Isolate bundling in `src/build/rsbuild-adapter.js`:

1. Detect Node (`bundler.node` or the `VELLUM_NODE`-style override) and
   `node_modules/@rsbuild/core`.
2. Write `.vellum/rsbuild/entry.js` and `.vellum/rsbuild/build.mjs` in the user's
   project.
3. Run the generated script with Node.
4. Copy `assets/vellum.js` and `assets/vellum.css` into the output.
5. Fall back to the built-in pipeline only when Rsbuild is unavailable under
   `provider: "auto"`.

The renderer receives only asset URL arrays, so the adapter can be replaced.

## Consequences

- Content processing, rendering, and the dev server stay in Fairyfly.
- Rsbuild is an optional development dependency.
- The built-in pipeline remains a supported fallback and is used in tests.
- The adapter must clean up its temporary directory behavior and report Rsbuild's
  stderr on failure.
- Documentation must never claim that Rsbuild executes inside Fairyfly.

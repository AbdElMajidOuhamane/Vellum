---
title: Type safety with Flow
description: How Vellum uses Flow without a runtime transform, and how to run the type checker.
order: 6
---

# Type safety with Flow

Vellum uses [Flow](https://flow.org/) for static type checking. Flow is not
TypeScript, and the framework does not use a TypeScript toolchain.

## Comment syntax

Fairyfly parses JavaScript with QuickJS, which does not understand Flow type
annotations. A normal Flow annotation would make a module fail at runtime.

Vellum therefore uses Flow's **comment syntax**:

```js
// @flow
/*:: import type { Page } from "./types.js"; */

export function titleOf(page /*: Page */) /*: string */ {
  return page.title;
}
```

Everything Flow needs is inside `/*:: ... */` or `/*: ... */` comments. The same
file is valid JavaScript, so Fairyfly executes it directly. There is no
`flow-remove-types` step, no Babel step, and no generated `dist` copy of the
framework to keep in sync.

The tradeoff is verbosity. Vellum accepts that tradeoff because it removes a
failure mode from the runtime path.

## Where types live

`src/types.js` is the shared contract: configuration, content entries, headings,
search records, render context, and public options. Modules import those types in
comments:

```js
/*:: import type { ContentEntry, ResolvedConfig } from "../types.js"; */
```

Public functions annotate parameters and returns. Flow is checked in CI with:

```sh
flow check --max-warnings 0
```

Install Flow `0.279+` on your machine. On macOS, `brew install flow` provides a
native Apple Silicon binary; `flow-bin` is an option on Linux and x86_64 macOS.
Vellum does not ship a Flow binary as a dependency.

## Configuring Flow

The repository `.flowconfig` includes `src/` and `bin/`, enables `all=true`, and
loads `flow-typed/globals.js` for Fairyfly globals such as `fs`, `http`,
`child_process`, and `process`.

```ini
[include]
src/.*
bin/.*

[libs]
flow-typed

[options]
all=true
```

Fairyfly globals are declared as library definitions, so Flow can check modules
that use `fs.readFile`, `http.serve`, or `child_process.spawn` without Node type
packages.

## Branded values

Configuration validation is the boundary between untyped user input and typed
internals. `resolveConfig` accepts a `ProjectConfig`, validates each field, and
returns a `ResolvedConfig` with required paths and defaults.

```js
const config = resolveConfig(raw, { root, configPath });
```

After that boundary, the build, renderer, and server receive fully populated
values. Validation errors are actionable and include a hint, matching Fairyfly's
own CLI diagnostics.

## Running the checks

```sh
npm run check:flow
npm run check:content
npm run check
```

`npm test` runs the runtime test suite through Fairyfly:

```sh
ff test
```

Tests are plain ES modules using the global `fs` and `child_process` APIs. They do
not import Node's `assert`, `path`, or `fs` modules.

> [!TIP]
> Flow's checker uses POSIX shared memory. In a restricted container, run it
> outside the sandbox or provide `/dev/shm`; the type checking itself does not
> depend on Fairyfly.

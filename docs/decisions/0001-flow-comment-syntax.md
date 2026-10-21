# ADR 0001: Flow comment syntax, no runtime transform

## Status

Accepted.

## Context

Flow is the required type system. Fairyfly executes JavaScript with QuickJS, which
does not parse Flow annotations. A conventional Flow setup would need a stripping
step (`flow-remove-types`, Babel, or a bundler) before Fairyfly could load every
module. That would introduce a build artifact for the framework itself, a source of
drift between checked and executed code, and another failure mode in the CLI.

## Decision

Use Flow's comment syntax for all framework annotations:

```js
// @flow
/*:: import type { Page } from "./types.js"; */

export function titleOf(page /*: Page */) /*: string */ {
  return page.title;
}
```

The same file is valid JavaScript. Flow checks it in CI with
`flow check --max-warnings 0`; Fairyfly executes it unchanged.

## Consequences

- No type-stripping step in the runtime path.
- Type checking and execution see the same source file.
- Annotations are more verbose than normal Flow syntax.
- Contributors must not use `import type`, `export type`, or `: T` annotations
  outside comments.
- Generated HTML, Markdown, CSS, and assets carry no Flow annotations.

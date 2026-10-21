# Contributing to Vellum

Thanks for helping. Vellum is a Fairyfly-first framework, so the most important
contribution rule is simple: **verify the runtime before you use it.**

## Requirements

- Fairyfly `0.2.0+` on `PATH` (`ff --version`)
- Node.js 18+ (Rsbuild is a development dependency)
- Flow `0.279+` on `PATH` (`brew install flow` on macOS, or
  `npm install -g flow-bin@0.279.0` on Linux)
- npm
- POSIX shell (macOS or Linux)

## Setup

```sh
npm install
flow version
npm run check:flow
npm test
npm run build
```

The docs site builds to `site/dist/`. Run it locally with:

```sh
ff bin/vellum.js dev --config site/vellum.config.js
```

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Docs site dev server |
| `npm run build` | Build the docs site |
| `npm run preview` | Preview the docs site |
| `npm run check:flow` | Flow type check |
| `npm run check:content` | Link and route validation |
| `npm test` | `ff test` over `test/*.test.js` |
| `npm run verify` | Flow + content check + tests + build |

## Runtime rules

- Framework code runs in Fairyfly. Do not import `node:fs`, `node:path`,
  `node:url`, use `Buffer`, `require`, or CommonJS.
- Use the `fs` global and the helpers in `src/util/fs.js`.
- Do not use `import.meta.url`; it is empty under Fairyfly.
- Do not add shebangs to JavaScript modules.
- Do not assume sync `fs` calls throw. Check return values or use the wrappers.
- Do not write binary data with `fs.writeFile`; it coerces values to a string.
- Do not claim Rsbuild runs inside Fairyfly. It runs in a Node subprocess.

If you need a new runtime API, write a probe first and add the finding to
`docs/fairyfly-compatibility.md`.

## Flow

Flow annotations use comment syntax so the files remain executable:

```js
// @flow
/*:: import type { Page } from "./types.js"; */

export function titleOf(page /*: Page */) /*: string */ {
  return page.title;
}
```

Rules:

- Add `// @flow` to every source module.
- Put imports and declarations in `/*:: ... */`.
- Put parameter and return annotations in comments.
- Do not introduce TypeScript.
- Never annotate Markdown, HTML, CSS, or generated output.
- Add new shared types to `src/types.js`.
- Run `npm run check:flow`.

## Tests

Tests are plain ES modules under `test/` using `test/lib.js`:

```js
import { check, eq, done } from "./lib.js";

eq("addition", 1 + 1, 2);
check("truth", true);

done("example");
```

They run under Fairyfly with `ff test`. Use global `fs` and `child_process`, not
Node's `assert`, `path`, or `fs`. Create temporary fixtures under `test/.tmp/` and
clean them up.

When you change behaviour:

1. Add a failing test that captures the requirement.
2. Fix the implementation.
3. Run the focused suite (`ff test markdown`).
4. Run the full suite (`npm test`).
5. Run Flow.

## Documentation

The public docs live in `site/src/content/docs/`. They are built by Vellum itself.
Internal notes and ADRs live in `docs/`.

When adding a configuration option:

- Validate it in `resolveConfig`.
- Add it to `ProjectConfig` and `ResolvedConfig`.
- Document it in `site/src/content/docs/guide/configuration.md`.
- Add tests for the default and invalid value.
- Update the changelog if it is user-visible.

When adding runtime behaviour, update `docs/fairyfly-compatibility.md` if the
Fairyfly contract matters.

## Pull request checklist

- [ ] `npm run check:flow` passes.
- [ ] `npm test` passes.
- [ ] `npm run build` succeeds.
- [ ] `npm run check:content` passes.
- [ ] No Node built-ins or unverified runtime APIs were introduced.
- [ ] Documentation and tests cover the change.
- [ ] Generated output (`dist/`, `.vellum/`) is not committed.

## Commit style

Prefer a short imperative subject and a body explaining the runtime or user-facing
impact. Examples:

```text
Add base-aware search index routes

Search records now include the configured base, so results work on
subpath deployments without client-side rewriting.
```

```text
Fix nested list rendering in tight lists

Unwrap the leading paragraph only; keep nested block content intact.
```

## Releases

1. Update `src/version.js`, `package.json`, and `CHANGELOG.md`.
2. Run `npm run verify`.
3. Build the docs site and inspect the output.
4. Tag the release.

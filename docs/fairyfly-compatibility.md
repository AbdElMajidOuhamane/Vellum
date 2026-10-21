# Fairyfly compatibility notes

Verified against `ff 0.2.0-beta (macos-aarch64)` on 2026-10-20. The runtime source
was inspected at `github.com/AbdElMajidOuhamane/ff` (README, `docs/`, and the API
implementation in `src/api/`), then probed with small scripts on the installed
binary.

## Probe results

| Probe | Result |
| --- | --- |
| `import { x } from "./x.js"` | Works |
| Extensionless `./x` | Probes `x.js`, then `x/index.js` |
| Bare `pkg` | `node_modules` walk-up; `exports`/`module`/`main` |
| Top-level `await` in a module | Works |
| Dynamic `import(path)` | Works with a runtime path |
| `import.meta.url` | `undefined`; `import.meta` is an empty object |
| Shebang in a module | Syntax error at the first `import` |
| `fs.readFile` missing file | `undefined` |
| `fs.readFile` empty file | `""` (or an empty buffer in buffer mode) |
| `fs.readdir` on a file | `undefined` |
| `fs.writeFile` with a missing parent | Silent, no file |
| `fs.writeFile` with `Uint8Array` | Writes a comma-separated string |
| `fs.writeFile` with `ArrayBuffer` | Same coercion |
| `fs.rm` on a missing path | Silent |
| `fs.mkdir(path, true)` on an existing dir | Silent |
| `fs.readFile(path, "buffer")` | `ArrayBuffer` |
| `new Response(arrayBuffer)` | Accepted |
| `new Response(uint8Array)` | Accepted |
| `child_process.execSync` with `cwd` | Works |
| `fetch` + redirect | Follows redirects automatically |
| `Response.redirect` | Sets status only; no `Location` |
| `import.meta` keys | `[]` |
| `console.log` stream | stderr |
| `--watch` | Polls mtime internally; not exposed as an API |

Additional observations that changed the design:

- A symlinked `node_modules/vellum-docs` failed package resolution in the tested
  build. A real copied/installed package directory worked.
- An absolute dynamic `import()` of a config that itself used bare specifiers did
  not settle in the tested build. Importing the same config through a path relative
  to the framework source worked.
- The first module resolved from a directory that has not been loaded yet can
  throw `NotDir` immediately after another module evaluation. Retrying the same
  import succeeds. The test harness retries such loads in `test/lib.js`, and
  `loadConfig` retries the dynamic config import once.
- An absolute entry path (`ff /abs/path/bin/vellum.js`) makes relative imports
  resolve without the leading slash. `bin/vellum` changes to the package root,
  launches `ff bin/vellum.js`, and restores the caller's cwd from `VELLUM_CWD`.
- Bare package imports from a script in a subdirectory (`scripts/entry.js`) did
  not walk up to the project's `node_modules` in the tested build. The generated
  project entry therefore lives at the project root (`vellum.js`), where bare
  resolution works.
- Flow comment syntax (`/*:: ... */`, `/*: T */`) is parsed as comments by QuickJS
  and checked normally by Flow. This is the basis of the no-transform type story.

## `ff.json` and `package.json`

The docs are explicit about the split:

- `ff init` writes **`ff.json`**, and `ff start` runs `main` from it.
- `ff imprint` installs pure-JS ESM packages into `node_modules/`, pins them in
  `ff.json`, and locks them in `ff.lock`.
- Bare imports resolve through `node_modules/<pkg>` using that package's
  `package.json` (`exports`, `module`, `main`).
- `package.json` at the project root is not read as a Fairyfly manifest.

Vellum therefore scaffolds both files: `ff.json` for `ff start` and project
dependencies (`vellum.js`), `package.json` for optional npm scripts and
Node-only dev dependencies. The runtime path never uses Node.

## Framework conclusions

### Package root

`import.meta.url` cannot be used. The shell launcher resolves its own path and sets
`VELLUM_ROOT`; `bin/vellum.js` also derives a fallback from `process.argv[1]`.

### Config loading

`loadConfig` computes a path relative to `<frameworkRoot>/src` and imports that.
This avoids the absolute-import edge case and keeps bare package resolution rooted
at the config file.

### Filesystem

`src/util/fs.js` wraps the silent sync API:

- `readText` returns `null` on failure.
- `writeText` ensures parents, writes, and verifies `fs.exists`.
- `isDirectory` uses `fs.readdir(path) !== undefined`.
- `copyFile` uses `child_process.spawn("cp", ...)` for binary safety, with a text
  fallback for text extensions.

### Watching

No `fs.stat` and no `fs.watch`. The watcher lists files, reads bytes, hashes with
FNV-1a, and compares a combined fingerprint. This detects edits, additions, and
deletions. It is polling, not filesystem events.

### Dev server

Fairyfly buffers response bodies, so live reload uses a JSON version endpoint and a
browser poller. The handler signature is `(url, method, body)` with strings, and
redirects must set `Location` explicitly.

### HTTP caps

- 512 connections
- ~4 KB request body
- 10 MB response body
- 2048-byte response headers
- 30 s handler watchdog
- bind address always `0.0.0.0`

Vellum's generated pages are well under these limits. There is no upload endpoint.

### Rsbuild

Rsbuild/Rspack are Node tools. The adapter writes a temporary entry and build
script, runs `node` as a child process, and copies the emitted assets. It never
claims in-process execution. `auto` falls back only when Rsbuild is unavailable;
`rsbuild` fails loudly.

### Timers and children

- 128 live timers maximum; the watcher uses one interval.
- 8 concurrent children maximum; the adapter uses one and waits for it.
- Child processes are not killed automatically when `ff` exits.

## Things not to assume

- Do not assume `Buffer`, `process.stdout`, `process.nextTick`, `structuredClone`,
  `AbortController`, `setImmediate`, `fs.stat`, `fs.watch`, or CommonJS.
- Do not assume npm packages work. They must be pure-JS ESM and pass `ff imprint`'s
  gate.
- Do not assume `console.log` goes to stdout.
- Do not assume a `Response` can stream.
- Do not add a `#!/usr/bin/env ff` line to a module.

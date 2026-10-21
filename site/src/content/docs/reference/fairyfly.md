---
title: Fairyfly compatibility
description: Verified runtime capabilities, constraints, and the compatibility probes behind Vellum's design.
order: 4
---

# Fairyfly compatibility

Vellum targets Fairyfly `0.2.0-beta` and newer. The findings below were verified
against an installed `ff` binary before the framework was implemented. They are
not assumptions about Node.js compatibility.

```sh
ff --version
# ff 0.2.0-beta (macos-aarch64)
```

## What works

| API | Verified behavior |
| --- | --- |
| ES modules | `import`/`export`, top-level `await`, dynamic `import()` |
| Relative imports | Literal paths, `./x.js` probing, `./x/index.js` |
| Bare imports | `node_modules` walk-up, `exports`, `module`, `main` |
| `fs` sync | `readFile`, `writeFile`, `exists`, `mkdir`, `rm`, `readdir` |
| `fs` async | Promise variants; successful async calls may keep the loop open |
| `child_process` | `spawn`, `exec`, `execSync`, captured stdout/stderr, `wait()` |
| `http.serve` | `(url, method, body)` handler, `Response`, redirects with manual headers |
| `fetch` | HTTP/1.1, 16 slots, redirects, JSON and text bodies |
| `URL` | `new URL`, `URL.parse`, `searchParams` |
| `Response` | String, `ArrayBuffer`, `Uint8Array` bodies |
| `TextEncoder` / `TextDecoder` | UTF-8 encode and decode |
| Language | Optional chaining, nullish assignment, class fields, `matchAll`, Unicode property escapes |
| Flow comments | Type annotations and type imports execute as ordinary comments |

## `package.json` vs `ff.json`

Fairyfly uses both files, but for different jobs:

| File | Role |
| --- | --- |
| `ff.json` | Project manifest. `ff start` reads its `main`; `ff imprint` records dependencies in it |
| `ff.lock` | Integrity-locked dependency graph written by `ff imprint` |
| `package.json` | Package metadata inside `node_modules`; supplies `exports`, `module`, `main`, and dependency names |

`package.json` is **not** a Fairyfly project manifest. A directory with only a
`package.json` is not an `ff` project, and `ff start` will not use it as one.
Fairyfly does not embed Node.js: there is no `require`, `Buffer`, `process.stdout`,
or Node module loader.

Vellum's generated project therefore contains:

```text
ff.json                 main: vellum.js
vellum.js       findFrameworkRoot + runCli
package.json            optional npm scripts and dev dependencies
```

`ff imprint github:AbdElMajidOuhamane/Vellum#v0.1.0` installs the pure-ESM
framework. `@rsbuild/core` is a development-only Node package and is not
installed by `ff imprint`; use the built-in asset pipeline or install it
separately with npm.

## Constraints that shaped Vellum

### No shebangs in JavaScript modules

A `#!/usr/bin/env ff` first line makes Fairyfly parse the file as a classic script
and fail on the following `import`. Vellum ships `bin/vellum`, a POSIX shell
wrapper, and a shebang-free `bin/vellum.js`.

### `import.meta.url` is empty

In a module, `import.meta` exists but has no `url`, `dirname`, or `filename`.
Vellum cannot use it to find its own package. The shell wrapper sets `VELLUM_ROOT`;
the CLI falls back to `process.argv[1]`; config loading uses a path relative to the
framework source.

### Synchronous filesystem failures are silent

`fs.readFile`, `fs.writeFile`, `fs.mkdir`, `fs.rm`, and `fs.readdir` return
`undefined` on I/O failure rather than throwing. `fs.readdir` on a file is not a
reliable exception either.

Vellum wraps these calls:

- `readText` returns `null` for a missing file.
- `writeText` creates parents, writes, then verifies existence and throws a
  framework error if the write did not land.
- `isDirectory` treats a successful `readdir` result as the directory signal.
- `ensureDir` verifies the directory after creation.

### `fs.writeFile` is text-only

Passing a `Uint8Array` or `ArrayBuffer` coerces it to a comma-separated string.
Vellum copies binary assets with a POSIX `cp` subprocess. Text files fall back to
`readFile` + `writeFile`.

### There is no `fs.stat` or `fs.watch`

There is no mtime, size, or watch API. The dev server polls file contents and hashes
them. This detects content changes, new files, and deletions without metadata.

### No synchronous error channel for `fs.readdir`

`isDirectory` is implemented as `fs.readdir(path) !== undefined`. An empty
directory returns `[]`; a file or missing path returns `undefined`.

### HTTP server limits

| Limit | Value |
| --- | --- |
| Concurrent connections | 512 |
| Request body | about 4 KB (413 beyond) |
| Response body | 10 MB (500 beyond) |
| Response headers | 2048 bytes |
| Handler watchdog | 30 seconds (504) |
| Bind address | always `0.0.0.0` |

Vellum's dev server stays well below these limits: HTML pages are small, and
there is no request body handling beyond reading the URL.

### No streaming responses

`Response` bodies are buffered. The live-reload client therefore polls a JSON
endpoint instead of using SSE or a long-lived stream.

### `fetch` behavior

- Redirects are followed automatically (up to 5).
- `Response.redirect` sets no `Location` header, so Vellum sends redirects with an
  explicit `Location` header.
- There is no `AbortController` support.

### Console writes to stderr

`console.log` writes to stderr. Vellum's CLI and capturable JSON output are
therefore on stderr. Build output files are unaffected.

### Timers and child processes

- At most 128 live timers. The watcher uses one interval.
- At most 8 concurrent children. The Rsbuild adapter runs one.
- Children are not killed automatically. The adapter waits for Rsbuild to exit.

### Module-resolution caveats

- Extensionless relative imports only probe `.js` and `index.js`.
- Absolute dynamic imports of a config that itself uses bare specifiers were
  unreliable in the tested build. `loadConfig` imports the config through a path
  relative to the framework source instead.
- A symlinked `node_modules/vellum-docs` produced a resolution failure in the
  tested build. Use a real installed package directory (npm does this) or a
  relative import for local development.
- The first module resolved from a new directory can throw `NotDir` immediately
  after another module evaluation. Retrying the same import succeeds. The test
  harness uses a retrying loader, and `loadConfig` retries its dynamic import
  once.
- An absolute entry path makes relative imports resolve without the leading
  slash. The launcher changes to the package root, runs a relative entry, and
  restores the caller's working directory from `VELLUM_CWD`.
- Bare package imports from a subdirectory script did not walk up to the project
  `node_modules` in the tested build. The generated `vellum.js` entry stays at the
  project root for that reason.

## Verified probes

The implementation was checked with small runtime probes before the framework was
written:

```js
// fs behavior
console.log(fs.readFile("missing"));            // undefined
console.log(fs.readFile("empty", "buffer"));    // ArrayBuffer or undefined
console.log(fs.readdir("file.txt"));            // undefined
fs.writeFile("x.bin", new Uint8Array([0, 255])); // writes "0,255"
```

```js
// module behavior
console.log(import.meta.url);   // undefined
console.log(typeof defineConfig, "function");
```

```sh
# Node-subprocess bundling
ff bin/vellum.js build --bundler rsbuild
# -> runs Node, Rsbuild, and Rspack; assets copied back to dist/
```

The same probes are documented in the repository's
`docs/fairyfly-compatibility.md` with the framework-specific conclusions.

## Rsbuild is not running in Fairyfly

Rsbuild and Rspack require Node built-ins and native bindings. Vellum runs them in
a child process and copies the emitted assets back. When Node or Rsbuild is
missing, the built-in pipeline runs and the CLI says so.

See [Build and bundling](/guide/bundling/) for the adapter contract.

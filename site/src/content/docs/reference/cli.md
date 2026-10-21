---
title: CLI
description: Every Vellum command, flag, exit code, and JSON output mode.
order: 1
---

# CLI

The CLI is a small shell launcher around a Fairyfly module. The launcher resolves
its own path and sets `VELLUM_ROOT`, because Fairyfly does not expose a reliable
module URL.

```sh
vellum <command> [options]
```

In a scaffolded project, `ff.json` points at `vellum.js`. That means:

```sh
ff start                              # dev server
ff vellum.js build            # static build
ff vellum.js preview          # preview dist/
ff vellum.js check            # content and link validation
```

The `vellum <command>` form is the same dispatcher, launched through the package
bin wrapper. Node is not involved in either form.

## Commands

| Command | Purpose |
| --- | --- |
| `dev` | Start the development server with live reload |
| `build` | Generate the static site |
| `preview` | Serve the generated site |
| `check` | Validate configuration, routes, and internal links |
| `new [dir]` | Scaffold a documentation site |
| `version` | Print the framework version |
| `help` | Print usage |

`create` is an alias for `new`. Running `vellum` with no command prints help.

## Options

| Option | Default | Description |
| --- | --- | --- |
| `-c, --config <path>` | `./vellum.config.js` | Config file |
| `-r, --root <path>` | config directory | Project root |
| `-p, --port <number>` | `4321` | Dev or preview port |
| `--out <path>` | `dist` | Override the build output directory |
| `--bundler <mode>` | `auto` | `auto`, `rsbuild`, or `builtin` |
| `--drafts` | off | Include draft pages |
| `--no-search` | search on | Disable the search index and UI |
| `-f, --force` | off | Write into a non-empty scaffold directory |
| `-q, --quiet` | off | Suppress progress output |
| `-v, --verbose` | off | Show debug output |
| `--json` | off | Print one machine-readable result |
| `-h, --help` | — | Print help |
| `-V, --version` | — | Print the version |

Both `--flag value` and `--flag=value` forms are accepted for value options.
Short flags `-c`, `-r`, `-p`, `-q`, `-v`, `-f`, `-h`, and `-V` are supported.

## Examples

Scaffold and run a new site:

```sh
vellum new my-docs
cd my-docs
npm install
vellum dev --port 5000
```

Build with a subpath deployment:

```sh
vellum build --config site/vellum.config.js --out public-build
```

Force Rsbuild and fail if it is missing:

```sh
vellum build --bundler rsbuild
```

Validate content:

```sh
vellum check
vellum check --json
```

## Exit codes

| Code | Meaning |
| --- | --- |
| `0` | Success |
| `1` | Invalid arguments, config error, build error, broken links, or missing dependency |

The CLI prints errors in Fairyfly's diagnostic shape:

```text
error: <message>
hint: <what to try next>
```

Set `VELLUM_DEBUG=1` to print a JavaScript stack after the hint.

## JSON output

`--json` implies `--quiet` and prints a single JSON object. Because Fairyfly's
`console.log` writes to **stderr**, JSON output is also on stderr:

```sh
vellum build --json 2> build-result.json
```

A build result looks like:

```json
{
  "pages": 12,
  "assets": ["/assets/vellum.css", "/assets/vellum.js"],
  "outDir": "/project/dist",
  "durationMs": 84,
  "warnings": [],
  "bundler": "builtin"
}
```

A failed `check --json` prints the issue list and exits `1`:

```json
{
  "ok": false,
  "pages": 12,
  "drafts": 1,
  "links": 34,
  "issues": [
    {
      "file": "guide/intro.md",
      "href": "/missing/",
      "message": "Broken link `/missing/` in `guide/intro.md` ..."
    }
  ],
  "warnings": []
}
```

## Exit behavior

- `dev` and `preview` keep running until interrupted. Fairyfly exposes no signal
  handler or server close API, so use `Ctrl-C`.
- `build` exits when the event loop drains.
- `new` never prompts. Pass `--title` to set the site title; the directory name is
  used otherwise.
- `--force` writes the known scaffold files and leaves unrelated files alone.

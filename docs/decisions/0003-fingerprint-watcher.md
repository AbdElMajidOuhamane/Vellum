# ADR 0003: Poll content fingerprints for dev reloads

## Status

Accepted.

## Context

Fairyfly exposes no `fs.watch`, `fs.stat`, or mtime API. Its own `--watch` flag
polls internally and restarts a child process, which is not available to framework
code and would restart the server on every edit. The dev server needs to notice
Markdown and theme edits without assuming Node APIs.

## Decision

Implement a polling watcher in `src/server/watcher.js`:

- List files under the content root and configured extra files.
- Read bytes and hash them with FNV-1a.
- Combine per-file hashes into a fingerprint.
- Compare fingerprints at `dev.watchInterval` (default 700 ms).
- Increment a revision and mark the model dirty on a change.
- Expose the version to the browser client through `/__vellum/version`.

The browser client polls that endpoint and reloads on a version change. The server
re-collects content lazily on the next request after a dirty flag.

## Consequences

- Works with the documented Fairyfly API set.
- Detects edits, additions, and deletions without metadata.
- Cost scales with the size of the content and theme files; docs sites are small.
- Reload latency is bounded by the poll interval plus the request time.
- It is not HMR. Config changes still require a restart.
- Tests can call `pollNow()` directly without timers.

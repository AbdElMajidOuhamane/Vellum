# ADR 0004: Own the Markdown engine

## Status

Accepted.

## Context

The framework must be Markdown-first and must run under Fairyfly. npm Markdown
packages are not guaranteed to pass Fairyfly's pure-ESM gate, and adding a parser
dependency would make the core content path depend on package resolution,
versioning, and npm installs. Documentation needs a predictable subset with heading
IDs, TOC data, link collection for validation, and base-aware link rewriting.

## Decision

Implement a focused Markdown engine in `src/content/`:

- A line-based block parser for headings, paragraphs, fenced and indented code,
  blockquotes, callouts, lists, tables, rules, and raw HTML blocks.
- An inline parser for emphasis, strong, strikethrough, code spans, links, images,
  autolinks, references, entities, hard breaks, and inline HTML.
- A strict YAML subset for frontmatter.
- Heading slugging with Unicode letters and duplicate handling.
- Link collection and `.md` route rewriting.

## Consequences

- No runtime Markdown dependency.
- The parser is testable with Fairyfly's globals and has no DOM or Node coupling.
- The supported syntax is a documented subset, not full CommonMark.
- New syntax requires tests and documentation updates.
- Security remains explicit: raw HTML is trusted and not sanitized.

# Security

## Supported versions

Vellum is pre-1.0. Security fixes are applied to the latest `0.1.x` release.

## Reporting a vulnerability

Please report vulnerabilities privately to the maintainers rather than opening a
public issue. Include:

- The affected version.
- A minimal reproduction or page.
- The expected and actual behavior.
- Whether the issue requires untrusted content, a malicious config, or a
  compromised dependency.

## Trust model

Vellum is a static site generator for content you control.

- **Markdown is trusted.** Raw HTML blocks, inline HTML, and URLs come from your
  content. Vellum escapes plain text and filters `javascript:`/`vbscript:` URLs,
  but it does not sanitize raw HTML.
- **Configuration is trusted.** `vellum.config.js` is arbitrary ES module code and
  runs with the privileges of the CLI.
- **Content is not sandboxed.** Do not run `vellum build` against untrusted
  Markdown.
- **Rsbuild runs in Node.** The optional browser build executes Node and your
  installed dependencies in a child process.
- **The dev server is local.** Fairyfly binds to `0.0.0.0`; do not expose the dev
  server to an untrusted network.

## Static output

Generated pages include no third-party scripts, fonts, or analytics. The browser
client is served from the site's own `/assets/vellum.js`. Custom CSS and raw HTML
can change that guarantee.

If you add user-generated content, add sanitization before rendering and review the
link and raw HTML paths in `src/content/inline.js` and `src/content/markdown.js`.

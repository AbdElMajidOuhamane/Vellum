// @flow
/*:: import type { ContentEntry, RenderContext, ResolvedConfig } from "../types.js"; */
import { errorHint, errorMessage, errorStack } from "../util/errors.js";
import { escapeHtml } from "../util/html.js";
import { withBase } from "../util/path.js";
import { renderPage } from "./layout.js";

export function notFoundEntry(config /*: ResolvedConfig */) /*: ContentEntry */ {
  return {
    file: "",
    relativeFile: "404.md",
    route: "/404.html",
    outputFile: "404.html",
    frontmatter: {
      title: "Page not found",
      description: "The page you requested does not exist.",
      robots: "noindex,nofollow",
      layout: "404",
    },
    title: "Page not found",
    description: "The page you requested does not exist.",
    sidebarLabel: "Page not found",
    sidebarOrder: 0,
    sidebarGroup: "Overview",
    sidebarHidden: true,
    draft: false,
    order: 0,
    html:
      "<p>That page does not exist, or it moved.</p>" +
      '<p><a class="button button-primary" href="' +
      withBase(config.base, "/") +
      '">Back to the documentation</a></p>',
    headings: [],
    bodyText: "The page you requested does not exist.",
    links: [],
    source: "",
  };
}

export function renderNotFound(context /*: RenderContext */) /*: string */ {
  const entry = notFoundEntry(context.config);
  return renderPage({
    ...context,
    entry,
    toc: [],
    prev: null,
    next: null,
  });
}

/*:: type ErrorPageOptions = {
  status?: number,
  config?: ResolvedConfig | null,
};
*/

export function renderErrorPage(
  error /*: mixed */,
  options /*: ErrorPageOptions */ = {},
) /*: string */ {
  const status = options.status || 500;
  const config = options.config || null;
  const message = errorMessage(error);
  const hint = errorHint(error);
  const stack = errorStack(error);
  const home = config ? withBase(config.base, "/") : "/";
  const siteTitle = config ? config.title : "Vellum";

  return (
    "<!doctype html><html lang=\"en\"><head><meta charset=\"utf-8\">" +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<meta name="robots" content="noindex,nofollow">' +
    "<title>" + escapeHtml(siteTitle) + " \u2014 " + String(status) + "</title>" +
    "<style>" +
    ":root{color-scheme:dark;--bg:#0e0f14;--panel:#171922;--border:#2a2e3d;--text:#e9ebf2;--muted:#9aa0b5;--danger:#ff7b72;--accent:#8b8bf5}" +
    "*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.6 ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;padding:2rem}" +
    ".wrap{max-width:960px;margin:6vh auto}.badge{display:inline-flex;align-items:center;gap:.5rem;border:1px solid var(--border);background:var(--panel);color:var(--danger);padding:.35rem .7rem;border-radius:999px;font-size:.8rem;font-weight:600;letter-spacing:.04em;text-transform:uppercase}" +
    "h1{font-size:clamp(1.6rem,4vw,2.4rem);line-height:1.2;margin:1.2rem 0 .6rem;letter-spacing:-.02em}p{color:var(--muted);max-width:70ch}" +
    ".hint{border-left:3px solid var(--accent);padding:.7rem 1rem;background:var(--panel);border-radius:0 .5rem .5rem 0;color:var(--text);margin:1.2rem 0}" +
    "pre{background:var(--panel);border:1px solid var(--border);border-radius:.75rem;padding:1rem;overflow:auto;font:13px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#cfd3e1;white-space:pre-wrap}" +
    "a{color:var(--accent)}.back{display:inline-block;margin-top:1.5rem;font-weight:600;text-decoration:none}" +
    "</style></head><body><div class=\"wrap\">" +
    '<span class="badge">' + String(status) + " \u00b7 Development error</span>" +
    "<h1>" + escapeHtml(message) + "</h1>" +
    "<p>Vellum could not render this page. Fix the error below; the dev server will reload when the file changes.</p>" +
    (hint ? '<div class="hint">' + escapeHtml(hint) + "</div>" : "") +
    "<pre>" + escapeHtml(stack) + "</pre>" +
    '<a class="back" href="' + escapeHtml(home) + '">\u2190 Back to ' + escapeHtml(siteTitle) + "</a>" +
    "</div></body></html>"
  );
}

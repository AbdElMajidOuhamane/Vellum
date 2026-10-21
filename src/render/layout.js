// @flow
/*:: import type { ContentEntry, FeatureConfig, HeroConfig, RenderContext } from "../types.js"; */
import { escapeHtml } from "../util/html.js";
import {
  dataAttributes,
  renderBreadcrumbs,
  renderEditLink,
  renderFeatures,
  renderFooter,
  renderHead,
  renderHeader,
  renderHero,
  renderLiveReload,
  renderMobileToc,
  renderPagination,
  renderSearchDialog,
  renderSidebar,
  renderTocBlocks,
} from "./components.js";
import { VERSION } from "../version.js";
import { withBase } from "../util/path.js";
import { buildBreadcrumbs } from "../content/site.js";

function pageHero(context /*: RenderContext */) /*: HeroConfig | null */ {
  if (context.entry.frontmatter.hero) {
    return context.entry.frontmatter.hero;
  }
  if (context.entry.route === "/" && context.config.hero) {
    return context.config.hero;
  }
  return null;
}

function pageFeatures(context /*: RenderContext */) /*: Array<FeatureConfig> */ {
  const own = context.entry.frontmatter.features;
  if (Array.isArray(own)) {
    return (own /*: any */);
  }
  if (context.entry.route === "/") {
    return context.config.features;
  }
  return [];
}

export function renderPage(context /*: RenderContext */) /*: string */ {
  const config = context.config;
  const entry = context.entry;
  const hero = pageHero(context);
  const features = pageFeatures(context);
  // `layout: splash` and the Astro/Starlight spelling `template: splash` are
  // the same page: full width, no sidebar, TOC, breadcrumbs, or pagination.
  const layout = entry.frontmatter.layout || entry.frontmatter.template || "";
  const splash = layout === "splash";
  const hasSidebar = context.sidebar.length > 0 && !splash;
  const hasHeadingOne = entry.headings.some((heading) => heading.level === 1);

  let html = "<!doctype html>";
  html += '<html lang="' + escapeHtml(config.lang) + '">';
  html += "<head>" + renderHead(entry, config, context.assets) + "</head>";
  html += "<body" + dataAttributes(config, entry) + ">";
  html += '<a class="skip-link" href="#main-content">Skip to content</a>';
  html += renderHeader(config, context.nav, entry.route);
  html +=
    '<div class="page-shell' + (hasSidebar ? " has-sidebar" : "") +
    (splash ? " is-splash" : "") + '">';
  if (hasSidebar) {
    html += renderSidebar(context.sidebar, entry.route, config);
  }
  html += '<div class="page-main">';
  html += '<main id="main-content" class="main" tabindex="-1">';
  html += '<div class="content-column">';
  const byRoute /*: Map<string, ContentEntry> */ = new Map();
  for (const candidate of context.entries) {
    byRoute.set(candidate.route, candidate);
  }
  html += renderBreadcrumbs(
    splash || entry.route === "/" || entry.frontmatter.layout === "404"
      ? []
      : buildBreadcrumbs(entry, byRoute, config),
    config,
  );
  if (!splash) {
    html += renderMobileToc(context.toc);
  }
  if (hero) {
    html += renderHero(hero, entry.title, entry.description, config, splash);
  } else if (!hasHeadingOne) {
    html += '<h1 class="page-title">' + escapeHtml(entry.title) + "</h1>";
  }
  html += renderFeatures(features, config);
  html += '<article class="prose">';
  html += entry.html;
  html += "</article>";
  if (!splash) {
    html += renderEditLink(entry, config);
    html += renderPagination(context.prev, context.next, config);
  }
  html += "</div>";
  if (!splash) {
    html += renderTocBlocks(context.toc);
  }
  html += "</main>";
  html += renderFooter(config);
  html += "</div></div>";
  html += renderSearchDialog(config);
  if (context.dev) {
    html += renderLiveReload(context.version || VERSION, config);
  }
  for (const script of context.assets.js) {
    html += '<script src="' + escapeHtml(withBase(config.base, script)) + '" defer></script>';
  }
  html += "<noscript><style>.search-toggle{display:none}</style></noscript>";
  html += "</body></html>";
  return html;
}


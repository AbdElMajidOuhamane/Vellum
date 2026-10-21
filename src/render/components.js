// @flow
/*:: import type { ContentEntry, FeatureConfig, HeroConfig, NavItem, ResolvedConfig, SidebarItem } from "../types.js"; */
import { escapeAttr, escapeHtml, jsonForScript } from "../util/html.js";
import { basename, humanize, isExternalUrl, withBase } from "../util/path.js";
import { VERSION } from "../version.js";
import { renderToc } from "../content/toc.js";
/*:: import type { TocNode } from "../types.js"; */

const BRAND_SVG =
  '<svg class="brand-mark" viewBox="0 0 32 32" aria-hidden="true" focusable="false">' +
  '<rect x="1" y="1" width="30" height="30" rx="9" fill="currentColor"/>' +
  '<path d="M9 10.5 15.8 21.5 23 10.5" fill="none" stroke="white" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>' +
  '<path d="M10.5 8h5.2" fill="none" stroke="white" stroke-width="2.2" stroke-linecap="round" opacity=".65"/>' +
  "</svg>";

const FAVICON_COLOR_FALLBACK = "#5b5bd6";

function faviconHref(config /*: ResolvedConfig */) /*: string */ {
  const custom = config.theme.favicon;
  if (custom) {
    return isExternalUrl(custom) ? custom : withBase(config.base, custom);
  }
  const accent = config.theme.accent || FAVICON_COLOR_FALLBACK;
  const contrast = config.theme.accentContrast || "#ffffff";
  const svg =
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
    '<rect width="32" height="32" rx="9" fill="' + accent + '"/>' +
    '<path d="M9 10.5 15.8 21.5 23 10.5" fill="none" stroke="' + contrast +
    '" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round"/>' +
    "</svg>";
  return "data:image/svg+xml," + encodeURIComponent(svg);
}

function brandMark(config /*: ResolvedConfig */) /*: string */ {
  const logo = config.theme.logo;
  if (!logo) {
    return BRAND_SVG;
  }
  const src = isExternalUrl(logo) ? logo : withBase(config.base, logo);
  return '<img class="brand-logo" src="' + escapeAttr(src) + '" alt="" width="28" height="28">';
}

function absoluteUrl(config /*: ResolvedConfig */, route /*: string */) /*: string */ {
  if (!config.site) {
    return "";
  }
  return config.site + withBase(config.base, route);
}

function pageTitle(entry /*: ContentEntry */, config /*: ResolvedConfig */) /*: string */ {
  if (entry.route === "/" && entry.title === config.title) {
    return config.description ? config.title + " \u2014 " + config.description : config.title;
  }
  return entry.title + " | " + config.title;
}

function themeStyle(config /*: ResolvedConfig */) /*: string */ {
  return (
    "<style>:root{" +
    "--vellum-accent:" + escapeAttr(config.theme.accent || "#5b5bd6") + ";" +
    "--vellum-accent-contrast:" + escapeAttr(config.theme.accentContrast || "#ffffff") +
    ";}</style>"
  );
}

export function renderHead(
  entry /*: ContentEntry */,
  config /*: ResolvedConfig */,
  assets /*: { css: Array<string>, js: Array<string> } */,
) /*: string */ {
  const is404 = entry.frontmatter.layout === "404";
  const canonical = is404 ? "" : absoluteUrl(config, entry.route);
  const socialImage = config.theme.socialImage
    ? (isExternalUrl(config.theme.socialImage)
        ? config.theme.socialImage
        : config.site + withBase(config.base, config.theme.socialImage))
    : "";
  const robots = entry.frontmatter.robots || (entry.draft ? "noindex,nofollow" : "index,follow");
  const searchUrl = withBase(config.base, "/search-index.json");

  let head = "";
  head += '<meta charset="utf-8">';
  head += '<meta name="viewport" content="width=device-width, initial-scale=1">';
  head += "<title>" + escapeHtml(pageTitle(entry, config)) + "</title>";
  head += '<meta name="description" content="' + escapeAttr(entry.description) + '">';
  head += '<meta name="robots" content="' + escapeAttr(robots) + '">';
  head += '<meta name="generator" content="Vellum ' + VERSION + '">';
  head += '<meta name="color-scheme" content="light dark">';
  head += '<meta name="theme-color" content="' + escapeAttr(config.theme.accent || "#5b5bd6") + '">';
  head += '<link rel="icon" href="' + escapeAttr(faviconHref(config)) + '">';
  if (canonical) {
    head += '<link rel="canonical" href="' + escapeAttr(canonical) + '">';
    head += '<meta property="og:url" content="' + escapeAttr(canonical) + '">';
  }
  head += '<meta property="og:type" content="article">';
  head += '<meta property="og:site_name" content="' + escapeAttr(config.title) + '">';
  head += '<meta property="og:title" content="' + escapeAttr(entry.title) + '">';
  head += '<meta property="og:description" content="' + escapeAttr(entry.description) + '">';
  head += '<meta name="twitter:card" content="' + (socialImage ? "summary_large_image" : "summary") + '">';
  head += '<meta name="twitter:title" content="' + escapeAttr(entry.title) + '">';
  head += '<meta name="twitter:description" content="' + escapeAttr(entry.description) + '">';
  if (socialImage) {
    head += '<meta property="og:image" content="' + escapeAttr(socialImage) + '">';
    head += '<meta name="twitter:image" content="' + escapeAttr(socialImage) + '">';
  }
  if (config.search.enabled) {
    head += '<meta name="vellum-search" content="' + escapeAttr(searchUrl) + '">';
  }
  head += themeStyle(config);
  for (const css of assets.css) {
    head += '<link rel="stylesheet" href="' + escapeAttr(withBase(config.base, css)) + '">';
  }
  head +=
    "<script>(function(){document.documentElement.classList.add(\"js\");" +
    "try{var t=localStorage.getItem(\"vellum-theme\");" +
    "if(t===\"light\"||t===\"dark\"){document.documentElement.setAttribute(\"data-theme\",t);}}" +
    "catch(e){}})();</script>";
  return head;
}

function isActive(currentRoute /*: string */, link /*: string */) /*: boolean */ {
  if (link === "/") {
    return currentRoute === "/";
  }
  const clean = link.endsWith("/") ? link : link + "/";
  return currentRoute === clean || currentRoute.startsWith(clean);
}

function renderNavLink(
  item /*: NavItem */,
  currentRoute /*: string */,
  config /*: ResolvedConfig */,
  className /*: string */,
) /*: string */ {
  const external = isExternalUrl(item.link);
  const href = external ? item.link : withBase(config.base, item.link);
  const active = !external && isActive(currentRoute, item.link);
  return (
    '<a class="' + className + (active ? " is-active" : "") + '" href="' + escapeAttr(href) + '"' +
    (external ? ' rel="noreferrer noopener"' : "") +
    (active ? ' aria-current="page"' : "") +
    ">" + escapeHtml(item.label) + "</a>"
  );
}

export function renderHeader(
  config /*: ResolvedConfig */,
  nav /*: Array<NavItem> */,
  currentRoute /*: string */,
) /*: string */ {
  let html = '<header class="site-header"><div class="header-inner">';
  html +=
    '<button class="icon-button menu-toggle" type="button" aria-label="Open navigation" ' +
    'aria-controls="sidebar" aria-expanded="false" data-menu-toggle>' +
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    "</button>";
  html +=
    '<a class="brand" href="' + escapeAttr(withBase(config.base, "/")) + '">' +
    brandMark(config) +
    '<span class="brand-name">' + escapeHtml(config.title) + "</span></a>";
  html += '<nav class="top-nav" aria-label="Primary">';
  for (const item of nav) {
    html += renderNavLink(item, currentRoute, config, "top-nav-link");
  }
  html += "</nav>";
  html += '<div class="header-actions">';
  if (config.search.enabled) {
    html +=
      '<button class="search-toggle" type="button" aria-label="Search documentation" data-search-open>' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
      '<span class="search-label">Search</span><kbd class="search-key">/</kbd></button>';
  }
  if (config.social.github) {
    html +=
      '<a class="icon-button" href="' + escapeAttr(config.social.github) + '" aria-label="GitHub repository" rel="noreferrer noopener">' +
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="M12 2C6.48 2 2 6.58 2 12.26c0 4.54 2.87 8.39 6.84 9.75.5.1.68-.22.68-.49v-1.7c-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.63.07-.63 1 .07 1.53 1.06 1.53 1.06.9 1.57 2.36 1.12 2.94.86.09-.67.35-1.12.63-1.38-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05A9.3 9.3 0 0 1 12 6.84c.85 0 1.71.12 2.51.35 1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9v2.82c0 .27.18.59.69.49A10.02 10.02 0 0 0 22 12.26C22 6.58 17.52 2 12 2Z"/></svg></a>';
  }
  html +=
    '<button class="icon-button theme-toggle" type="button" aria-label="Toggle dark mode" aria-pressed="false" data-theme-toggle>' +
    '<svg class="icon-sun" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '<svg class="icon-moon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
    "</button>";
  html += "</div></div></header>";
  return html;
}

function renderSidebarItems(
  items /*: Array<SidebarItem> */,
  currentRoute /*: string */,
  config /*: ResolvedConfig */,
  depth /*: number */,
) /*: string */ {
  if (items.length === 0) {
    return "";
  }
  let html = "<ul>";
  for (const item of items) {
    const children = item.items;
    if (children && children.length > 0) {
      html += '<li class="sidebar-branch">';
      html +=
        "<details" + (depth === 0 || item.collapsed !== true ? " open" : "") + ">" +
        "<summary>" + escapeHtml(item.label) + "</summary>";
      html += renderSidebarItems(children, currentRoute, config, depth + 1);
      html += "</details></li>";
      continue;
    }
    const external = item.link ? isExternalUrl(item.link) : false;
    const href = item.link ? (external ? item.link : withBase(config.base, item.link)) : "#";
    const active = !external && item.link ? isActive(currentRoute, item.link) : false;
    html +=
      '<li><a class="sidebar-link' + (active ? " is-active" : "") + '" href="' + escapeAttr(href) + '"' +
      (external ? ' rel="noreferrer noopener"' : "") +
      (active ? ' aria-current="page"' : "") +
      ">" + escapeHtml(item.label) + "</a></li>";
  }
  html += "</ul>";
  return html;
}

export function renderSidebar(
  sidebar /*: Array<SidebarItem> */,
  currentRoute /*: string */,
  config /*: ResolvedConfig */,
) /*: string */ {
  let html =
    '<aside class="sidebar" id="sidebar" aria-label="Documentation navigation"><nav class="sidebar-nav">';
  for (const group of sidebar) {
    const children = group.items;
    const groupLink = group.link;
    if (children && children.length > 0 && !groupLink) {
      html +=
        '<section class="sidebar-group"><p class="sidebar-group-title">' +
        escapeHtml(group.label) +
        "</p>" +
        renderSidebarItems(children, currentRoute, config, 0) +
        "</section>";
      continue;
    }
    if (groupLink) {
      const external = isExternalUrl(groupLink);
      const href = external ? groupLink : withBase(config.base, groupLink);
      html +=
        '<section class="sidebar-group"><a class="sidebar-link' +
        (isActive(currentRoute, groupLink) ? " is-active" : "") +
        '" href="' + escapeAttr(href) + '">' + escapeHtml(group.label) + "</a></section>";
    }
  }
  html += "</nav></aside>";
  return html;
}

export function renderBreadcrumbs(
  crumbs /*: Array<{ label: string, link: string | null }> */,
  config /*: ResolvedConfig */,
) /*: string */ {
  if (crumbs.length === 0) {
    return "";
  }
  let html = '<nav class="breadcrumbs" aria-label="Breadcrumb"><ol>';
  for (let index = 0; index < crumbs.length; index += 1) {
    const crumb = crumbs[index];
    const last = index === crumbs.length - 1;
    html += "<li>";
    if (crumb.link && !last) {
      html += '<a href="' + escapeAttr(withBase(config.base, crumb.link)) + '">' + escapeHtml(crumb.label) + "</a>";
    } else {
      html += '<span aria-current="page">' + escapeHtml(crumb.label) + "</span>";
    }
    html += "</li>";
  }
  html += "</ol></nav>";
  return html;
}

export function renderHero(
  hero /*: HeroConfig */,
  title /*: string */,
  description /*: string */,
  config /*: ResolvedConfig */,
  splash /*: boolean */ = false,
) /*: string */ {
  const heroTitle = hero.title || title;
  const tagline = hero.tagline || description;
  const eyebrow = hero.eyebrow || (splash ? "" : "Documentation");
  const media = heroMedia(hero);
  const image = media.src;
  let html =
    '<section class="hero' + (splash ? " hero-splash" : "") + (image ? " hero-with-media" : "") + '">';
  html += '<div class="hero-copy">';
  if (eyebrow) {
    html += '<p class="hero-eyebrow">' + escapeHtml(eyebrow) + "</p>";
  }
  html += "<h1>" + escapeHtml(heroTitle) + "</h1>";
  if (tagline) {
    html += '<p class="hero-tagline">' + escapeHtml(tagline) + "</p>";
  }
  if (hero.actions && hero.actions.length > 0) {
    html += '<div class="hero-actions">';
    for (const action of hero.actions) {
      const variant =
        action.variant === "minimal"
          ? "button-minimal"
          : action.variant === "secondary"
            ? "button-secondary"
            : "button-primary";
      const external = isExternalUrl(action.link);
      html +=
        '<a class="button ' + variant + '" href="' +
        escapeAttr(external ? action.link : withBase(config.base, action.link)) + '"' +
        (external ? ' rel="noreferrer noopener"' : "") + ">" +
        escapeHtml(action.text) + "</a>";
    }
    html += "</div>";
  }
  html += "</div>";
  if (image) {
    const src = isExternalUrl(image) ? image : withBase(config.base, image);
    html +=
      '<figure class="hero-media"><img src="' + escapeAttr(src) + '" alt="' +
      escapeAttr(media.alt) + '" loading="lazy"></figure>';
  }
  html += "</section>";
  return html;
}

// `image` accepts a path or the Astro/Starlight `{ file, alt }` mapping.
function heroMedia(hero /*: HeroConfig */) /*: { src: string, alt: string } */ {
  const image = hero.image;
  if (!image) {
    return { src: "", alt: "" };
  }
  if (typeof image === "string") {
    return { src: image, alt: hero.imageAlt || "" };
  }
  return { src: image.file || "", alt: hero.imageAlt || image.alt || "" };
}

export function renderFeatures(
  features /*: Array<FeatureConfig> */,
  config /*: ResolvedConfig */,
) /*: string */ {
  if (features.length === 0) {
    return "";
  }
  let html = '<section class="features">';
  for (const feature of features) {
    const body =
      '<h2 class="feature-title">' + escapeHtml(feature.title) + "</h2>" +
      '<p class="feature-description">' + escapeHtml(feature.description) + "</p>";
    const link = feature.link;
    if (link) {
      const external = isExternalUrl(link);
      html +=
        '<a class="feature is-link" href="' +
        escapeAttr(external ? link : withBase(config.base, link)) + '"' +
        (external ? ' rel="noreferrer noopener"' : "") + ">" + body + "</a>";
    } else {
      html += '<article class="feature">' + body + "</article>";
    }
  }
  html += "</section>";
  return html;
}

export function renderPagination(
  prev /*: ContentEntry | null */,
  next /*: ContentEntry | null */,
  config /*: ResolvedConfig */,
) /*: string */ {
  if (!prev && !next) {
    return "";
  }
  let html = '<nav class="pagination" aria-label="Pagination">';
  if (prev) {
    html +=
      '<a class="pagination-link pagination-prev" href="' + escapeAttr(withBase(config.base, prev.route)) + '">' +
      '<span class="pagination-label">Previous</span><span class="pagination-title">' +
      escapeHtml(prev.title) + "</span></a>";
  } else {
    html += "<span></span>";
  }
  if (next) {
    html +=
      '<a class="pagination-link pagination-next" href="' + escapeAttr(withBase(config.base, next.route)) + '">' +
      '<span class="pagination-label">Next</span><span class="pagination-title">' +
      escapeHtml(next.title) + "</span></a>";
  }
  html += "</nav>";
  return html;
}

export function renderEditLink(
  entry /*: ContentEntry */,
  config /*: ResolvedConfig */,
) /*: string */ {
  const editLink = config.editLink;
  if (!editLink || entry.frontmatter.editLink === false) {
    return "";
  }
  const url = editLink.baseUrl + encodeURI(entry.relativeFile).replace(/#/g, "%23");
  return (
    '<a class="edit-link" href="' + escapeAttr(url) + '" rel="noreferrer noopener">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>' +
    escapeHtml(editLink.label || "Edit this page") + "</a>"
  );
}

export function renderFooter(config /*: ResolvedConfig */) /*: string */ {
  const year = new Date().getFullYear();
  let html = '<footer class="site-footer"><div class="footer-inner">';
  html += '<p class="footer-copy">\u00a9 ' + String(year) + " " + escapeHtml(config.title) + "</p>";
  if (config.footer) {
    html += '<p class="footer-note">' + escapeHtml(config.footer) + "</p>";
  }
  html += '<p class="footer-built">Built with <span class="footer-brand">Vellum</span></p>';
  html += "</div></footer>";
  return html;
}

export function renderSearchDialog(config /*: ResolvedConfig */) /*: string */ {
  if (!config.search.enabled) {
    return "";
  }
  return (
    '<div class="search-dialog" id="search-dialog" hidden data-search-dialog>' +
    '<div class="search-backdrop" data-search-close></div>' +
    '<div class="search-panel" role="dialog" aria-modal="true" aria-labelledby="search-title">' +
    '<h2 class="visually-hidden" id="search-title">Search documentation</h2>' +
    '<div class="search-field">' +
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 4.5 4.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>' +
    '<input id="search-input" type="search" placeholder="Search documentation\u2026" autocomplete="off" spellcheck="false" aria-label="Search documentation" role="combobox" aria-expanded="true" aria-controls="search-results" aria-autocomplete="list" data-search-input>' +
    '<button type="button" class="search-close" data-search-close aria-label="Close search">Esc</button>' +
    "</div>" +
    '<p class="search-status visually-hidden" role="status" aria-live="polite" data-search-status></p>' +
    '<div class="search-results" id="search-results" role="listbox" aria-label="Search results" data-search-results></div>' +
    '<p class="search-empty" hidden data-search-empty>No matches. Try a shorter query.</p>' +
    '<div class="search-footer"><span><kbd>\u2191</kbd><kbd>\u2193</kbd> to navigate</span><span><kbd>Enter</kbd> to open</span><span><kbd>Esc</kbd> to close</span></div>' +
    "</div></div>"
  );
}

export function renderTocBlocks(toc /*: Array<TocNode> */) /*: string */ {
  if (toc.length === 0) {
    return "";
  }
  return (
    '<aside class="page-toc" aria-label="Table of contents">' +
    renderToc(toc) +
    "</aside>"
  );
}

export function renderMobileToc(toc /*: Array<TocNode> */) /*: string */ {
  if (toc.length === 0) {
    return "";
  }
  return (
    '<details class="toc-mobile"><summary>On this page</summary>' +
    renderToc(toc) +
    "</details>"
  );
}

export function dataAttributes(
  config /*: ResolvedConfig */,
  entry /*: ContentEntry */,
) /*: string */ {
  return (
    ' data-base="' + escapeAttr(config.base) + '"' +
    ' data-route="' + escapeAttr(entry.route) + '"' +
    ' data-search-max="' + String(config.search.maxResults || 10) + '"'
  );
}

export function renderLiveReload(version /*: string */, config /*: ResolvedConfig */) /*: string */ {
  return (
    '<script>window.__VELLUM_DEV__=' + jsonForScript({ version: version, base: config.base }) + ";</script>" +
    '<script src="' + escapeAttr(withBase(config.base, "/__vellum/live.js")) + '" defer></script>'
  );
}

export function brandName(route /*: string */) /*: string */ {
  return basename(route) || humanize(route);
}

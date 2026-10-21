// @flow
/*:: import type { ContentEntry, NavItem, ResolvedConfig, SearchRecord, SidebarItem } from "../types.js"; */
import { fail } from "../util/errors.js";
import { isExternalUrl } from "../util/html.js";
import {
  cleanRoute,
  dirname,
  humanize,
  normalize,
  relative,
  stripBase,
  withoutTrailingSlash,
  withBase,
} from "../util/path.js";
import { walkFiles } from "../util/fs.js";

export function buildNav(config /*: ResolvedConfig */) /*: Array<NavItem> */ {
  return config.nav;
}

export function validateNavTargets(
  config /*: ResolvedConfig */,
  byRoute /*: Map<string, ContentEntry> */,
) /*: void */ {
  for (const item of config.nav) {
    if (isExternalUrl(item.link)) {
      continue;
    }
    const route = normalizeInternalLink(item.link, config);
    if (!byRoute.has(route)) {
      throw fail(
        "Navigation links to `" + item.link + "`, but no page has the route `" + route + "`.",
        "Fix the `nav` entry in vellum.config.js or add the missing content file.",
      );
    }
  }
}

/*::
export type ActionLink = {
  link: string,
  source: string,
};
*/

function collectActionLinks(
  config /*: ResolvedConfig */,
  entries /*: Array<ContentEntry> */,
) /*: Array<ActionLink> */ {
  const links /*: Array<ActionLink> */ = [];

  if (config.hero && config.hero.actions) {
    for (const action of config.hero.actions) {
      links.push({ link: action.link, source: "`hero.actions` in vellum.config.js" });
    }
  }
  for (const feature of config.features) {
    const link = feature.link;
    if (link) {
      links.push({ link, source: "`features` in vellum.config.js" });
    }
  }

  for (const entry of entries) {
    const hero /*: any */ = entry.frontmatter.hero;
    if (hero && Array.isArray(hero.actions)) {
      for (const action of hero.actions) {
        if (action && typeof action.link === "string") {
          links.push({ link: action.link, source: "`hero.actions` in `" + entry.relativeFile + "`" });
        }
      }
    }
    const features /*: any */ = entry.frontmatter.features;
    if (Array.isArray(features)) {
      for (const feature of features) {
        if (feature && typeof feature.link === "string") {
          links.push({ link: feature.link, source: "`features` in `" + entry.relativeFile + "`" });
        }
      }
    }
  }

  return links;
}

function isAssetLink(path /*: string */) /*: boolean */ {
  if (path === "/" || path.endsWith("/")) {
    return false;
  }
  const last = path.slice(path.lastIndexOf("/") + 1);
  return last.includes(".");
}

/**
 * Hero actions and feature cards are the main links on a landing page, so they
 * get the same route validation as `nav` and `sidebar`.
 */
export function validateActionTargets(
  config /*: ResolvedConfig */,
  entries /*: Array<ContentEntry> */,
  byRoute /*: Map<string, ContentEntry> */,
) /*: void */ {
  for (const item of collectActionLinks(config, entries)) {
    const link = item.link.trim();
    if (
      link === "" ||
      link.startsWith("#") ||
      link.startsWith("//") ||
      link.startsWith("mailto:") ||
      link.startsWith("tel:") ||
      isExternalUrl(link)
    ) {
      continue;
    }
    const path = link.split(/[?#]/)[0];
    if (!path.startsWith("/") || isAssetLink(path)) {
      continue;
    }
    const route = normalizeInternalLink(path, config);
    if (!byRoute.has(route)) {
      throw fail(
        "A call to action links to `" + link + "`, but no page has the route `" + route + "` (" +
          item.source + ").",
        "Fix the link or add the missing content file.",
      );
    }
  }
}

function normalizeInternalLink(link /*: string */, config /*: ResolvedConfig */) /*: string */ {
  const withoutBase = link.startsWith(config.base)
    ? link.slice(config.base.replace(/\/$/, "").length) || "/"
    : link;
  if (/\.html$/.test(withoutBase)) {
    return cleanRoute(withoutBase.slice(0, -".html".length), config.trailingSlash);
  }
  return cleanRoute(withoutBase, config.trailingSlash);
}

function validateSidebarItems(
  items /*: Array<SidebarItem> */,
  byRoute /*: Map<string, ContentEntry> */,
  config /*: ResolvedConfig */,
) /*: Array<SidebarItem> */ {
  return items.map((item) => {
    const next /*: SidebarItem */ = {
      label: item.label,
      collapsed: item.collapsed,
    };
    const itemLink = item.link;
    if (itemLink) {
      if (isExternalUrl(itemLink)) {
        next.link = itemLink;
      } else {
        const route = normalizeInternalLink(itemLink, config);
        if (!byRoute.has(route)) {
          throw fail(
            "Sidebar links to `" + itemLink + "`, but no page has the route `" + route + "`.",
            "Fix the link in vellum.config.js or add the missing content file.",
          );
        }
        next.link = route;
      }
    }
    if (item.items && item.items.length > 0) {
      next.items = validateSidebarItems(item.items, byRoute, config);
    }
    if (!next.link && (!next.items || next.items.length === 0)) {
      throw fail(
        "Sidebar group `" + item.label + "` has no link and no items.",
        "Add a `link` or nested `items` in vellum.config.js.",
      );
    }
    return next;
  });
}

export function buildSidebar(
  config /*: ResolvedConfig */,
  entries /*: Array<ContentEntry> */,
  byRoute /*: Map<string, ContentEntry> */,
) /*: Array<SidebarItem> */ {
  if (config.sidebar !== "auto") {
    return validateSidebarItems(config.sidebar, byRoute, config);
  }

  const groups /*: Map<string, Array<ContentEntry>> */ = new Map();
  for (const entry of entries) {
    if (entry.sidebarHidden) {
      continue;
    }
    const existing = groups.get(entry.sidebarGroup) || [];
    existing.push(entry);
    groups.set(entry.sidebarGroup, existing);
  }

  const names = Array.from(groups.keys()).sort((a, b) => {
    if (a === "Overview") return -1;
    if (b === "Overview") return 1;
    return a < b ? -1 : a > b ? 1 : 0;
  });

  const sidebar /*: Array<SidebarItem> */ = [];
  for (const name of names) {
    const groupEntries = (groups.get(name) || []).slice();
    groupEntries.sort((a, b) => {
      if (a.sidebarOrder !== b.sidebarOrder) {
        return a.sidebarOrder - b.sidebarOrder;
      }
      return a.sidebarLabel < b.sidebarLabel ? -1 : a.sidebarLabel > b.sidebarLabel ? 1 : 0;
    });
    sidebar.push({
      label: name,
      items: groupEntries.map((entry) => ({
        label: entry.sidebarLabel,
        link: entry.route,
      })),
    });
  }
  return sidebar;
}

export function flattenSidebar(items /*: Array<SidebarItem> */) /*: Array<{ label: string, link: string }> */ {
  const links /*: Array<{ label: string, link: string }> */ = [];
  for (const item of items) {
    const itemLink = item.link;
    if (itemLink && !isExternalUrl(itemLink)) {
      links.push({ label: item.label, link: itemLink });
    }
    const children = item.items;
    if (children) {
      for (const child of flattenSidebar(children)) {
        links.push(child);
      }
    }
  }
  return links;
}

export function prevNext(
  entries /*: Array<ContentEntry> */,
  sidebar /*: Array<SidebarItem> */,
  route /*: string */,
  byRoute /*: Map<string, ContentEntry> */,
) /*: { prev: ContentEntry | null, next: ContentEntry | null } */ {
  const flat = flattenSidebar(sidebar);
  const ordered /*: Array<ContentEntry> */ = [];
  const seen /*: Set<string> */ = new Set();
  for (const item of flat) {
    const entry = byRoute.get(item.link);
    if (entry && !seen.has(entry.route)) {
      ordered.push(entry);
      seen.add(entry.route);
    }
  }
  const source = ordered.length > 0 ? ordered : entries;
  const index = source.findIndex((entry) => entry.route === route);
  if (index < 0) {
    return { prev: null, next: null };
  }
  return {
    prev: index > 0 ? source[index - 1] : null,
    next: index + 1 < source.length ? source[index + 1] : null,
  };
}

/*::
export type Breadcrumb = {
  label: string,
  link: string | null,
};
*/

export function buildBreadcrumbs(
  entry /*: ContentEntry */,
  byRoute /*: Map<string, ContentEntry> */,
  config /*: ResolvedConfig */,
) /*: Array<Breadcrumb> */ {
  if (entry.route === "/") {
    return [];
  }
  const crumbs /*: Array<Breadcrumb> */ = [{ label: "Home", link: "/" }];
  const segments = entry.route.split("/").filter(Boolean);
  for (let index = 0; index < segments.length - 1; index += 1) {
    const route = cleanRoute("/" + segments.slice(0, index + 1).join("/"), config.trailingSlash);
    const target = byRoute.get(route);
    crumbs.push({
      label: target ? target.title : humanize(segments[index]),
      link: target ? route : null,
    });
  }
  crumbs.push({ label: entry.title, link: null });
  return crumbs;
}

export function buildSearchIndex(
  entries /*: Array<ContentEntry> */,
  config /*: ResolvedConfig */,
) /*: Array<SearchRecord> */ {
  return entries.map((entry) => {
    const headings = entry.headings
      .filter((heading) => heading.level >= 2 && heading.text)
      .map((heading) => heading.text);
    return {
      title: entry.title,
      description: entry.description,
      route: withBase(config.base, entry.route),
      headings,
      text: entry.bodyText.length > 2400 ? entry.bodyText.slice(0, 2400) : entry.bodyText,
    };
  });
}

function resolveRelativeHref(sourceFile /*: string */, href /*: string */) /*: string */ {
  const sourceDirectory = dirname(sourceFile);
  const segments /*: Array<string> */ =
    sourceDirectory === "." ? [] : sourceDirectory.split("/").filter(Boolean);
  for (const segment of href.split("/")) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      segments.pop();
    } else {
      segments.push(segment);
    }
  }
  return "/" + segments.join("/");
}

function decodePath(value /*: string */) /*: string */ {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

/*::
export type LinkIssue = {
  file: string,
  href: string,
  message: string,
};
*/

export function checkLinks(
  entries /*: Array<ContentEntry> */,
  config /*: ResolvedConfig */,
) /*: Array<LinkIssue> */ {
  const routes /*: Set<string> */ = new Set();
  for (const entry of entries) {
    routes.add(entry.route);
    routes.add(withoutTrailingSlash(entry.route));
    if (entry.route !== "/") {
      routes.add(entry.route + "index.html");
    }
  }

  const staticFiles /*: Set<string> */ = new Set();
  for (const file of walkFiles(config.publicDir, { includeHidden: true })) {
    staticFiles.add(relative(config.publicDir, file).replace(/\\/g, "/"));
  }

  const issues /*: Array<LinkIssue> */ = [];
  const seen /*: Set<string> */ = new Set();

  for (const entry of entries) {
    for (const link of entry.links) {
      const href = link.href.trim();
      if (
        href === "" ||
        href.startsWith("#") ||
        href.startsWith("//") ||
        isExternalUrl(href) ||
        href.startsWith("mailto:") ||
        href.startsWith("tel:") ||
        href.startsWith("data:")
      ) {
        continue;
      }
      const key = entry.relativeFile + "::" + href;
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);

      const withoutQuery = href.split(/[?#]/)[0];
      if (!withoutQuery) {
        continue;
      }
      let path = decodePath(withoutQuery);
      if (path.startsWith(config.base)) {
        const stripped = stripBase(config.base, path);
        if (stripped === null) {
          continue;
        }
        path = stripped;
      }
      if (!path.startsWith("/")) {
        path = resolveRelativeHref(entry.relativeFile, path);
      }
      path = normalize(path);
      const relativeFile = path.replace(/^\/+/, "");

      if (staticFiles.has(relativeFile)) {
        continue;
      }

      let route = cleanRoute(path, config.trailingSlash);
      if (path.endsWith(".html")) {
        route = cleanRoute(path.slice(0, -".html".length), config.trailingSlash);
      }
      if (path.endsWith(".md") || path.endsWith(".markdown")) {
        route = cleanRoute(path.replace(/\.(md|markdown)$/, ""), config.trailingSlash);
      }

      if (
        routes.has(route) ||
        routes.has(withoutTrailingSlash(route)) ||
        routes.has(route + "index.html")
      ) {
        continue;
      }

      issues.push({
        file: entry.relativeFile,
        href,
        message:
          "Broken " + (link.kind === "image" ? "image" : "link") + " `" + href + "` in `" +
          entry.relativeFile + "` (resolved to `" + path + "`).",
      });
    }
  }

  return issues;
}

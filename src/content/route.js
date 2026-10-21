// @flow
/*:: import type { Frontmatter } from "../types.js"; */
import { fail } from "../util/errors.js";
import {
  basename,
  cleanRoute,
  extname,
  humanize,
  routeToOutputFile,
  stripExtension,
  withLeadingSlash,
} from "../util/path.js";

function rejectTraversal(route /*: string */, file /*: string */) /*: void */ {
  const segments = route.split("/");
  for (const segment of segments) {
    if (segment === "..") {
      throw fail(
        "Route for `" + file + "` escapes the site root.",
        "Use a slug without `..` segments.",
      );
    }
  }
}

/**
 * Turn a content-relative file path into a clean route without the base.
 */
export function routeForFile(
  relativeFile /*: string */,
  frontmatter /*: Frontmatter */,
  trailingSlash /*: boolean */ = true,
) /*: string */ {
  const slug = frontmatter.slug;
  let route = "";

  if (typeof slug === "string" && slug.trim() !== "") {
    route = slug.trim();
    route = stripExtension(route);
    if (!route.startsWith("/")) {
      route = "/" + route;
    }
  } else {
    const withoutExtension = stripExtension(relativeFile.replace(/\\/g, "/"));
    const name = basename(withoutExtension);
    const parent = withoutExtension.includes("/")
      ? withoutExtension.slice(0, withoutExtension.lastIndexOf("/"))
      : "";
    if (name === "index") {
      route = "/" + parent;
    } else if (parent) {
      route = "/" + parent + "/" + name;
    } else {
      route = "/" + name;
    }
  }

  rejectTraversal(route, relativeFile);
  return cleanRoute(route, trailingSlash);
}

export function outputFileForRoute(route /*: string */, trailingSlash /*: boolean */) /*: string */ {
  return routeToOutputFile(route, trailingSlash);
}

export function fallbackTitle(relativeFile /*: string */, route /*: string */, siteTitle /*: string */) /*: string */ {
  const name = basename(stripExtension(relativeFile));
  if (name.toLowerCase() === "index") {
    if (route === "/") {
      return siteTitle;
    }
    const segments = route.split("/").filter(Boolean);
    return humanize(segments[segments.length - 1] || "Documentation");
  }
  return humanize(name);
}

export function isValidRoute(route /*: string */) /*: boolean */ {
  return route.startsWith("/") && !route.includes("\\") && !route.split("/").includes("..");
}

export function normalizeRequestRoute(
  pathname /*: string */,
  trailingSlash /*: boolean */,
) /*: string */ {
  let path = pathname || "/";
  if (path.length > 1 && path.endsWith("/")) {
    path = path.replace(/\/+$/, "");
  }
  if (path === "") {
    path = "/";
  }
  if (path === "/index.html" || path === "index.html") {
    path = "/";
  } else if (path.endsWith("/index.html")) {
    path = path.slice(0, -"/index.html".length) || "/";
  } else if (path.endsWith(".html")) {
    path = path.slice(0, -".html".length) || "/";
  }
  return cleanRoute(withLeadingSlash(path), trailingSlash);
}

export function routeSegments(route /*: string */) /*: Array<string> */ {
  return route.split("/").filter(Boolean);
}

export function isContentFile(file /*: string */) /*: boolean */ {
  const ext = extname(file).toLowerCase();
  return ext === ".md" || ext === ".markdown";
}

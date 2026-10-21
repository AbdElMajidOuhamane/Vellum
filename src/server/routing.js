// @flow
/*:: import type { ContentEntry, ResolvedConfig } from "../types.js"; */
import { isDirectory, isFile, safeJoin } from "../util/fs.js";
import { cleanRoute, stripBase, withLeadingSlash } from "../util/path.js";
import { normalizeRequestRoute } from "../content/route.js";

/*::
export type RouteResult =
  | {| type: "page", entry: ContentEntry |}
  | {| type: "redirect", location: string, status: number |}
  | {| type: "not-found" |}
  | {| type: "version" |}
  | {| type: "live-js" |}
  | {| type: "search-json" |}
  | {| type: "theme-css" |}
  | {| type: "theme-js" |}
  | {| type: "asset", file: string |};
*/

function decodePath(value /*: string */) /*: string */ {
  try {
    return decodeURIComponent(value);
  } catch (_error) {
    return value;
  }
}

function publicFile(
  config /*: ResolvedConfig */,
  requestPath /*: string */,
) /*: string | null */ {
  let target;
  try {
    target = safeJoin(config.publicDir, decodePath(requestPath));
  } catch (_error) {
    return null;
  }
  if (isFile(target)) {
    return target;
  }
  if (isDirectory(target)) {
    const index = target + "/index.html";
    if (isFile(index)) {
      return index;
    }
  }
  return null;
}

export function routeRequest(
  pathname /*: string */,
  config /*: ResolvedConfig */,
  byRoute /*: Map<string, ContentEntry> */,
) /*: RouteResult */ {
  const stripped = stripBase(config.base, pathname);
  if (stripped === null) {
    if (pathname === "/" && config.base !== "/") {
      return { type: "redirect", location: config.base, status: 302 };
    }
    return { type: "not-found" };
  }

  const path = stripped === "" ? "/" : stripped;

  if (path === "/__vellum/version") {
    return { type: "version" };
  }
  if (path === "/__vellum/live.js") {
    return { type: "live-js" };
  }
  if (path === "/assets/vellum.css") {
    return { type: "theme-css" };
  }
  if (path === "/assets/vellum.js") {
    return { type: "theme-js" };
  }
  if (path === "/search-index.json" && config.search.enabled) {
    return { type: "search-json" };
  }

  const normalized = normalizeRequestRoute(decodePath(path), config.trailingSlash);
  const entry = byRoute.get(normalized);
  if (entry) {
    if (decodePath(path) !== entry.route) {
      return {
        type: "redirect",
        location: config.base + cleanRoute(entry.route, config.trailingSlash).replace(/^\//, ""),
        status: 301,
      };
    }
    return { type: "page", entry };
  }

  const file = publicFile(config, path);
  if (file) {
    return { type: "asset", file };
  }

  return { type: "not-found" };
}

export function locationForRoute(config /*: ResolvedConfig */, route /*: string */) /*: string */ {
  return config.base + withLeadingSlash(route).replace(/^\//, "");
}

// @flow

/**
 * Small POSIX path toolkit. Fairyfly exposes no `node:path`, and
 * `import.meta.url` is empty, so the framework carries its own path logic.
 * Windows drive prefixes are recognized only so error messages stay sane;
 * Fairyfly itself is POSIX-only.
 */

export function toPosix(value /*: string */) /*: string */ {
  return value.replace(/\\/g, "/");
}

export function isAbsolute(value /*: string */) /*: boolean */ {
  const path = toPosix(value);
  return path.startsWith("/") || /^[A-Za-z]:\//.test(path);
}

export function normalize(value /*: string */) /*: string */ {
  let path = toPosix(value);
  const drive = /^([A-Za-z]:)(\/|$)/.exec(path);
  const prefix = drive ? drive[1] : "";
  if (drive) {
    path = path.slice(prefix.length);
  }
  const absolute = path.startsWith("/");
  const segments = path.split("/");
  const out = [];

  for (const segment of segments) {
    if (segment === "" || segment === ".") {
      continue;
    }
    if (segment === "..") {
      if (out.length > 0 && out[out.length - 1] !== "..") {
        out.pop();
      } else if (!absolute) {
        out.push("..");
      }
      continue;
    }
    out.push(segment);
  }

  let result = out.join("/");
  if (absolute) {
    result = "/" + result;
  }
  if (prefix) {
    result = prefix + (result || "/");
  }
  if (result === "") {
    return absolute ? "/" : ".";
  }
  return result;
}

export function join(parts /*: Array<string> */) /*: string */ {
  const filtered = parts.filter((part) => part !== "");
  if (filtered.length === 0) {
    return ".";
  }
  return normalize(filtered.join("/"));
}

export function resolve(
  from /*: string */,
  parts /*: Array<string> */,
) /*: string */ {
  let current = normalize(from);
  for (const part of parts) {
    if (isAbsolute(part)) {
      current = normalize(part);
    } else {
      current = join([current, part]);
    }
  }
  return current;
}

export function dirname(value /*: string */) /*: string */ {
  const path = normalize(value);
  if (path === "/" || /^[A-Za-z]:\/$/.test(path)) {
    return path;
  }
  const index = path.lastIndexOf("/");
  if (index < 0) {
    return ".";
  }
  if (index === 0) {
    return "/";
  }
  return path.slice(0, index);
}

export function basename(value /*: string */, ext /*: string */ = "") /*: string */ {
  const path = normalize(value);
  const index = path.lastIndexOf("/");
  let name = index >= 0 ? path.slice(index + 1) : path;
  if (name === "" && path === "/") {
    name = "/";
  }
  if (ext && name.endsWith(ext) && name !== ext) {
    name = name.slice(0, -ext.length);
  }
  return name;
}

export function extname(value /*: string */) /*: string */ {
  const name = basename(value);
  const index = name.lastIndexOf(".");
  if (index <= 0) {
    return "";
  }
  return name.slice(index);
}

export function stripExtension(value /*: string */) /*: string */ {
  const normalized = normalize(value);
  const ext = extname(normalized);
  return ext ? normalized.slice(0, -ext.length) : normalized;
}

export function relative(from /*: string */, to /*: string */) /*: string */ {
  const fromParts = normalize(from).split("/").filter(Boolean);
  const toParts = normalize(to).split("/").filter(Boolean);
  let shared = 0;
  while (
    shared < fromParts.length &&
    shared < toParts.length &&
    fromParts[shared] === toParts[shared]
  ) {
    shared += 1;
  }
  const up /*: Array<string> */ = [];
  for (let index = shared; index < fromParts.length; index += 1) {
    up.push("..");
  }
  const rest = toParts.slice(shared);
  const result = up.concat(rest).join("/");
  return result || ".";
}

export function isWithin(root /*: string */, candidate /*: string */) /*: boolean */ {
  const rootPath = normalize(root);
  const target = normalize(candidate);
  if (rootPath === target) {
    return true;
  }
  const rel = relative(rootPath, target);
  return rel !== ".." && !rel.startsWith("../") && !isAbsolute(rel);
}

export function withLeadingSlash(value /*: string */) /*: string */ {
  return value.startsWith("/") ? value : "/" + value;
}

export function withTrailingSlash(value /*: string */) /*: string */ {
  if (value === "/") {
    return value;
  }
  return value.endsWith("/") ? value : value + "/";
}

export function withoutTrailingSlash(value /*: string */) /*: string */ {
  if (value === "/") {
    return value;
  }
  return value.replace(/\/+$/, "") || "/";
}

export function normalizeBase(value /*: string */) /*: string */ {
  if (!value || value === "/") {
    return "/";
  }
  let base = withLeadingSlash(toPosix(value));
  base = withTrailingSlash(base);
  base = base.replace(/\/{2,}/g, "/");
  return base;
}

export function cleanRoute(value /*: string */, trailingSlash /*: boolean */ = true) /*: string */ {
  if (!value) {
    return "/";
  }
  let route = withLeadingSlash(toPosix(value));
  route = route.replace(/\/{2,}/g, "/");
  if (route === "/") {
    return "/";
  }
  route = withoutTrailingSlash(route);
  return trailingSlash ? route + "/" : route;
}

export function withBase(base /*: string */, route /*: string */) /*: string */ {
  if (
    route.startsWith("http://") ||
    route.startsWith("https://") ||
    route.startsWith("mailto:") ||
    route.startsWith("tel:") ||
    route.startsWith("#") ||
    route.startsWith("//")
  ) {
    return route;
  }
  const normalizedBase = normalizeBase(base);
  if (normalizedBase === "/") {
    return withLeadingSlash(route || "/");
  }
  if (route === "/" || route === "") {
    return normalizedBase;
  }
  // Links copied from a site that already uses this base (or config links
  // written with the base) must not be prefixed twice.
  if (route === normalizedBase || route.startsWith(normalizedBase)) {
    return route;
  }
  if (route === withoutTrailingSlash(normalizedBase)) {
    return normalizedBase;
  }
  return normalizedBase.replace(/\/$/, "") + withLeadingSlash(route);
}

export function stripBase(base /*: string */, pathname /*: string */) /*: string | null */ {
  const normalizedBase = normalizeBase(base);
  if (normalizedBase === "/") {
    return withLeadingSlash(pathname);
  }
  const withoutSlash = normalizedBase.replace(/\/$/, "");
  if (pathname === withoutSlash) {
    return "/";
  }
  if (pathname.startsWith(normalizedBase)) {
    return "/" + pathname.slice(normalizedBase.length);
  }
  return null;
}

export function encodeRoutePath(route /*: string */) /*: string */ {
  return route
    .split("/")
    .map((segment) => {
      try {
        return encodeURIComponent(decodeURIComponent(segment));
      } catch (_error) {
        return encodeURIComponent(segment);
      }
    })
    .join("/");
}

export function humanize(value /*: string */) /*: string */ {
  const words = value
    .replace(/\.[^.]+$/, "")
    .replace(/[-_]+/g, " ")
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  return words
    .map((word) => {
      if (word.length <= 3 && word === word.toUpperCase()) {
        return word;
      }
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

export function routeToOutputFile(
  route /*: string */,
  trailingSlash /*: boolean */ = true,
) /*: string */ {
  const clean = cleanRoute(route, trailingSlash);
  if (clean === "/") {
    return "index.html";
  }
  const path = clean.replace(/^\//, "");
  return trailingSlash ? path + "index.html" : path + ".html";
}

export function outputFileToRoute(outputFile /*: string */) /*: string */ {
  const path = toPosix(outputFile).replace(/^\/+/, "");
  if (path === "index.html" || path === "") {
    return "/";
  }
  if (path.endsWith("/index.html")) {
    return "/" + path.slice(0, -"index.html".length);
  }
  if (path.endsWith(".html")) {
    return "/" + path.slice(0, -".html".length);
  }
  return "/" + path;
}

export function isExternalUrl(value /*: string */) /*: boolean */ {
  return (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("mailto:") ||
    value.startsWith("tel:")
  );
}

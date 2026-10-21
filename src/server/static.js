// @flow
import { fail } from "../util/errors.js";
import { isDirectory, isFile, readBytes, safeJoin } from "../util/fs.js";
import { mimeType } from "../util/mime.js";
import { join } from "../util/path.js";

/*::
export type FileResponseOptions = {
  status?: number,
  cache?: string,
  head?: boolean,
};
*/

export function fileResponse(
  file /*: string */,
  options /*: FileResponseOptions */ = {},
) /*: any */ {
  const bytes = readBytes(file);
  if (bytes === null) {
    return null;
  }
  const status = options.status || 200;
  const headers = {
    "content-type": mimeType(file),
    "cache-control": options.cache || "no-cache",
    "x-content-type-options": "nosniff",
  };
  if (options.head === true) {
    return new Response(null, { status, headers });
  }
  return new Response(bytes, { status, headers });
}

/**
 * Resolve a URL path to a real file inside `root`, trying directory indexes
 * and the `.html` sibling used when trailingSlash is false.
 */
export function findStaticFile(
  root /*: string */,
  requestPath /*: string */,
) /*: string | null */ {
  let target;
  try {
    target = safeJoin(root, requestPath);
  } catch (_error) {
    return null;
  }
  if (isFile(target)) {
    return target;
  }
  if (isDirectory(target)) {
    const index = join([target, "index.html"]);
    if (isFile(index)) {
      return index;
    }
  }
  if (isFile(target + ".html")) {
    return target + ".html";
  }
  return null;
}

export function requireDirectory(directory /*: string */, label /*: string */) /*: void */ {
  if (!isDirectory(directory)) {
    throw fail(
      label + " `" + directory + "` does not exist.",
      "Run `vellum build` first, or check the path in vellum.config.js.",
    );
  }
}

export function redirectResponse(location /*: string */, status /*: number */ = 302) /*: any */ {
  return new Response(null, {
    status,
    headers: {
      location,
      "cache-control": "no-store",
    },
  });
}

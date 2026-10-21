// @flow
/*:: import type { Logger, ResolvedConfig } from "../types.js"; */
import { createLogger } from "../util/log.js";
import { fail } from "../util/errors.js";
import { isDirectory, isFile } from "../util/fs.js";
import { join, stripBase } from "../util/path.js";
import { fileResponse, findStaticFile, redirectResponse } from "./static.js";

/*::
export type PreviewOptions = {
  port?: number,
  logger?: Logger,
};
*/

/*::
export type PreviewHandle = {
  port: number,
  url: string,
  stop: () => void,
};
*/

function securityHeaders(extra /*: { [string]: string } */ = {}) /*: { [string]: string } */ {
  const result /*: { [string]: string } */ = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
  };
  for (const key of Object.keys(extra)) {
    result[key] = extra[key];
  }
  return result;
}

export function createPreviewServer(
  config /*: ResolvedConfig */,
  options /*: PreviewOptions */ = {},
) /*: PreviewHandle */ {
  if (!isDirectory(config.outDir)) {
    throw fail(
      "Build output `" + config.outDir + "` does not exist.",
      "Run `vellum build` before `vellum preview`.",
    );
  }
  const logger = options.logger || createLogger();
  const port = options.port || config.dev.port;

  const handler = (url /*: string */, method /*: string */) /*: any */ => {
    const requestMethod = String(method || "GET").toUpperCase();
    const head = requestMethod === "HEAD";
    if (requestMethod !== "GET" && requestMethod !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: securityHeaders({ allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }),
      });
    }

    let pathname = "/";
    try {
      pathname = new URL(url, "http://localhost").pathname || "/";
    } catch (_error) {
      pathname = "/";
    }
    const stripped = stripBase(config.base, pathname);
    if (stripped === null) {
      if (pathname === "/" && config.base !== "/") {
        return redirectResponse(config.base, 302);
      }
      return new Response("Not found", {
        status: 404,
        headers: securityHeaders({ "content-type": "text/plain; charset=utf-8" }),
      });
    }

    const requestPath = stripped === "" ? "/" : stripped;
    const file = findStaticFile(config.outDir, requestPath);
    if (file) {
      const response = fileResponse(file, {
        cache: file.endsWith(".html") ? "no-cache" : "public, max-age=3600",
        head,
      });
      if (response) {
        return response;
      }
    }

    const notFound = join([config.outDir, "404.html"]);
    if (isFile(notFound)) {
      const response = fileResponse(notFound, { status: 404, cache: "no-cache", head });
      if (response) {
        return response;
      }
    }
    return new Response("Not found", {
      status: 404,
      headers: securityHeaders({ "content-type": "text/plain; charset=utf-8" }),
    });
  };

  http.serve({ port }, handler);
  const url = "http://localhost:" + String(port) + config.base;
  logger.info("\u2713 Vellum preview listening on " + url);
  logger.info("  \u2022 serving " + config.outDir);

  return {
    port,
    url,
    stop: () => {
      /* Fairyfly does not expose a server close API; Ctrl-C stops the process. */
    },
  };
}

// @flow
/*:: import type { ContentEntry, Logger, RenderContext, ResolvedConfig, SidebarItem } from "../types.js"; */
import { buildToc } from "../content/toc.js";
import { collectContent } from "../content/collect.js";
import { buildNav, buildSearchIndex, buildSidebar, prevNext } from "../content/site.js";
import { renderPage } from "../render/layout.js";
import { notFoundEntry, renderErrorPage, renderNotFound } from "../render/page.js";
import { renderLiveReload } from "../render/components.js";
import { builtinAssets, readClientJs, readThemeCss } from "../build/assets.js";
import { VERSION } from "../version.js";
import { createLogger } from "../util/log.js";
import { errorMessage, errorStack } from "../util/errors.js";
import { join, withBase } from "../util/path.js";
import { fileResponse } from "./static.js";
import { routeRequest } from "./routing.js";
import { createWatcher } from "./watcher.js";
import { LIVE_CLIENT } from "./live-client.js";

/*::
export type DevServerHandle = {
  port: number,
  url: string,
  stop: () => void,
};
*/

function headers(extra /*: { [string]: string } */ = {}) /*: { [string]: string } */ {
  const result /*: { [string]: string } */ = {
    "x-content-type-options": "nosniff",
    "referrer-policy": "strict-origin-when-cross-origin",
    "cache-control": "no-store",
  };
  for (const key of Object.keys(extra)) {
    result[key] = extra[key];
  }
  return result;
}

function htmlResponse(
  body /*: string */,
  status /*: number */ = 200,
  head /*: boolean */ = false,
) /*: any */ {
  return new Response(head ? null : body, {
    status,
    headers: headers({ "content-type": "text/html; charset=utf-8" }),
  });
}

function textResponse(
  body /*: string */,
  contentType /*: string */,
  status /*: number */ = 200,
  head /*: boolean */ = false,
) /*: any */ {
  return new Response(head ? null : body, {
    status,
    headers: headers({ "content-type": contentType }),
  });
}

export function createDevServer(
  config /*: ResolvedConfig */,
  frameworkRoot /*: string */,
  logger /*: Logger */ = createLogger(),
) /*: DevServerHandle */ {
  let entries /*: Array<ContentEntry> */ = [];
  let byRoute /*: Map<string, ContentEntry> */ = new Map();
  let sidebar /*: Array<SidebarItem> */ = [];
  let nav = buildNav(config);
  let modelError /*: mixed */ = null;
  let modelDirty = true;

  const themeFile = join([frameworkRoot, "src/theme/vellum.css"]);
  const clientFile = join([frameworkRoot, "src/theme/client.js"]);
  const watcher = createWatcher({
    roots: [config.srcDir],
    extensions: [".md", ".markdown"],
    extraFiles: [themeFile, clientFile].concat(config.theme.customCss || []),
    interval: config.dev.watchInterval,
  });

  const assets = builtinAssets(config);

  function refreshModel() /*: void */ {
    try {
      const collection = collectContent(config, { includeDrafts: true });
      entries = collection.entries;
      byRoute = collection.byRoute;
      sidebar = buildSidebar(config, entries, byRoute);
      nav = buildNav(config);
      modelError = null;
      modelDirty = false;
    } catch (error) {
      modelError = error;
      modelDirty = true;
      throw error;
    }
  }

  function ensureModel() /*: void */ {
    if (modelDirty || modelError) {
      refreshModel();
    }
  }

  function pageResponse(entry /*: ContentEntry */, head /*: boolean */) /*: any */ {
    const toc = buildToc(entry.headings);
    const adjacent = prevNext(entries, sidebar, entry.route, byRoute);
    const context /*: RenderContext */ = {
      config,
      entry,
      entries,
      sidebar,
      nav,
      toc,
      prev: adjacent.prev,
      next: adjacent.next,
      assets,
      dev: config.dev.liveReload,
      version: watcher.getVersion() || VERSION,
    };
    return htmlResponse(renderPage(context), 200, head);
  }

  function notFoundResponse(head /*: boolean */) /*: any */ {
    const context /*: RenderContext */ = {
      config,
      entry: notFoundEntry(config),
      entries,
      sidebar,
      nav,
      toc: [],
      prev: null,
      next: null,
      assets,
      dev: config.dev.liveReload,
      version: watcher.getVersion() || VERSION,
    };
    return htmlResponse(renderNotFound(context), 404, head);
  }

  function errorResponse(error /*: mixed */, head /*: boolean */) /*: any */ {
    logger.error(errorMessage(error));
    logger.debug(errorStack(error));
    const page = renderErrorPage(error, { config, status: 500 });
    const body = config.dev.liveReload
      ? page.replace("</body>", renderLiveReload(watcher.getVersion(), config) + "</body>")
      : page;
    return htmlResponse(body, 500, head);
  }

  const handler = (url /*: string */, method /*: string */, body /*: string */) /*: any */ => {
    const requestMethod = String(method || "GET").toUpperCase();
    const head = requestMethod === "HEAD";
    if (requestMethod !== "GET" && requestMethod !== "HEAD") {
      return new Response("Method not allowed", {
        status: 405,
        headers: headers({ allow: "GET, HEAD", "content-type": "text/plain; charset=utf-8" }),
      });
    }

    let pathname = "/";
    try {
      const parsed = new URL(url, "http://localhost");
      pathname = parsed.pathname || "/";
    } catch (_error) {
      return textResponse("Bad request", "text/plain; charset=utf-8", 400, head);
    }

    try {
      // The live-reload client must be able to read the version even while the
      // content model is broken; otherwise it cannot recover automatically.
      if (pathname === withBase(config.base, "/__vellum/version")) {
        return head
          ? new Response(null, { status: 200, headers: headers() })
          : Response.json({ version: watcher.getVersion() }, { headers: headers() });
      }

      if (watcher.consumeDirty()) {
        modelDirty = true;
      }
      ensureModel();

      const resolved = routeRequest(pathname, config, byRoute);
      if (resolved.type === "redirect") {
        return new Response(null, {
          status: resolved.status,
          headers: headers({ location: resolved.location }),
        });
      }
      if (resolved.type === "page") {
        return pageResponse(resolved.entry, head);
      }
      if (resolved.type === "not-found") {
        return notFoundResponse(head);
      }
      if (resolved.type === "version") {
        if (head) {
          return new Response(null, { status: 200, headers: headers() });
        }
        return Response.json({ version: watcher.getVersion() }, { headers: headers() });
      }
      if (resolved.type === "live-js") {
        return textResponse(LIVE_CLIENT, "text/javascript; charset=utf-8", 200, head);
      }
      if (resolved.type === "theme-css") {
        return textResponse(readThemeCss(config, frameworkRoot), "text/css; charset=utf-8", 200, head);
      }
      if (resolved.type === "theme-js") {
        return textResponse(readClientJs(frameworkRoot), "text/javascript; charset=utf-8", 200, head);
      }
      if (resolved.type === "search-json") {
        return textResponse(
          JSON.stringify(buildSearchIndex(entries, config)),
          "application/json; charset=utf-8",
          200,
          head,
        );
      }
      if (resolved.type === "asset") {
        const response = fileResponse(resolved.file, { cache: "no-store", head });
        return response || notFoundResponse(head);
      }
      return notFoundResponse(head);
    } catch (error) {
      return errorResponse(error, head);
    }
  };

  watcher.start();
  http.serve({ port: config.dev.port }, handler);

  const url = "http://localhost:" + String(config.dev.port) + config.base;
  logger.info("\u2713 Vellum dev server listening on " + url);
  logger.info("  \u2022 watching Markdown and theme files (polling, no fs.watch)");
  if (modelError) {
    logger.error(String(errorMessage(modelError)));
  }

  return {
    port: config.dev.port,
    url,
    stop: () => {
      watcher.stop();
    },
  };
}

export function devUrl(config /*: ResolvedConfig */) /*: string */ {
  return "http://localhost:" + String(config.dev.port) + withBase(config.base, "/");
}

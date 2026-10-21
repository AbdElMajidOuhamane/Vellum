// @flow
/*:: import type { BuildResult, Logger, RenderContext, ResolvedConfig } from "../types.js"; */
import { collectContent } from "../content/collect.js";
import { buildToc } from "../content/toc.js";
import { buildNav, buildSearchIndex, buildSidebar, prevNext, validateActionTargets, validateNavTargets } from "../content/site.js";
import { renderPage } from "../render/layout.js";
import { renderNotFound } from "../render/page.js";
import { VERSION } from "../version.js";
import { fail } from "../util/errors.js";
import {
  clearDir,
  copyDir,
  ensureDir,
  exists,
  isDirectory,
  writeText,
} from "../util/fs.js";
import { join } from "../util/path.js";
import { formatDuration, plural } from "../util/log.js";
import { createLogger } from "../util/log.js";
import { resolveAssets } from "./rsbuild-adapter.js";
import { buildRobots, buildSitemap } from "./sitemap.js";

/*::
export type BuildOptions = {
  frameworkRoot: string,
  logger?: Logger,
  includeDrafts?: boolean,
};
*/

export async function buildSite(
  config /*: ResolvedConfig */,
  options /*: BuildOptions */,
) /*: Promise<BuildResult> */ {
  const logger = options.logger || createLogger();
  const started = performance.now();

  if (!isDirectory(config.srcDir)) {
    throw fail(
      "Content directory `" + config.srcDir + "` does not exist.",
      "Create it, or set `srcDir` in vellum.config.js to the folder containing your Markdown.",
    );
  }

  const collection = collectContent(config, {
    includeDrafts: options.includeDrafts === true || config.drafts,
  });
  if (collection.entries.length === 0) {
    throw fail(
      "No pages were found in `" + config.srcDir + "`.",
      "Add a Markdown file such as `index.md`, or check that frontmatter `draft: true` is not excluding every page.",
    );
  }

  const sidebar = buildSidebar(config, collection.entries, collection.byRoute);
  validateNavTargets(config, collection.byRoute);
  validateActionTargets(config, collection.entries, collection.byRoute);
  const nav = buildNav(config);
  const warnings = collection.warnings.slice();

  clearDir(config.outDir);
  ensureDir(config.outDir);

  const publicFiles = await copyDir(config.publicDir, config.outDir, { includeHidden: true });
  logger.debug("copied " + String(publicFiles.length) + " public files");

  const resolved = await resolveAssets(config, options.frameworkRoot, logger);
  const assets = resolved.assets;

  for (const entry of collection.entries) {
    const toc = buildToc(entry.headings);
    const adjacent = prevNext(collection.entries, sidebar, entry.route, collection.byRoute);
    const context /*: RenderContext */ = {
      config,
      entry,
      entries: collection.entries,
      sidebar,
      nav,
      toc,
      prev: adjacent.prev,
      next: adjacent.next,
      assets,
      dev: false,
      version: VERSION,
    };
    const html = renderPage(context);
    writeText(join([config.outDir, entry.outputFile]), html);
  }

  const notFound = renderNotFound({
    config,
    entry: collection.entries[0],
    entries: collection.entries,
    sidebar,
    nav,
    toc: [],
    prev: null,
    next: null,
    assets,
    dev: false,
    version: VERSION,
  });
  writeText(join([config.outDir, "404.html"]), notFound);

  if (config.search.enabled) {
    const records = buildSearchIndex(collection.entries, config);
    writeText(join([config.outDir, "search-index.json"]), JSON.stringify(records));
  }

  const sitemap = buildSitemap(collection.entries, config);
  if (sitemap) {
    writeText(join([config.outDir, "sitemap.xml"]), sitemap);
  }
  if (!exists(join([config.outDir, "robots.txt"]))) {
    writeText(join([config.outDir, "robots.txt"]), buildRobots(config));
  }

  for (const warning of warnings) {
    logger.warn(warning);
  }

  const durationMs = performance.now() - started;
  logger.info(
    "\u2713 Built " + String(collection.entries.length) + " " +
    plural(collection.entries.length, "page") + " to `" +
    config.outDir + "` in " + formatDuration(durationMs) + ".",
  );
  logger.info("  \u2022 bundler: " + resolved.bundler);

  return {
    pages: collection.entries.length,
    assets: assets.css.concat(assets.js),
    outDir: config.outDir,
    durationMs,
    warnings,
    bundler: resolved.bundler,
  };
}

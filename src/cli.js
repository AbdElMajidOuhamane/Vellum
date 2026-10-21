// @flow
/*:: import type { CliOptions, Logger, ResolvedConfig } from "./types.js"; */
import { parseCliArgs, usage } from "./cli/flags.js";
import { scaffoldProject } from "./cli/new.js";
import { buildSite } from "./build/build.js";
import { loadConfig } from "./config.js";
import { collectContent } from "./content/collect.js";
import { buildSidebar, checkLinks, validateActionTargets, validateNavTargets } from "./content/site.js";
import { createDevServer } from "./server/dev.js";
import { createPreviewServer } from "./server/preview.js";
import { fail } from "./util/errors.js";
import { createLogger, plural } from "./util/log.js";
import { isAbsolute, isWithin, join, normalize } from "./util/path.js";
import { VERSION } from "./version.js";

/*::
export type MainOptions = {
  frameworkRoot: string,
};
*/

const SILENT_LOGGER /*: Logger */ = {
  quiet: true,
  info: (_message /*: string */) => {},
  step: (_message /*: string */) => {},
  warn: (_message /*: string */) => {},
  error: (_message /*: string */) => {},
  debug: (_message /*: string */) => {},
};

function applyOverrides(
  config /*: ResolvedConfig */,
  options /*: CliOptions */,
) /*: ResolvedConfig */ {
  const next /*: ResolvedConfig */ = {
    ...config,
    theme: { ...config.theme },
    markdown: { ...config.markdown },
    search: { ...config.search },
    bundler: { ...config.bundler },
    dev: { ...config.dev },
  };

  if (options.outDir) {
    const outDir = isAbsolute(options.outDir)
      ? normalize(options.outDir)
      : join([config.root, options.outDir]);
    if (outDir === config.root || isWithin(config.srcDir, outDir)) {
      throw fail(
        "`--out` must not point at the project root or inside the content directory.",
        "Choose a separate output folder such as `dist`.",
      );
    }
    next.outDir = outDir;
  }
  if (options.port) {
    next.dev.port = options.port;
  }
  if (options.bundler) {
    next.bundler.provider = options.bundler;
  }
  if (options.search === false) {
    next.search.enabled = false;
  }
  if (options.drafts) {
    next.drafts = true;
  }
  return next;
}

async function runCheck(
  config /*: ResolvedConfig */,
  options /*: CliOptions */,
  logger /*: Logger */,
) /*: Promise<void> */ {
  const collection = collectContent(config, { includeDrafts: true });
  buildSidebar(config, collection.entries, collection.byRoute);
  validateNavTargets(config, collection.byRoute);
  validateActionTargets(config, collection.entries, collection.byRoute);
  const issues = checkLinks(collection.entries, config);
  const linkCount = collection.entries.reduce((total, entry) => total + entry.links.length, 0);
  const drafts = collection.entries.filter((entry) => entry.draft).length;

  if (options.json) {
    console.log(
      JSON.stringify({
        ok: issues.length === 0,
        pages: collection.entries.length,
        drafts,
        links: linkCount,
        issues,
        warnings: collection.warnings,
      }),
    );
    if (issues.length > 0) {
      process.exit(1);
    }
    return;
  }

  for (const warning of collection.warnings) {
    logger.warn(warning);
  }
  if (issues.length > 0) {
    for (const issue of issues) {
      logger.error(issue.message);
    }
    throw fail(
      "Found " + String(issues.length) + " broken " + plural(issues.length, "link") + ".",
      "Fix the reported links, or add the missing pages.",
    );
  }

  logger.info(
    "\u2713 Checked " + String(collection.entries.length) + " " +
      plural(collection.entries.length, "page") + " and " + String(linkCount) + " " +
      plural(linkCount, "link") + (drafts ? " (" + String(drafts) + " " + plural(drafts, "draft") + ")" : "") +
      "; no issues.",
  );
}

export async function main(
  argv /*: Array<string> */,
  options /*: MainOptions */,
) /*: Promise<void> */ {
  const parsed = parseCliArgs(argv);

  if (parsed.command === "version") {
    console.log("vellum " + VERSION);
    return;
  }
  if (parsed.command === "help") {
    console.log(usage());
    return;
  }

  const logger = createLogger({ quiet: parsed.quiet, verbose: parsed.verbose });
  const userCwd = process.env.VELLUM_CWD || process.cwd();

  if (parsed.command === "new") {
    // The launcher starts at the package root for module resolution; `new`
    // resolves its target and --title relative to where the user invoked it.
    process.chdir(userCwd);
    scaffoldProject({
      directory: parsed.positional[0] || ".",
      title: parsed.title,
      force: parsed.force,
      logger,
    });
    return;
  }

  const config = await loadConfig({
    root: parsed.root,
    configPath: parsed.configPath,
    cwd: userCwd,
    frameworkRoot: options.frameworkRoot,
  });
  const effective = applyOverrides(config, parsed);
  logger.debug("config: " + effective.configPath);

  if (parsed.command === "dev") {
    createDevServer(effective, options.frameworkRoot, logger);
    return;
  }

  if (parsed.command === "preview") {
    createPreviewServer(effective, { port: parsed.port || undefined, logger });
    return;
  }

  if (parsed.command === "build") {
    const result = await buildSite(effective, {
      frameworkRoot: options.frameworkRoot,
      logger: parsed.json ? SILENT_LOGGER : logger,
      includeDrafts: parsed.drafts,
    });
    if (parsed.json) {
      console.log(JSON.stringify(result));
    }
    return;
  }

  if (parsed.command === "check") {
    await runCheck(effective, parsed, logger);
    return;
  }

  throw fail(
    "Unknown command `" + parsed.command + "`.",
    "Run `vellum --help` to see the available commands.",
  );
}

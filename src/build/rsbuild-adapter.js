// @flow
/*:: import type { Logger, RenderAssets, ResolvedConfig } from "../types.js"; */
import { fail } from "../util/errors.js";
import { exists, ensureDir, isFile, writeText, copyFile } from "../util/fs.js";
import { dirname, join, normalize } from "../util/path.js";
import { builtinAssets, emitBuiltinAssets, themeTokensCss } from "./assets.js";

/*::
export type RsbuildDetection = {
  available: boolean,
  reason: string,
  node: string,
  packageJson: string | null,
};
*/

/*::
export type BuildWithRsbuildOptions = {
  config: ResolvedConfig,
  frameworkRoot: string,
  logger: Logger,
};
*/

function findUp(start /*: string */, relativePath /*: string */) /*: string | null */ {
  let current = normalize(start);
  for (let depth = 0; depth < 64; depth += 1) {
    const candidate = join([current, relativePath]);
    if (isFile(candidate)) {
      return candidate;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }
  return null;
}

async function nodeIsAvailable(node /*: string */) /*: Promise<boolean> */ {
  if (typeof child_process === "undefined" || !child_process) {
    return false;
  }
  try {
    const child = child_process.spawn(node, ["--version"]);
    const result = await child.wait();
    return result.code === 0;
  } catch (_error) {
    return false;
  }
}

export async function detectRsbuild(
  config /*: ResolvedConfig */,
) /*: Promise<RsbuildDetection> */ {
  const node = config.bundler.node || "node";
  const packageJson = findUp(config.root, "node_modules/@rsbuild/core/package.json");
  if (!packageJson) {
    return {
      available: false,
      reason: "`@rsbuild/core` is not installed in this project",
      node,
      packageJson: null,
    };
  }
  const nodeOk = await nodeIsAvailable(node);
  if (!nodeOk) {
    return {
      available: false,
      reason: "Node.js (`" + node + "`) was not found or did not start",
      node,
      packageJson,
    };
  }
  return {
    available: true,
    reason: "",
    node,
    packageJson,
  };
}

function generatedEntry(config /*: ResolvedConfig */, frameworkRoot /*: string */, workDir /*: string */) /*: string */ {
  const theme = join([frameworkRoot, "src/theme/vellum.css"]);
  const client = join([frameworkRoot, "src/theme/client.js"]);
  const tokens = join([workDir, "tokens.css"]);
  let entry = "";
  entry += "import " + JSON.stringify(theme) + ";\n";
  // Between the theme defaults and customCss, so the cascade stays
  // defaults < theme.accent < theme.customCss.
  entry += "import " + JSON.stringify(tokens) + ";\n";
  for (const file of config.theme.customCss || []) {
    entry += "import " + JSON.stringify(file) + ";\n";
  }
  entry += "import " + JSON.stringify(client) + ";\n";
  return entry;
}

function generatedBuildScript(
  config /*: ResolvedConfig */,
  workDir /*: string */,
  bundleDir /*: string */,
) /*: string */ {
  const entry = join([workDir, "entry.js"]);
  const base = config.base;
  return (
    'import { createRsbuild } from "@rsbuild/core";\n' +
    "const rsbuild = await createRsbuild({\n" +
    "  cwd: " + JSON.stringify(config.root) + ",\n" +
    "  callerName: \"vellum\",\n" +
    "  rsbuildConfig: {\n" +
    "    source: { entry: { vellum: " + JSON.stringify(entry) + " } },\n" +
    "    output: {\n" +
    "      distPath: { root: " + JSON.stringify(bundleDir) + ", js: \"assets\", css: \"assets\" },\n" +
    "      filename: { js: \"[name].js\", css: \"[name].css\" },\n" +
    "      cleanDistPath: true,\n" +
    "      manifest: false,\n" +
    "      assetPrefix: " + JSON.stringify(base) + ",\n" +
    "    },\n" +
    "    performance: { chunkSplit: { strategy: \"all-in-one\" } },\n" +
    "    html: { inject: false },\n" +
    "    tools: { htmlPlugin: false },\n" +
    "  },\n" +
    "});\n" +
    "await rsbuild.build();\n"
  );
}

async function runNode(
  node /*: string */,
  script /*: string */,
  cwd /*: string */,
) /*: Promise<{ code: number, stdout: string, stderr: string }> */ {
  const child = child_process.spawn(node, [script], {
    cwd,
    maxBuffer: 8 * 1024 * 1024,
  });
  const result = await child.wait();
  const decoder = new TextDecoder();
  const stdout = child.stdout ? decoder.decode(child.stdout) : "";
  const stderr = child.stderr ? decoder.decode(child.stderr) : "";
  return { code: result.code, stdout, stderr };
}

export async function buildWithRsbuild(
  options /*: BuildWithRsbuildOptions */,
) /*: Promise<RenderAssets> */ {
  const config = options.config;
  const logger = options.logger;
  const detection = await detectRsbuild(config);
  if (!detection.available) {
    throw fail(
      "Rsbuild is not available: " + detection.reason + ".",
      "Install it with `npm install -D @rsbuild/core`, or set bundler.provider to \"builtin\".",
    );
  }

  const workDir = join([config.root, ".vellum/rsbuild"]);
  const bundleDir = join([workDir, "bundle"]);
  ensureDir(workDir);
  writeText(join([workDir, "tokens.css"]), themeTokensCss(config));
  writeText(join([workDir, "entry.js"]), generatedEntry(config, options.frameworkRoot, workDir));
  writeText(
    join([workDir, "build.mjs"]),
    generatedBuildScript(config, workDir, bundleDir),
  );

  logger.debug("running Rsbuild through Node at " + detection.node);
  const result = await runNode(detection.node, join([workDir, "build.mjs"]), config.root);
  if (result.code !== 0) {
    const detail = (result.stderr || result.stdout).trim().split("\n").slice(-18).join("\n");
    throw fail(
      "Rsbuild failed with exit code " + String(result.code) + ".",
      detail || "Run the build with --verbose to inspect the generated configuration.",
    );
  }

  const sourceJs = join([bundleDir, "assets/vellum.js"]);
  const sourceCss = join([bundleDir, "assets/vellum.css"]);
  if (!exists(sourceJs) || !exists(sourceCss)) {
    throw fail(
      "Rsbuild completed but did not emit the expected theme bundle.",
      "Expected assets/vellum.js and assets/vellum.css in " + bundleDir + ".",
    );
  }

  const targetDir = join([config.outDir, "assets"]);
  ensureDir(targetDir);
  await copyFile(sourceJs, join([targetDir, "vellum.js"]));
  await copyFile(sourceCss, join([targetDir, "vellum.css"]));
  logger.debug("copied Rsbuild output to " + targetDir);
  return builtinAssets(config);
}

export async function resolveAssets(
  config /*: ResolvedConfig */,
  frameworkRoot /*: string */,
  logger /*: Logger */,
) /*: Promise<{ assets: RenderAssets, bundler: "builtin" | "rsbuild" }> */ {
  if (config.bundler.provider === "builtin") {
    const assets = await emitBuiltinAssets(config, frameworkRoot, logger);
    return { assets, bundler: "builtin" };
  }

  const detection = await detectRsbuild(config);
  if (!detection.available) {
    if (config.bundler.provider === "rsbuild") {
      throw fail(
        "Rsbuild is required but unavailable: " + detection.reason + ".",
        "Install it with `npm install -D @rsbuild/core`, or use bundler.provider \"auto\".",
      );
    }
    logger.warn(
      "Rsbuild unavailable (" + detection.reason + "); using Vellum's built-in asset pipeline.",
    );
    const assets = await emitBuiltinAssets(config, frameworkRoot, logger);
    return { assets, bundler: "builtin" };
  }

  const assets = await buildWithRsbuild({ config, frameworkRoot, logger });
  return { assets, bundler: "rsbuild" };
}

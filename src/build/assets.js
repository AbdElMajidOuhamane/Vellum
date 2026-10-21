// @flow
/*:: import type { Logger, RenderAssets, ResolvedConfig } from "../types.js"; */
import { fail } from "../util/errors.js";
import { exists, ensureDir, readText, writeText } from "../util/fs.js";
import { join } from "../util/path.js";

/*::
export type AssetResult = {
  assets: RenderAssets,
  bundler: "builtin" | "rsbuild",
};
*/

export function builtinAssets(config /*: ResolvedConfig */) /*: RenderAssets */ {
  return {
    css: ["/assets/vellum.css"],
    js: ["/assets/vellum.js"],
  };
}

/**
 * `theme.accent` must win over the defaults declared in vellum.css, and
 * `theme.customCss` must win over `theme.accent`. Emitting the configured
 * tokens between the two keeps that order inside one stylesheet; the small
 * inline style in the document head is only a no-CSS fallback.
 */
export function themeTokensCss(config /*: ResolvedConfig */) /*: string */ {
  return (
    "/* Configured theme tokens */\n" +
    ":root{\n" +
    "  --vellum-accent: " + (config.theme.accent || "#5b5bd6") + ";\n" +
    "  --vellum-accent-contrast: " + (config.theme.accentContrast || "#ffffff") + ";\n" +
    "}\n"
  );
}

export function readClientJs(frameworkRoot /*: string */) /*: string */ {
  const clientJs = readText(join([frameworkRoot, "src/theme/client.js"]));
  if (clientJs === null) {
    throw fail(
      "Vellum's browser runtime is missing from `" + frameworkRoot + "`.",
      "Reinstall vellum-docs so src/theme/client.js exists.",
    );
  }
  return clientJs;
}

export function readThemeCss(
  config /*: ResolvedConfig */,
  frameworkRoot /*: string */,
) /*: string */ {
  const themeCss = readText(join([frameworkRoot, "src/theme/vellum.css"]));
  if (themeCss === null) {
    throw fail(
      "Vellum's theme stylesheet is missing from `" + frameworkRoot + "`.",
      "Reinstall vellum-docs so src/theme/vellum.css exists.",
    );
  }

  let css = "/* Vellum " + (config.title || "docs") + " theme */\n" + themeCss;
  css += "\n" + themeTokensCss(config);
  for (const file of config.theme.customCss || []) {
    if (!exists(file)) {
      throw fail(
        "Custom CSS file `" + file + "` does not exist.",
        "Fix theme.customCss in vellum.config.js.",
      );
    }
    const custom = readText(file);
    if (custom === null) {
      throw fail("Could not read custom CSS file `" + file + "`.", "Check its permissions.");
    }
    css += "\n\n/* " + file + " */\n" + custom;
  }
  return css;
}

export async function emitBuiltinAssets(
  config /*: ResolvedConfig */,
  frameworkRoot /*: string */,
  logger /*: Logger */,
) /*: Promise<RenderAssets> */ {
  const css = readThemeCss(config, frameworkRoot);
  const clientJs = readClientJs(frameworkRoot);

  const assetsDir = join([config.outDir, "assets"]);
  ensureDir(assetsDir);
  writeText(join([assetsDir, "vellum.css"]), css);
  writeText(join([assetsDir, "vellum.js"]), clientJs);
  logger.debug("wrote built-in theme assets to " + assetsDir);
  return builtinAssets(config);
}

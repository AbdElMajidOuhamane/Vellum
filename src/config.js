// @flow
/*:: import type { EditLinkConfig, FeatureConfig, ProjectConfig, ResolvedConfig, SidebarItem, NavItem } from "./types.js"; */
import { fail } from "./util/errors.js";
import {
  basename,
  dirname,
  humanize,
  isAbsolute,
  isWithin,
  join,
  normalize,
  normalizeBase,
  relative,
  resolve,
  withTrailingSlash,
} from "./util/path.js";
import { exists, isDirectory, isFile, readText } from "./util/fs.js";

/*::
export type LoadConfigOptions = {
  root?: string | null,
  configPath?: string | null,
  cwd?: string,
  frameworkRoot?: string | null,
};
*/

export function defineConfig(config /*: ProjectConfig */) /*: ProjectConfig */ {
  return config;
}

function asString(value /*: mixed */, label /*: string */, fallback /*: string */) /*: string */ {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "string") {
    throw fail(
      "`" + label + "` must be a string in vellum.config.js.",
      "Remove the value or wrap it in quotes.",
    );
  }
  return value;
}

function asBoolean(value /*: mixed */, label /*: string */, fallback /*: boolean */) /*: boolean */ {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "boolean") {
    throw fail(
      "`" + label + "` must be true or false in vellum.config.js.",
      "Remove the value or use a boolean literal.",
    );
  }
  return value;
}

function asColor(value /*: mixed */, label /*: string */, fallback /*: string */) /*: string */ {
  const color = asString(value, label, fallback).trim();
  const valid =
    /^#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/.test(color) ||
    /^(?:rgb|rgba|hsl|hsla|oklch|oklab|lab|lch)\([^;<>{}]+\)$/.test(color);
  if (!valid) {
    throw fail(
      "`" + label + "` must be a CSS color such as `#5b5bd6` or `oklch(0.6 0.2 280)`.",
      "Use a hex, rgb, hsl, or oklch value without a semicolon or braces.",
    );
  }
  return color;
}

function asNumber(value /*: mixed */, label /*: string */, fallback /*: number */) /*: number */ {
  if (value === undefined || value === null) {
    return fallback;
  }
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw fail(
      "`" + label + "` must be a number in vellum.config.js.",
      "Use an unquoted numeric value.",
    );
  }
  return value;
}

function resolveFrom(root /*: string */, value /*: string */) /*: string */ {
  return isAbsolute(value) ? resolve("/", [value]) : join([root, value]);
}

function validateNav(items /*: mixed */) /*: Array<NavItem> */ {
  if (items === undefined || items === null) {
    return [];
  }
  if (!Array.isArray(items)) {
    throw fail(
      "`nav` must be an array in vellum.config.js.",
      "Example: nav: [{ label: \"Guide\", link: \"/guide/\" }]",
    );
  }
  return items.map((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw fail(
        "`nav[" + String(index) + "]` must be an object with `label` and `link`.",
        "Example: { label: \"Guide\", link: \"/guide/\" }",
      );
    }
    const label = asString(item.label, "nav[" + String(index) + "].label", "");
    const link = asString(item.link, "nav[" + String(index) + "].link", "");
    if (!label || !link) {
      throw fail(
        "Every nav item needs a non-empty `label` and `link`.",
        "Edit the `nav` array in vellum.config.js.",
      );
    }
    return { label, link };
  });
}

function validateSidebarItem(
  item /*: mixed */,
  path /*: string */,
) /*: SidebarItem */ {
  if (!item || typeof item !== "object" || Array.isArray(item)) {
    throw fail(
      "`" + path + "` must be an object in the sidebar configuration.",
      "Each sidebar item needs a `label` and either a `link` or nested `items`.",
    );
  }
  const label = asString(item.label, path + ".label", "");
  if (!label) {
    throw fail(
      "`" + path + ".label` is required.",
      "Give every sidebar group and link a human-readable label.",
    );
  }
  const result /*: SidebarItem */ = { label };
  if (item.link !== undefined && item.link !== null) {
    result.link = asString(item.link, path + ".link", "");
  }
  if (item.collapsed !== undefined) {
    result.collapsed = asBoolean(item.collapsed, path + ".collapsed", false);
  }
  if (item.items !== undefined && item.items !== null) {
    if (!Array.isArray(item.items)) {
      throw fail(
        "`" + path + ".items` must be an array.",
        "Nest sidebar links inside an `items` array.",
      );
    }
    result.items = item.items.map((child, index) =>
      validateSidebarItem(child, path + ".items[" + String(index) + "]"),
    );
  }
  if (!result.link && (!result.items || result.items.length === 0)) {
    throw fail(
      "Sidebar item `" + label + "` has no `link` and no `items`.",
      "Add a link or nested items, or remove the entry.",
    );
  }
  return result;
}

function validateSidebar(value /*: mixed */) /*: "auto" | Array<SidebarItem> */ {
  if (value === undefined || value === null || value === "auto") {
    return "auto";
  }
  if (!Array.isArray(value)) {
    throw fail(
      "`sidebar` must be `\"auto\"` or an array of sidebar items.",
      "Use `sidebar: \"auto\"` for generated navigation.",
    );
  }
  return value.map((item, index) => validateSidebarItem(item, "sidebar[" + String(index) + "]"));
}

function validateTheme(value /*: mixed */) /*: any */ {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw fail(
      "`theme` must be an object in vellum.config.js.",
      "Example: theme: { accent: \"#5b5bd6\" }",
    );
  }
  return value;
}

function validateMarkdown(value /*: mixed */) /*: any */ {
  if (value === undefined || value === null) {
    return {};
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw fail(
      "`markdown` must be an object in vellum.config.js.",
      "Example: markdown: { tables: true, callouts: true }",
    );
  }
  return value;
}

function validateHero(value /*: mixed */) /*: any */ {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw fail(
      "`hero` must be an object in vellum.config.js.",
      "Example: hero: { tagline: \"Fast docs\", actions: [...] }",
    );
  }
  for (const key of ["title", "tagline", "eyebrow", "imageAlt"]) {
    const field = value[key];
    if (field !== undefined && field !== null && typeof field !== "string") {
      throw fail(
        "`hero." + key + "` must be a string.",
        "Wrap the value in quotes, or remove it.",
      );
    }
  }
  validateHeroImage(value.image, "hero.image");
  if (value.actions !== undefined && value.actions !== null) {
    if (!Array.isArray(value.actions)) {
      throw fail(
        "`hero.actions` must be an array.",
        "Each action needs `text` and `link`.",
      );
    }
    value.actions.forEach((action, index) => {
      if (!action || typeof action !== "object" || Array.isArray(action)) {
        throw fail(
          "`hero.actions[" + String(index) + "]` must be an object.",
          "Use { text: \"Start\", link: \"/guide/\", variant: \"primary\" }.",
        );
      }
      if (
        typeof action.text !== "string" ||
        !action.text.trim() ||
        typeof action.link !== "string" ||
        !action.link.trim()
      ) {
        throw fail(
          "Every hero action needs non-empty `text` and `link` strings.",
          "Fix the action in vellum.config.js.",
        );
      }
      if (
        action.variant !== undefined &&
        action.variant !== "primary" &&
        action.variant !== "secondary" &&
        action.variant !== "minimal"
      ) {
        throw fail(
          "`hero.actions[" + String(index) + "].variant` must be `primary`, `secondary`, or `minimal`.",
          "Remove the variant to use the primary style.",
        );
      }
    });
  }
  return value;
}

function validateHeroImage(value /*: mixed */, label /*: string */) /*: void */ {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value === "string") {
    return;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw fail(
      "`" + label + "` must be a path string or `{ file, alt }`.",
      "Example: image: { file: /logo.svg, alt: Project logo }",
    );
  }
  const record /*: any */ = value;
  if (typeof record.file !== "string" || record.file.trim() === "") {
    throw fail(
      "`" + label + ".file` must be a non-empty string.",
      "Point it at a file in `public/` or an absolute URL.",
    );
  }
  if (record.alt !== undefined && record.alt !== null && typeof record.alt !== "string") {
    throw fail(
      "`" + label + ".alt` must be a string.",
      "Use alt: \"\" for a decorative image.",
    );
  }
}

function validateFeatures(value /*: mixed */) /*: Array<FeatureConfig> */ {
  if (value === undefined || value === null) {
    return [];
  }
  if (!Array.isArray(value)) {
    throw fail(
      "`features` must be an array.",
      "Example: features: [{ title: \"Fast\", description: \"Rendered to static HTML.\" }]",
    );
  }
  const features /*: Array<FeatureConfig> */ = [];
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const label = "features[" + String(index) + "]";
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw fail(
        "`" + label + "` must be an object.",
        "Each feature needs `title` and `description` strings.",
      );
    }
    const record /*: any */ = item;
    if (typeof record.title !== "string" || record.title.trim() === "") {
      throw fail(
        "`" + label + ".title` must be a non-empty string.",
        "Add a short name such as `Fast`.",
      );
    }
    if (typeof record.description !== "string" || record.description.trim() === "") {
      throw fail(
        "`" + label + ".description` must be a non-empty string.",
        "Describe the feature in one sentence.",
      );
    }
    const feature /*: FeatureConfig */ = {
      title: record.title,
      description: record.description,
    };
    if (record.link !== undefined && record.link !== null) {
      if (typeof record.link !== "string") {
        throw fail(
          "`" + label + ".link` must be a string.",
          "Use a route such as `/guide/` or an absolute URL.",
        );
      }
      if (record.link.trim() !== "") {
        feature.link = record.link;
      }
    }
    features.push(feature);
  }
  return features;
}

export function resolveConfig(
  raw /*: ProjectConfig */,
  metadata /*: { root: string, configPath: string } */,
) /*: ResolvedConfig */ {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw fail(
      "vellum.config.js must export a configuration object.",
      "Use `export default { title: \"My docs\" }` or `export default defineConfig({...})`.",
    );
  }

  const root = metadata.root;
  const title = asString(raw.title, "title", humanize(basename(root)) || "Vellum");
  const description = asString(raw.description, "description", "");
  let site = asString(raw.site, "site", "").replace(/\/+$/, "");
  if (site && !/^https?:\/\/[^\s]+$/i.test(site)) {
    throw fail(
      "`site` must be an absolute http(s) URL.",
      "Example: site: \"https://docs.example.com\"",
    );
  }
  const lang = asString(raw.lang, "lang", "en");
  const base = normalizeBase(asString(raw.base, "base", "/"));
  if (base.includes("..")) {
    throw fail("`base` may not contain `..` segments.", "Use a path such as `/docs/`.");
  }

  const srcDir = resolveFrom(root, asString(raw.srcDir, "srcDir", "src/content/docs"));
  const publicDir = resolveFrom(root, asString(raw.publicDir, "publicDir", "public"));
  const outDir = resolveFrom(root, asString(raw.outDir, "outDir", "dist"));
  if (outDir === root || isWithin(srcDir, outDir)) {
    throw fail(
      "`outDir` must not be the project root or inside `srcDir`.",
      "A build deletes the output directory; choose a separate folder such as `dist`.",
    );
  }
  if (outDir === publicDir) {
    throw fail(
      "`outDir` must not be the same as `publicDir`.",
      "Public files are copied into the output; keep them in separate folders.",
    );
  }

  const themeRaw = validateTheme(raw.theme);
  const customCssValue = themeRaw.customCss;
  const customCssList =
    customCssValue === undefined || customCssValue === null
      ? []
      : Array.isArray(customCssValue)
        ? customCssValue
        : typeof customCssValue === "string"
          ? [customCssValue]
          : null;
  if (customCssList === null) {
    throw fail(
      "`theme.customCss` must be a path string or an array of path strings.",
      "Use customCss: 'src/styles/site.css' or customCss: ['src/styles/site.css'].",
    );
  }
  const customCss = customCssList.map((file, index) => {
    if (typeof file !== "string") {
      throw fail(
        "`theme.customCss[" + String(index) + "]` must be a path string.",
        "List CSS files relative to the project root.",
      );
    }
    return resolveFrom(root, file);
  });

  const markdownRaw = validateMarkdown(raw.markdown);
  const searchRaw = raw.search && typeof raw.search === "object" ? raw.search : {};
  const bundlerRaw = raw.bundler && typeof raw.bundler === "object" ? raw.bundler : {};
  const devRaw = raw.dev && typeof raw.dev === "object" ? raw.dev : {};

  const provider = bundlerRaw.provider || "auto";
  if (provider !== "auto" && provider !== "rsbuild" && provider !== "builtin") {
    throw fail(
      "`bundler.provider` must be \"auto\", \"rsbuild\", or \"builtin\".",
      "Use auto to try Rsbuild and fall back to Vellum's built-in asset pipeline.",
    );
  }

  const envPort = process && process.env ? process.env.VELLUM_PORT : undefined;
  const devPort = asNumber(
    envPort ? Number(envPort) : devRaw.port,
    "dev.port",
    4321,
  );
  if (devPort < 1 || devPort > 65535) {
    throw fail(
      "`dev.port` must be between 1 and 65535.",
      "Pick a free port such as 4321.",
    );
  }

  const editLinkRaw = raw.editLink;
  const editLink /*: EditLinkConfig | null */ =
    editLinkRaw && typeof editLinkRaw === "object" && typeof editLinkRaw.baseUrl === "string"
      ? {
          baseUrl: withTrailingSlash(editLinkRaw.baseUrl),
          label:
            typeof editLinkRaw.label === "string"
              ? editLinkRaw.label
              : "Edit this page",
        }
      : null;

  const social /*: { [string]: string } */ = {};
  const socialRaw = raw.social;
  if (socialRaw && typeof socialRaw === "object") {
    const socialRecord /*: any */ = socialRaw;
    for (const key of Object.keys(socialRecord)) {
      const value = socialRecord[key];
      if (typeof value === "string") {
        social[key] = value;
      }
    }
  }
  if (social.github && !/^https?:\/\//i.test(social.github)) {
    throw fail(
      "`social.github` must be an absolute http(s) URL.",
      "Example: social: { github: \"https://github.com/example/repo\" }",
    );
  }

  return {
    root,
    configPath: metadata.configPath,
    title,
    description,
    site,
    lang,
    srcDir,
    publicDir,
    outDir,
    base,
    trailingSlash: asBoolean(raw.trailingSlash, "trailingSlash", true),
    nav: validateNav(raw.nav),
    sidebar: validateSidebar(raw.sidebar),
    theme: {
      accent: asColor(themeRaw.accent, "theme.accent", "#5b5bd6"),
      accentContrast: asColor(themeRaw.accentContrast, "theme.accentContrast", "#ffffff"),
      customCss,
      logo: asString(themeRaw.logo, "theme.logo", ""),
      favicon: asString(themeRaw.favicon, "theme.favicon", ""),
      socialImage: themeRaw.socialImage,
    },
    editLink,
    social,
    markdown: {
      tables: asBoolean(markdownRaw.tables, "markdown.tables", true),
      callouts: asBoolean(markdownRaw.callouts, "markdown.callouts", true),
      headingAnchors: asBoolean(markdownRaw.headingAnchors, "markdown.headingAnchors", true),
      externalLinksNewTab: asBoolean(
        markdownRaw.externalLinksNewTab,
        "markdown.externalLinksNewTab",
        false,
      ),
    },
    search: {
      enabled: asBoolean(searchRaw.enabled, "search.enabled", true),
      maxResults: asNumber(searchRaw.maxResults, "search.maxResults", 10),
    },
    bundler: {
      provider,
      node: asString(bundlerRaw.node, "bundler.node", "node"),
    },
    dev: {
      port: devPort,
      watchInterval: asNumber(devRaw.watchInterval, "dev.watchInterval", 700),
      liveReload: asBoolean(devRaw.liveReload, "dev.liveReload", true),
    },
    drafts: asBoolean(raw.drafts, "drafts", false),
    footer: asString(raw.footer, "footer", ""),
    hero: validateHero(raw.hero),
    features: validateFeatures(raw.features),
    integrations: Array.isArray(raw.integrations) ? raw.integrations : [],
  };
}

function packageName(file /*: string */) /*: string | null */ {
  const text = readText(file);
  if (text === null) {
    return null;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed && typeof parsed.name === "string" ? parsed.name : null;
  } catch (_error) {
    return null;
  }
}

/**
 * Locate the installed `vellum-docs` package without `import.meta.url` or
 * Node's module resolver. Used by generated Fairyfly entry scripts.
 */
export function findFrameworkRoot(
  start /*: string */ = process.cwd(),
) /*: string */ {
  const fromEnv = process.env.VELLUM_ROOT;
  if (fromEnv && isDirectory(fromEnv)) {
    return normalize(fromEnv);
  }

  let current = normalize(start);
  for (let depth = 0; depth < 64; depth += 1) {
    if (packageName(join([current, "package.json"])) === "vellum-docs") {
      return current;
    }
    const installed = join([current, "node_modules/vellum-docs"]);
    if (isFile(join([installed, "package.json"]))) {
      return installed;
    }
    const parent = dirname(current);
    if (parent === current) {
      break;
    }
    current = parent;
  }

  throw fail(
    "Could not locate the vellum-docs package.",
    "Run `ff imprint vellum-docs` in the project root, or `npm install vellum-docs`.",
  );
}

export function findConfigFile(root /*: string */) /*: string | null */ {
  for (const name of ["vellum.config.js", "vellum.config.mjs"]) {
    const candidate = join([root, name]);
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function loadConfig(options /*: LoadConfigOptions */ = {}) /*: Promise<ResolvedConfig> */ {
  const cwd = options.cwd || process.cwd();
  const requestedRoot = options.root ? resolve(cwd, [options.root]) : null;
  let configPath = options.configPath ? resolve(cwd, [options.configPath]) : null;

  if (!configPath) {
    const searchRoot = requestedRoot || cwd;
    configPath = findConfigFile(searchRoot);
    if (!configPath) {
      throw fail(
        "No vellum.config.js found in `" + searchRoot + "`.",
        "Run `vellum new <dir>` to scaffold a site, or pass --config <path>.",
      );
    }
  }

  if (!exists(configPath)) {
    throw fail(
      "Config file `" + configPath + "` does not exist.",
      "Check the path passed to --config.",
    );
  }

  const root = requestedRoot || dirname(configPath);
  let specifier = configPath;
  if (options.frameworkRoot) {
    const from = join([options.frameworkRoot, "src"]);
    const path = relative(from, configPath);
    if (path && path !== ".") {
      specifier = path.startsWith(".") ? path : "./" + path;
    }
  }
  let loaded;
  try {
    // $FlowFixMe[unsupported-syntax] Flow wants a literal; Fairyfly needs a runtime path.
    loaded = await import(specifier);
  } catch (_firstError) {
    try {
      // Fairyfly can throw NotDir while resolving the first module from a new
      // directory after another module evaluation. An immediate retry works.
      // $FlowFixMe[unsupported-syntax]
      loaded = await import(specifier);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw fail(
        "Could not load `" + configPath + "`: " + message,
        "Config files are ES modules. Check the syntax and remove require()/module.exports.",
      );
    }
  }

  let configValue = loaded.default !== undefined ? loaded.default : loaded.config;
  if (typeof configValue === "function") {
    try {
      configValue = await configValue({ command: "load", root });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw fail(
        "The config function in `" + configPath + "` threw: " + message,
        "Return a configuration object from the exported function.",
      );
    }
  }

  if (!configValue || typeof configValue !== "object" || Array.isArray(configValue)) {
    throw fail(
      "`" + configPath + "` must export a configuration object as its default export.",
      "Example: export default { title: \"My docs\" };",
    );
  }

  return resolveConfig(configValue, { root, configPath });
}

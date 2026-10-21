import { check, done, eq, tempDir, throws, writeFile, writeJson, cleanup } from "./lib.js";
import { defineConfig, findFrameworkRoot, loadConfig, resolveConfig } from "../src/config.js";
import { themeTokensCss } from "../src/build/assets.js";

const meta = { root: "/tmp/example", configPath: "/tmp/example/vellum.config.js" };

const defaults = resolveConfig({}, meta);
eq("default title", defaults.title, "Example");
eq("default lang", defaults.lang, "en");
eq("default base", defaults.base, "/");
eq("default trailing slash", defaults.trailingSlash, true);
eq("default srcDir", defaults.srcDir, "/tmp/example/src/content/docs");
eq("default outDir", defaults.outDir, "/tmp/example/dist");
eq("default markdown tables", defaults.markdown.tables, true);
eq("default search", defaults.search.enabled, true);
eq("default bundler", defaults.bundler.provider, "auto");
eq("default dev port", defaults.dev.port, 4321);
eq("default features", defaults.features.length, 0);
eq("default logo", defaults.theme.logo, "");
eq("default favicon", defaults.theme.favicon, "");
check("theme tokens include accent", themeTokensCss(defaults).includes("--vellum-accent: #5b5bd6;"));
const tokenCss = themeTokensCss(
  resolveConfig({ theme: { accent: "#4A6B32", accentContrast: "#ffffff" } }, meta),
);
check("theme tokens use configured accent", tokenCss.includes("--vellum-accent: #4A6B32;"));

const custom = resolveConfig(
  {
    title: "Docs",
    description: "Words",
    site: "https://example.com/",
    base: "docs",
    nav: [{ label: "Guide", link: "/guide/" }],
    sidebar: [{ label: "Overview", items: [{ label: "Home", link: "/" }] }],
    theme: {
      accent: "#ff0000",
      customCss: ["styles/extra.css"],
      logo: "/logo.svg",
      favicon: "/favicon.svg",
    },
    markdown: { tables: false },
    search: { enabled: false, maxResults: 4 },
    bundler: { provider: "builtin" },
    dev: { port: 5000 },
    drafts: true,
    hero: { eyebrow: "Runtime", image: "/hero.svg", imageAlt: "Art" },
    features: [{ title: "Fast", description: "Static HTML.", link: "/guide/" }],
  },
  meta,
);
eq("custom title", custom.title, "Docs");
eq("custom site strips slash", custom.site, "https://example.com");
eq("custom base", custom.base, "/docs/");
eq("custom nav", custom.nav.length, 1);
eq("custom sidebar", custom.sidebar[0].items[0].link, "/");
eq("custom css resolved", custom.theme.customCss[0], "/tmp/example/styles/extra.css");
const singleCss = resolveConfig({ theme: { customCss: "styles/one.css" } }, meta);
eq("custom css single length", singleCss.theme.customCss.length, 1);
eq("custom css single string", singleCss.theme.customCss[0], "/tmp/example/styles/one.css");
eq("custom logo", custom.theme.logo, "/logo.svg");
eq("custom favicon", custom.theme.favicon, "/favicon.svg");
eq("custom hero eyebrow", custom.hero.eyebrow, "Runtime");
eq("custom features", custom.features.length, 1);
eq("custom feature link", custom.features[0].link, "/guide/");
eq("custom tables", custom.markdown.tables, false);
eq("custom search", custom.search.enabled, false);
eq("custom max results", custom.search.maxResults, 4);
eq("custom bundler", custom.bundler.provider, "builtin");
eq("custom port", custom.dev.port, 5000);
eq("custom drafts", custom.drafts, true);

throws("invalid base traversal", () => resolveConfig({ base: "../escape" }, meta), "may not contain");
throws("invalid nav", () => resolveConfig({ nav: "nope" }, meta), "must be an array");
throws("nav missing link", () => resolveConfig({ nav: [{ label: "x" }] }, meta), "non-empty");
throws("invalid sidebar", () => resolveConfig({ sidebar: {} }, meta), "must be");
throws("sidebar group empty", () => resolveConfig({ sidebar: [{ label: "x" }] }, meta), "no `link`");
throws("outDir root", () => resolveConfig({ outDir: "." }, meta), "project root");
throws("outDir in src", () => resolveConfig({ outDir: "src/content/docs/out" }, meta), "inside");
throws("bad bundler", () => resolveConfig({ bundler: { provider: "webpack" } }, meta), "must be");
throws("bad site", () => resolveConfig({ site: "example.com" }, meta), "absolute http");
throws("bad accent", () => resolveConfig({ theme: { accent: "red; }" , background: "x" } }, meta), "CSS color");
throws("bad logo", () => resolveConfig({ theme: { logo: 5 } }, meta), "must be a string");
throws("bad favicon", () => resolveConfig({ theme: { favicon: 5 } }, meta), "must be a string");
throws(
  "bad custom css",
  () => resolveConfig({ theme: { customCss: 5 } }, meta),
  "path string or an array",
);
throws("bad hero eyebrow", () => resolveConfig({ hero: { eyebrow: 5 } }, meta), "must be a string");
throws("bad features", () => resolveConfig({ features: "nope" }, meta), "must be an array");
throws(
  "feature without description",
  () => resolveConfig({ features: [{ title: "Fast" }] }, meta),
  "description",
);
throws(
  "feature bad link",
  () => resolveConfig({ features: [{ title: "Fast", description: "x", link: 5 }] }, meta),
  "link",
);
const heroImage = resolveConfig(
  { hero: { image: { file: "/logo.svg", alt: "Logo" }, actions: [{ text: "Go", link: "/x/", variant: "minimal" }] } },
  meta,
);
eq("hero image file", heroImage.hero.image.file, "/logo.svg");
eq("hero image alt", heroImage.hero.image.alt, "Logo");
eq("hero minimal variant", heroImage.hero.actions[0].variant, "minimal");
throws(
  "hero image bad shape",
  () => resolveConfig({ hero: { image: { alt: "Logo" } } }, meta),
  "hero.image.file",
);
throws(
  "hero image bad variant",
  () => resolveConfig({ hero: { actions: [{ text: "Go", link: "/x/", variant: "ghost" }] } }, meta),
  "variant",
);
throws(
  "bad github",
  () => resolveConfig({ social: { github: "javascript:alert(1)" } }, meta),
  "social.github",
);

eq("defineConfig identity", defineConfig({ title: "X" }).title, "X");

const directory = tempDir("config-load");
writeFile(
  directory + "/vellum.config.js",
  "export default async function () {\n  return { title: \"Loaded\", base: \"/x/\" };\n}\n",
);
const loaded = await loadConfig({
  root: directory,
  configPath: directory + "/vellum.config.js",
  frameworkRoot: process.cwd(),
});
eq("loadConfig function title", loaded.title, "Loaded");
eq("loadConfig function base", loaded.base, "/x/");
eq("loadConfig root", loaded.root, directory);

let missingThrew = false;
try {
  await loadConfig({ root: directory + "/nope", frameworkRoot: process.cwd() });
} catch (error) {
  missingThrew = true;
  check("loadConfig missing message", String(error.message).includes("No vellum.config.js"));
}
check("loadConfig missing throws", missingThrew);

cleanup(directory);

const repoRoot = findFrameworkRoot(process.cwd());
check("findFrameworkRoot repo", repoRoot.endsWith("fly") || fs.exists(repoRoot + "/package.json"));
const fakeRoot = tempDir("framework-root");
writeJson(fakeRoot + "/node_modules/vellum-docs/package.json", {
  name: "vellum-docs",
  version: "0.1.0",
});
eq("findFrameworkRoot node_modules", findFrameworkRoot(fakeRoot), fakeRoot + "/node_modules/vellum-docs");
cleanup(fakeRoot);

done("config");

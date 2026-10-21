import { check, done, eq, includes, tempDir, writeFile, cleanup } from "./lib.js";
import { resolveConfig } from "../src/config.js";
import { buildSite } from "../src/build/build.js";
import { detectRsbuild } from "../src/build/rsbuild-adapter.js";

const logger = {
  quiet: true,
  info: () => {},
  step: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};

const root = tempDir("build");
writeFile(
  root + "/src/content/docs/index.md",
  "---\ntitle: Home\ndescription: Build home\n---\n\n# Home\n\n## Welcome\n\nSee the [guide](/guide/).\n",
);
writeFile(root + "/src/content/docs/guide/index.md", "---\ntitle: Guide\norder: 1\n---\n\n# Guide\n\nGuide index.\n");
writeFile(
  root + "/src/content/docs/guide/intro.md",
  "---\ntitle: Introduction\norder: 2\n---\n\n# Introduction\n\nIntro body.\n",
);
writeFile(root + "/src/content/docs/draft.md", "---\ntitle: Draft\ndraft: true\n---\n\nDraft body.\n");
writeFile(root + "/public/extra.txt", "public asset\n");
writeFile(root + "/src/styles/extra.css", ":root{--vellum-accent:#123456;}\n");
writeFile(root + "/public/.well-known/security.txt", "contact\n");
writeFile(root + "/dist/stale.txt", "stale\n");

const config = resolveConfig(
  {
    title: "Build Test",
    description: "Build description",
    site: "https://example.com",
    base: "/docs/",
    sidebar: "auto",
    search: { enabled: true },
    theme: { accent: "#ff0000", customCss: ["src/styles/extra.css"] },
    bundler: { provider: "builtin" },
  },
  { root, configPath: root + "/vellum.config.js" },
);

const result = await buildSite(config, { frameworkRoot: process.cwd(), logger });
eq("build pages", result.pages, 3);
eq("build bundler", result.bundler, "builtin");
eq("build assets", result.assets.length, 2);
check("index written", fs.exists(root + "/dist/index.html"));
check("guide written", fs.exists(root + "/dist/guide/index.html"));
check("intro written", fs.exists(root + "/dist/guide/intro/index.html"));
check("draft excluded", !fs.exists(root + "/dist/draft/index.html"));
check("404 written", fs.exists(root + "/dist/404.html"));
check("search written", fs.exists(root + "/dist/search-index.json"));
check("sitemap written", fs.exists(root + "/dist/sitemap.xml"));
check("robots written", fs.exists(root + "/dist/robots.txt"));
check("css written", fs.exists(root + "/dist/assets/vellum.css"));
const css = fs.readFile(root + "/dist/assets/vellum.css");
const defaultsAt = css.indexOf("--vellum-accent: #5b5bd6;");
const configuredAt = css.indexOf("--vellum-accent: #ff0000;");
const customAt = css.indexOf("--vellum-accent:#123456;");
check("css theme defaults present", defaultsAt >= 0);
check("css configured accent overrides defaults", configuredAt > defaultsAt);
check("css custom override wins", customAt > configuredAt);
check("js written", fs.exists(root + "/dist/assets/vellum.js"));
check("public copied", fs.exists(root + "/dist/extra.txt"));
check("hidden public copied", fs.exists(root + "/dist/.well-known/security.txt"));
check("stale removed", !fs.exists(root + "/dist/stale.txt"));

const indexHtml = fs.readFile(root + "/dist/index.html");
includes("base in links", indexHtml, 'href="/docs/guide/"');
includes("canonical base", indexHtml, 'href="https://example.com/docs/"');
includes("search meta base", indexHtml, 'content="/docs/search-index.json"');
includes("asset css base", indexHtml, 'href="/docs/assets/vellum.css"');

const sitemap = fs.readFile(root + "/dist/sitemap.xml");
includes("sitemap root", sitemap, "https://example.com/docs/");
includes("sitemap guide", sitemap, "https://example.com/docs/guide/");
const robots = fs.readFile(root + "/dist/robots.txt");
includes("robots sitemap", robots, "Sitemap: https://example.com/docs/sitemap.xml");

const search = JSON.parse(fs.readFile(root + "/dist/search-index.json"));
eq("search records", search.length, 3);
check("search root route", search.some((record) => record.route === "/docs/"));
check("search intro route", search.some((record) => record.route === "/docs/guide/intro/"));

const withDrafts = await buildSite(
  { ...config, drafts: true },
  { frameworkRoot: process.cwd(), logger, includeDrafts: true },
);
eq("draft build pages", withDrafts.pages, 4);
check("draft written", fs.exists(root + "/dist/draft/index.html"));

const missingRoot = tempDir("build-missing");
const missingConfig = resolveConfig({}, { root: missingRoot, configPath: missingRoot + "/vellum.config.js" });
let missingThrew = false;
try {
  await buildSite(missingConfig, { frameworkRoot: process.cwd(), logger });
} catch (error) {
  missingThrew = true;
  check("missing src message", String(error.message).includes("does not exist"));
}
check("missing src throws", missingThrew);

const rsbuildDetection = await detectRsbuild(config);
if (rsbuildDetection.available) {
  const rsbuildConfig = { ...config, bundler: { provider: "auto", node: "node" } };
  const rsbuildResult = await buildSite(rsbuildConfig, { frameworkRoot: process.cwd(), logger });
  eq("rsbuild bundler", rsbuildResult.bundler, "rsbuild");
  check("rsbuild css", fs.exists(root + "/dist/assets/vellum.css"));
  check("rsbuild js", fs.exists(root + "/dist/assets/vellum.js"));
  check("rsbuild css non-empty", (fs.readFile(root + "/dist/assets/vellum.css") || "").length > 1000);
} else {
  check("rsbuild unavailable (skipped integration)", true);
}

cleanup(root);
cleanup(missingRoot);
done("build");

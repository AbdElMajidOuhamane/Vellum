import { check, done, includes, notIncludes, tempDir, writeFile, cleanup } from "./lib.js";
import { collectContent } from "../src/content/collect.js";
import { resolveConfig } from "../src/config.js";
import { buildNav, buildSidebar, prevNext } from "../src/content/site.js";
import { buildToc } from "../src/content/toc.js";
import { renderPage } from "../src/render/layout.js";
import { notFoundEntry, renderErrorPage, renderNotFound } from "../src/render/page.js";
import { fail } from "../src/util/errors.js";

const root = tempDir("render");
writeFile(
  root + "/src/content/docs/index.md",
  "---\ntitle: Home\ndescription: Landing\ndraft: false\nhero:\n  tagline: A tagline\n  actions:\n    - text: Start\n      link: /guide/\n      variant: primary\n---\n\n## Section\n\nBody.\n",
);
writeFile(root + "/src/content/docs/guide.md", "---\ntitle: Guide\n---\n\n# Guide\n\nText.\n");
writeFile(
  root + "/src/content/docs/splash.md",
  "---\ntitle: Splash\ndescription: Landing page\nlayout: splash\nhero:\n  eyebrow: Runtime\n  tagline: A landing page\n  image: /hero.svg\n  imageAlt: Hero art\n  actions:\n    - text: Start\n      link: /guide/\n      variant: primary\n    - text: Elsewhere\n      link: https://example.com\n      variant: secondary\nfeatures:\n  - title: First\n    description: First card.\n  - title: Second\n    description: Second card.\n    link: /guide/\n  - title: Third\n    description: Third card.\n    link: https://example.com\n---\n\n## Body\n\nText.\n",
);
writeFile(root + "/src/content/docs/plain.md", "---\ntitle: Plain\n---\n\nJust text.\n");

const config = resolveConfig(
  {
    title: "Render Test",
    description: "Site description",
    site: "https://example.com",
    sidebar: "auto",
    nav: [{ label: "Guide", link: "/guide/" }],
    theme: { accent: "#123456", logo: "/logo.svg", favicon: "/favicon.svg" },
    features: [{ title: "Config feature", description: "From the config file." }],
  },
  { root, configPath: root + "/vellum.config.js" },
);
const collection = collectContent(config);
const sidebar = buildSidebar(config, collection.entries, collection.byRoute);
const nav = buildNav(config);
const entry = collection.byRoute.get("/");
const toc = buildToc(entry.headings);
const adjacent = prevNext(collection.entries, sidebar, entry.route, collection.byRoute);

const html = renderPage({
  config,
  entry,
  entries: collection.entries,
  sidebar,
  nav,
  toc,
  prev: adjacent.prev,
  next: adjacent.next,
  assets: { css: ["/assets/vellum.css"], js: ["/assets/vellum.js"] },
  dev: false,
  version: "test",
});

includes("doctype", html, "<!doctype html>");
includes("lang", html, '<html lang="en">');
includes("title", html, "<title>Home | Render Test</title>");
includes("description", html, 'content="Landing"');
includes("canonical", html, 'rel="canonical" href="https://example.com/"');
includes("og title", html, 'property="og:title" content="Home"');
includes("theme accent", html, "--vellum-accent:#123456");
includes("css asset", html, 'href="/assets/vellum.css"');
includes("js asset", html, 'src="/assets/vellum.js"');
includes("skip link", html, 'class="skip-link"');
includes("sidebar", html, 'class="sidebar"');
includes("active nav", html, 'aria-current="page"');
includes("hero", html, 'class="hero"');
includes("hero tagline", html, "A tagline");
includes("hero action", html, 'href="/guide/"');
includes("brand logo", html, 'class="brand-logo" src="/logo.svg"');
includes("custom favicon", html, 'rel="icon" href="/favicon.svg"');
includes("config features", html, "Config feature");
includes("toc", html, 'class="page-toc"');
includes("search dialog", html, 'data-search-dialog');
includes("search meta", html, 'name="vellum-search"');
includes("pagination next", html, 'class="pagination-link pagination-next"');
includes("footer", html, "Built with");
notIncludes("no dev script in prod", html, "__vellum/live.js");
notIncludes("no raw hero title injection", html, "<script>alert");

const devHtml = renderPage({
  config,
  entry,
  entries: collection.entries,
  sidebar,
  nav,
  toc,
  prev: null,
  next: null,
  assets: { css: ["/assets/vellum.css"], js: ["/assets/vellum.js"] },
  dev: true,
  version: "dev-1",
});
includes("dev live script", devHtml, "/__vellum/live.js");
includes("dev version", devHtml, "__VELLUM_DEV__");

const accentConfig = resolveConfig(
  {
    title: "Render Test",
    description: "Site description",
    site: "https://example.com",
    sidebar: "auto",
    theme: { accent: "#abcdef" },
  },
  { root, configPath: root + "/vellum.config.js" },
);
const accentHtml = renderPage({
  config: accentConfig,
  entry,
  entries: collection.entries,
  sidebar,
  nav,
  toc,
  prev: null,
  next: null,
  assets: { css: ["/assets/vellum.css"], js: ["/assets/vellum.js"] },
  dev: false,
  version: "test",
});
includes("accent favicon", accentHtml, "%23abcdef");
notIncludes("no custom favicon by default", accentHtml, 'rel="icon" href="/favicon.svg"');
notIncludes("no brand logo by default", accentHtml, 'class="brand-logo"');

const splashEntry = collection.byRoute.get("/splash/");
const splashHtml = renderPage({
  config,
  entry: splashEntry,
  entries: collection.entries,
  sidebar,
  nav,
  toc: buildToc(splashEntry.headings),
  prev: adjacent.prev,
  next: adjacent.next,
  assets: { css: ["/assets/vellum.css"], js: ["/assets/vellum.js"] },
  dev: false,
  version: "test",
});
includes("splash shell", splashHtml, 'class="page-shell is-splash"');
includes("splash hero", splashHtml, 'class="hero hero-splash hero-with-media"');
includes("splash eyebrow", splashHtml, ">Runtime<");
includes("splash image", splashHtml, 'src="/hero.svg"');
includes("splash image alt", splashHtml, 'alt="Hero art"');
includes("splash features", splashHtml, 'class="features"');
includes("splash feature text", splashHtml, "First card.");
includes("splash feature link", splashHtml, 'class="feature is-link" href="/guide/"');
includes("splash feature external", splashHtml, 'rel="noreferrer noopener"');
includes("splash content", splashHtml, 'id="body"');
notIncludes("splash no sidebar", splashHtml, 'class="sidebar"');
notIncludes("splash no toc", splashHtml, 'class="page-toc"');
notIncludes("splash no mobile toc", splashHtml, 'class="toc-mobile"');
notIncludes("splash no breadcrumbs", splashHtml, 'class="breadcrumbs"');
notIncludes("splash no pagination", splashHtml, 'class="pagination');
notIncludes("splash no edit link", splashHtml, 'class="edit-link"');

const plainEntry = collection.byRoute.get("/plain/");
const plainHtml = renderPage({
  config,
  entry: plainEntry,
  entries: collection.entries,
  sidebar,
  nav,
  toc: [],
  prev: null,
  next: null,
  assets: { css: ["/assets/vellum.css"], js: ["/assets/vellum.js"] },
  dev: false,
  version: "test",
});
includes("fallback title", plainHtml, '<h1 class="page-title">Plain</h1>');
notIncludes("config features only on home", plainHtml, "Config feature");

const missing = renderNotFound({
  config,
  entry: notFoundEntry(config),
  entries: collection.entries,
  sidebar,
  nav,
  toc: [],
  prev: null,
  next: null,
  assets: { css: [], js: [] },
  dev: false,
  version: "test",
});
includes("404 html", missing, "Page not found");
includes("404 noindex", missing, 'content="noindex,nofollow"');

const error = renderErrorPage(fail("Boom", "Try again"), { config, status: 500 });
includes("error status", error, "500");
includes("error message", error, "Boom");
includes("error hint", error, "Try again");

cleanup(root);
done("render");

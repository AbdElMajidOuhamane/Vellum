import { done, eq, tempDir, writeFile, cleanup, load } from "./lib.js";

const routing = await load("../src/server/routing.js");
const configModule = await load("../src/config.js");
const { routeRequest } = routing;
const { resolveConfig } = configModule;

const root = tempDir("router");
writeFile(root + "/public/logo.svg", "<svg></svg>");
writeFile(root + "/public/files/data.txt", "data");

const config = resolveConfig(
  { base: "/", search: { enabled: true } },
  { root, configPath: root + "/vellum.config.js" },
);
const rootEntry = { route: "/" };
const guideEntry = { route: "/guide/" };
const byRoute = new Map([
  ["/", rootEntry],
  ["/guide/", guideEntry],
]);

eq("root page", routeRequest("/", config, byRoute).type, "page");
eq("guide page", routeRequest("/guide/", config, byRoute).type, "page");
eq("guide redirect", routeRequest("/guide", config, byRoute).type, "redirect");
eq("guide redirect status", routeRequest("/guide", config, byRoute).status, 301);
eq("guide redirect location", routeRequest("/guide", config, byRoute).location, "/guide/");
eq("missing", routeRequest("/missing/", config, byRoute).type, "not-found");
eq("version", routeRequest("/__vellum/version", config, byRoute).type, "version");
eq("live", routeRequest("/__vellum/live.js", config, byRoute).type, "live-js");
eq("theme css", routeRequest("/assets/vellum.css", config, byRoute).type, "theme-css");
eq("theme js", routeRequest("/assets/vellum.js", config, byRoute).type, "theme-js");
eq("search json", routeRequest("/search-index.json", config, byRoute).type, "search-json");
eq("public asset", routeRequest("/logo.svg", config, byRoute).type, "asset");
eq("public nested asset", routeRequest("/files/data.txt", config, byRoute).type, "asset");
eq("traversal safe", routeRequest("/../secret", config, byRoute).type, "not-found");

const baseConfig = resolveConfig(
  { base: "/docs/", search: { enabled: false } },
  { root, configPath: root + "/vellum.config.js" },
);
const baseRoutes = new Map([
  ["/", rootEntry],
  ["/guide/", guideEntry],
]);
eq("base root redirect", routeRequest("/", baseConfig, baseRoutes).type, "redirect");
eq("base root location", routeRequest("/", baseConfig, baseRoutes).location, "/docs/");
eq("base page", routeRequest("/docs/", baseConfig, baseRoutes).type, "page");
eq("base guide", routeRequest("/docs/guide/", baseConfig, baseRoutes).type, "page");
eq("base guide redirect", routeRequest("/docs/guide", baseConfig, baseRoutes).location, "/docs/guide/");
eq("outside base", routeRequest("/other/", baseConfig, baseRoutes).type, "not-found");
eq("disabled search", routeRequest("/docs/search-index.json", baseConfig, baseRoutes).type, "not-found");

cleanup(root);
done("router");

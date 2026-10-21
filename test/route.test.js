import { eq, done, throws } from "./lib.js";
import {
  fallbackTitle,
  normalizeRequestRoute,
  outputFileForRoute,
  routeForFile,
} from "../src/content/route.js";

eq("root index", routeForFile("index.md", {}, true), "/");
eq("nested index", routeForFile("guide/index.md", {}, true), "/guide/");
eq("nested page", routeForFile("guide/intro.md", {}, true), "/guide/intro/");
eq("no trailing slash", routeForFile("guide/intro.md", {}, false), "/guide/intro");
eq("slug absolute", routeForFile("guide/intro.md", { slug: "/custom/" }, true), "/custom/");
eq("slug relative", routeForFile("guide/intro.md", { slug: "custom" }, true), "/custom/");
eq("slug md extension", routeForFile("a.md", { slug: "/custom.md" }, true), "/custom/");
throws("slug traversal", () => routeForFile("a.md", { slug: "../escape" }, true), "escapes");

eq("output root", outputFileForRoute("/", true), "index.html");
eq("output nested", outputFileForRoute("/guide/", true), "guide/index.html");
eq("output flat", outputFileForRoute("/guide/", false), "guide.html");

eq("normalize slash", normalizeRequestRoute("/guide/intro", true), "/guide/intro/");
eq("normalize index html", normalizeRequestRoute("/guide/index.html", true), "/guide/");
eq("normalize root html", normalizeRequestRoute("/index.html", true), "/");
eq("normalize flat html", normalizeRequestRoute("/guide.html", true), "/guide/");
eq("normalize root", normalizeRequestRoute("/", true), "/");

eq("fallback root", fallbackTitle("index.md", "/", "My Docs"), "My Docs");
eq("fallback nested index", fallbackTitle("guide/index.md", "/guide/", "My Docs"), "Guide");
eq("fallback page", fallbackTitle("guide/getting-started.md", "/guide/getting-started/", "My Docs"), "Getting Started");

done("route");

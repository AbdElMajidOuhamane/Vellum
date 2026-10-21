import { check, eq, done } from "./lib.js";
import {
  basename,
  cleanRoute,
  dirname,
  encodeRoutePath,
  extname,
  humanize,
  isAbsolute,
  isWithin,
  join,
  normalize,
  normalizeBase,
  outputFileToRoute,
  relative,
  routeToOutputFile,
  stripBase,
  withBase,
  withTrailingSlash,
  withoutTrailingSlash,
} from "../src/util/path.js";

eq("normalize dots", normalize("a/./b/../c"), "a/c");
eq("normalize absolute", normalize("/a//b/../c/"), "/a/c");
eq("normalize root", normalize("/"), "/");
eq("normalize relative", normalize("a/b"), "a/b");
eq("isAbsolute", isAbsolute("/a"), true);
eq("isAbsolute relative", isAbsolute("a"), false);

eq("join", join(["a", "b", "c"]), "a/b/c");
eq("join absolute last", join(["/a", "b"]), "/a/b");
eq("dirname file", dirname("/a/b/c.md"), "/a/b");
eq("dirname root child", dirname("/a"), "/");
eq("dirname bare", dirname("a"), ".");
eq("basename", basename("/a/b/c.md"), "c.md");
eq("basename ext", basename("/a/b/c.md", ".md"), "c");
eq("extname", extname("/a/b/c.tar.md"), ".md");
eq("extname dotfile", extname("/a/.env"), "");

eq("relative child", relative("/a/b", "/a/b/c/d"), "c/d");
eq("relative up", relative("/a/b/c", "/a/x"), "../../x");
eq("relative same", relative("/a", "/a"), ".");
check("isWithin", isWithin("/a", "/a/b/c"));
check("isWithin traversal", !isWithin("/a", "/a/../b"));

eq("normalizeBase empty", normalizeBase(""), "/");
eq("normalizeBase docs", normalizeBase("docs"), "/docs/");
eq("normalizeBase slash", normalizeBase("/docs"), "/docs/");
eq("withTrailingSlash", withTrailingSlash("/a"), "/a/");
eq("withoutTrailingSlash", withoutTrailingSlash("/a/"), "/a");
eq("cleanRoute", cleanRoute("guide/intro", true), "/guide/intro/");
eq("cleanRoute no slash", cleanRoute("/guide/intro", false), "/guide/intro");
eq("cleanRoute root", cleanRoute("", true), "/");

eq("withBase root", withBase("/", "/guide/"), "/guide/");
eq("withBase prefix", withBase("/docs/", "/guide/"), "/docs/guide/");
eq("withBase root route", withBase("/docs/", "/"), "/docs/");
eq("withBase external", withBase("/docs/", "https://example.com"), "https://example.com");
eq("withBase anchor", withBase("/docs/", "#x"), "#x");
eq("withBase idempotent", withBase("/docs/", "/docs/guide/"), "/docs/guide/");
eq("withBase idempotent root", withBase("/docs/", "/docs/"), "/docs/");
eq("withBase bare base", withBase("/docs/", "/docs"), "/docs/");

eq("stripBase none", stripBase("/", "/guide/"), "/guide/");
eq("stripBase prefix", stripBase("/docs/", "/docs/guide/"), "/guide/");
eq("stripBase root", stripBase("/docs/", "/docs/"), "/");
eq("stripBase miss", stripBase("/docs/", "/other/"), null);

eq("routeToOutputFile root", routeToOutputFile("/", true), "index.html");
eq("routeToOutputFile nested", routeToOutputFile("/guide/intro/", true), "guide/intro/index.html");
eq("routeToOutputFile flat", routeToOutputFile("/guide/intro", false), "guide/intro.html");
eq("outputFileToRoute root", outputFileToRoute("index.html"), "/");
eq("outputFileToRoute nested", outputFileToRoute("guide/intro/index.html"), "/guide/intro/");
eq("outputFileToRoute flat", outputFileToRoute("guide/intro.html"), "/guide/intro");

eq("humanize", humanize("getting-started"), "Getting Started");
eq("encodeRoutePath", encodeRoutePath("/hello world/"), "/hello%20world/");

done("path");

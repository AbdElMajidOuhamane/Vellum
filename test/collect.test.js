import { check, done, eq, includes, tempDir, throws, writeFile, cleanup } from "./lib.js";
import { collectContent } from "../src/content/collect.js";
import { resolveConfig } from "../src/config.js";
import { buildSidebar, prevNext } from "../src/content/site.js";

const root = tempDir("collect");
writeFile(
  root + "/src/content/docs/index.md",
  "---\ntitle: Home\ndescription: Landing page\n---\n\n# Welcome\n\nIntro paragraph with **markup**.\n",
);
writeFile(
  root + "/src/content/docs/guide/index.md",
  "---\ntitle: Guide\norder: 1\nsidebar:\n  group: Guide\n---\n\n# Guide\n\nGuide index.\n",
);
writeFile(
  root + "/src/content/docs/guide/intro.md",
  "---\norder: 2\nsidebar:\n  label: Introduction\n  group: Guide\n  order: 2\n---\n\n# Getting going\n\nRead [next](./next.md) and [home](/).\n",
);
writeFile(
  root + "/src/content/docs/guide/next.md",
  "---\ntitle: Next page\norder: 3\n---\n\nNext body.\n",
);
writeFile(
  root + "/src/content/docs/draft.md",
  "---\ntitle: Draft\ndraft: true\n---\n\nHidden.\n",
);
writeFile(root + "/src/content/docs/_ignored.md", "# Ignored\n");

const base = {
  base: "/docs/",
  sidebar: "auto",
};
const config = resolveConfig(
  {
    title: "Collect Test",
    ...base,
  },
  { root, configPath: root + "/vellum.config.js" },
);

const collection = collectContent(config);
eq("page count", collection.entries.length, 4);
check("draft excluded", !collection.byRoute.has("/draft/"));
check("underscore excluded", !collection.byRoute.has("/_ignored/"));
eq("root route", collection.byRoute.get("/").title, "Home");
eq("guide index route", collection.byRoute.get("/guide/").title, "Guide");
eq("intro route", collection.byRoute.get("/guide/intro/").title, "Getting going");
eq("intro sidebar label", collection.byRoute.get("/guide/intro/").sidebarLabel, "Introduction");
eq("intro group", collection.byRoute.get("/guide/intro/").sidebarGroup, "Guide");
eq("intro order", collection.byRoute.get("/guide/intro/").sidebarOrder, 2);
eq("root description", collection.byRoute.get("/").description, "Landing page");
eq("root output", collection.byRoute.get("/").outputFile, "index.html");
eq("intro output", collection.byRoute.get("/guide/intro/").outputFile, "guide/intro/index.html");
includes("markdown link rewritten", collection.byRoute.get("/guide/intro/").html, 'href="/docs/guide/next/"');
includes("absolute link base", collection.byRoute.get("/guide/intro/").html, 'href="/docs/"');

const withDrafts = collectContent(config, { includeDrafts: true });
eq("draft included", withDrafts.entries.length, 5);
check("draft route", withDrafts.byRoute.has("/draft/"));

const sidebar = buildSidebar(config, collection.entries, collection.byRoute);
eq("auto sidebar groups", sidebar.map((group) => group.label), ["Overview", "Guide"]);
eq("auto sidebar guide items", sidebar[1].items.length, 3);
eq("auto sidebar first guide", sidebar[1].items[0].label, "Guide");
eq("auto sidebar intro label", sidebar[1].items[1].label, "Introduction");

const adjacent = prevNext(collection.entries, sidebar, "/guide/intro/", collection.byRoute);
eq("prev route", adjacent.prev && adjacent.prev.route, "/guide/");
eq("next route", adjacent.next && adjacent.next.route, "/guide/next/");

const duplicateRoot = tempDir("collect-duplicate");
writeFile(duplicateRoot + "/src/content/docs/a.md", "---\nslug: /same/\n---\nA\n");
writeFile(duplicateRoot + "/src/content/docs/b.md", "---\nslug: /same/\n---\nB\n");
const duplicateConfig = resolveConfig({}, { root: duplicateRoot, configPath: duplicateRoot + "/vellum.config.js" });
throws("duplicate routes", () => collectContent(duplicateConfig), "same route");

cleanup(root);
cleanup(duplicateRoot);
done("collect");

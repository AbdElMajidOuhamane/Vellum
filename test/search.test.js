import { check, done, eq, tempDir, throws, writeFile, cleanup } from "./lib.js";
import { resolveConfig } from "../src/config.js";
import { collectContent } from "../src/content/collect.js";
import {
  buildBreadcrumbs,
  buildSearchIndex,
  buildSidebar,
  checkLinks,
  flattenSidebar,
  prevNext,
  validateActionTargets,
} from "../src/content/site.js";

const root = tempDir("search");
writeFile(root + "/public/known.txt", "ok");
writeFile(
  root + "/src/content/docs/index.md",
  "---\ntitle: Home\ndescription: Start here\n---\n\n# Home\n\n## Section\n\nRead the [guide](/guide/) or [missing](/missing/).\n",
);
writeFile(root + "/src/content/docs/guide.md", "---\ntitle: Guide\n---\n\n# Guide\n\nBody.\n");

const config = resolveConfig(
  { base: "/docs/", sidebar: "auto" },
  { root, configPath: root + "/vellum.config.js" },
);
const collection = collectContent(config);

const index = buildSearchIndex(collection.entries, config);
eq("search records", index.length, 2);
const homeRecord = index.find((record) => record.route === "/docs/");
const guideRecord = index.find((record) => record.route === "/docs/guide/");
check("search root route", homeRecord !== undefined);
check("search guide route", guideRecord !== undefined);
check("search headings", homeRecord && homeRecord.headings.includes("Section"));
check("search text", homeRecord && homeRecord.text.includes("Read the guide"));

const issues = checkLinks(collection.entries, config);
eq("broken link count", issues.length, 1);
check("broken link href", issues[0].href === "/missing/");
check("broken link file", issues[0].file === "index.md");
check("broken link message", issues[0].message.includes("Broken link"));

const sidebar = buildSidebar(config, collection.entries, collection.byRoute);
eq("auto sidebar", sidebar[0].label, "Overview");
eq("flat sidebar length", flattenSidebar(sidebar).length, 2);
const adjacent = prevNext(collection.entries, sidebar, "/guide/", collection.byRoute);
eq("next is null at end", adjacent.next, null);

const crumbs = buildBreadcrumbs(collection.byRoute.get("/guide/"), collection.byRoute, config);
eq("breadcrumb start", crumbs[0].label, "Home");
eq("breadcrumb count", crumbs.length, 2);
eq("breadcrumb last", crumbs[1].label, "Guide");

const missingSidebar = resolveConfig(
  { sidebar: [{ label: "Missing", link: "/nope/" }] },
  { root, configPath: root + "/vellum.config.js" },
);
throws(
  "sidebar missing route",
  () => buildSidebar(missingSidebar, collection.entries, collection.byRoute),
  "no page has the route",
);

const brokenAction = resolveConfig(
  {
    base: "/docs/",
    sidebar: "auto",
    hero: { actions: [{ text: "Missing", link: "/nope/" }] },
  },
  { root, configPath: root + "/vellum.config.js" },
);
throws(
  "cta missing route",
  () => validateActionTargets(brokenAction, collection.entries, collection.byRoute),
  "no page has the route",
);

const brokenFeature = resolveConfig(
  {
    base: "/docs/",
    sidebar: "auto",
    features: [{ title: "Missing", description: "Card.", link: "/nope/" }],
  },
  { root, configPath: root + "/vellum.config.js" },
);
throws(
  "feature missing route",
  () => validateActionTargets(brokenFeature, collection.entries, collection.byRoute),
  "no page has the route",
);

const goodActions = resolveConfig(
  {
    base: "/docs/",
    sidebar: "auto",
    hero: {
      actions: [
        { text: "Guide", link: "/guide/" },
        { text: "External", link: "https://example.com" },
        { text: "Anchor", link: "#start" },
        { text: "File", link: "/known.txt" },
      ],
    },
    features: [{ title: "Guide", description: "Route without a slash.", link: "/guide" }],
  },
  { root, configPath: root + "/vellum.config.js" },
);
validateActionTargets(goodActions, collection.entries, collection.byRoute);
check("cta targets ok", true);

cleanup(root);
done("search+links");

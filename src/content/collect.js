// @flow
/*:: import type { ContentEntry, Frontmatter, ResolvedConfig, SidebarMeta } from "../types.js"; */
import { fail } from "../util/errors.js";
import { walkFiles, readText } from "../util/fs.js";
import { basename, humanize, relative, stripExtension } from "../util/path.js";
import { parseDocument } from "./frontmatter.js";
import { renderMarkdown } from "./markdown.js";
import { fallbackTitle, outputFileForRoute, routeForFile } from "./route.js";

/*::
export type CollectOptions = {
  includeDrafts?: boolean,
};

export type ContentCollection = {
  entries: Array<ContentEntry>,
  byRoute: Map<string, ContentEntry>,
  warnings: Array<string>,
};
*/

function firstParagraph(html /*: string */) /*: string */ {
  const match = /<p>([\s\S]*?)<\/p>/.exec(html);
  if (!match) {
    return "";
  }
  return match[1].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

function sidebarMeta(frontmatter /*: Frontmatter */) /*: SidebarMeta */ {
  const meta = frontmatter.sidebar;
  if (!meta || typeof meta !== "object" || Array.isArray(meta)) {
    return {};
  }
  return meta;
}

function groupFor(relativeFile /*: string */, meta /*: SidebarMeta */) /*: string */ {
  if (meta.group && typeof meta.group === "string") {
    return meta.group;
  }
  const segments = relativeFile.split("/").filter(Boolean);
  if (segments.length <= 1) {
    return "Overview";
  }
  return humanize(segments[0]);
}

function titleFor(
  frontmatter /*: Frontmatter */,
  headings /*: Array<{ level: number, text: string, id: string }> */,
  relativeFile /*: string */,
  route /*: string */,
  config /*: ResolvedConfig */,
) /*: string */ {
  const explicitTitle = frontmatter.title;
  if (typeof explicitTitle === "string" && explicitTitle.trim()) {
    return explicitTitle.trim();
  }
  for (const heading of headings) {
    if (heading.level === 1 && heading.text) {
      return heading.text;
    }
  }
  return fallbackTitle(relativeFile, route, config.title);
}

function descriptionFor(
  frontmatter /*: Frontmatter */,
  html /*: string */,
  bodyText /*: string */,
  config /*: ResolvedConfig */,
) /*: string */ {
  const explicitDescription = frontmatter.description;
  if (typeof explicitDescription === "string" && explicitDescription.trim()) {
    return explicitDescription.trim();
  }
  const paragraph = firstParagraph(html);
  const candidate = paragraph || bodyText;
  if (!candidate) {
    return config.description;
  }
  if (candidate.length <= 160) {
    return candidate;
  }
  const sliced = candidate.slice(0, 160);
  const space = sliced.lastIndexOf(" ");
  return (space > 100 ? sliced.slice(0, space) : sliced).trim() + "\u2026";
}

function compareEntries(a /*: ContentEntry */, b /*: ContentEntry */) /*: number */ {
  if (a.sidebarOrder !== b.sidebarOrder) {
    return a.sidebarOrder - b.sidebarOrder;
  }
  if (a.sidebarLabel !== b.sidebarLabel) {
    return a.sidebarLabel < b.sidebarLabel ? -1 : 1;
  }
  return a.route < b.route ? -1 : a.route > b.route ? 1 : 0;
}

function isIgnoredPath(relativeFile /*: string */) /*: boolean */ {
  return relativeFile
    .split("/")
    .some((segment) => segment.startsWith("_") || segment.startsWith("."));
}

export function collectContent(
  config /*: ResolvedConfig */,
  options /*: CollectOptions */ = {},
) /*: ContentCollection */ {
  const includeDrafts = options.includeDrafts === true || config.drafts === true;
  const files = walkFiles(config.srcDir, {
    extensions: [".md", ".markdown"],
    includeHidden: false,
  }).filter((file) => !isIgnoredPath(relative(config.srcDir, file)));

  const warnings = [];
  if (files.length === 0) {
    warnings.push(
      "No Markdown files found in `" + config.srcDir + "`.",
    );
  }

  const entries /*: Array<ContentEntry> */ = [];
  const byRoute /*: Map<string, ContentEntry> */ = new Map();

  for (const file of files) {
    const relativeFile = relative(config.srcDir, file).replace(/\\/g, "/");
    const source = readText(file);
    if (source === null) {
      throw fail(
        "Could not read content file `" + relativeFile + "`.",
        "Check the file exists and is smaller than Fairyfly's 10MB read limit.",
      );
    }

    const document = parseDocument(source, relativeFile);
    const frontmatter = document.frontmatter;
    const draft = frontmatter.draft === true;
    if (draft && !includeDrafts) {
      continue;
    }

    const route = routeForFile(relativeFile, frontmatter, config.trailingSlash);
    if (byRoute.has(route)) {
      const existing = byRoute.get(route);
      throw fail(
        "Two content files map to the same route `" + route + "`: `" +
          (existing ? existing.relativeFile : "?") + "` and `" + relativeFile + "`.",
        "Give one page a unique `slug` in frontmatter, or rename the file.",
      );
    }

    const parsed = renderMarkdown(document.body, {
      tables: config.markdown.tables,
      callouts: config.markdown.callouts,
      headingAnchors: config.markdown.headingAnchors,
      externalLinksNewTab: config.markdown.externalLinksNewTab,
      base: config.base,
      currentRoute: route,
      currentFile: relativeFile,
      trailingSlash: config.trailingSlash,
    });

    const title = titleFor(frontmatter, parsed.headings, relativeFile, route, config);
    const description = descriptionFor(frontmatter, parsed.html, parsed.bodyText, config);
    const meta = sidebarMeta(frontmatter);
    const metaLabel = meta.label;
    const sidebarLabel =
      typeof metaLabel === "string" && metaLabel.trim() ? metaLabel.trim() : title;
    const sidebarOrder =
      typeof frontmatter.order === "number"
        ? frontmatter.order
        : typeof meta.order === "number"
          ? meta.order
          : basename(stripExtension(relativeFile)) === "index"
            ? -10
            : 0;

    const entry /*: ContentEntry */ = {
      file,
      relativeFile,
      route,
      outputFile: outputFileForRoute(route, config.trailingSlash),
      frontmatter,
      title,
      description,
      sidebarLabel,
      sidebarOrder,
      sidebarGroup: groupFor(relativeFile, meta),
      sidebarHidden: meta.hidden === true,
      draft,
      order: sidebarOrder,
      html: parsed.html,
      headings: parsed.headings,
      bodyText: parsed.bodyText,
      links: parsed.links,
      source: document.body,
    };

    entries.push(entry);
    byRoute.set(route, entry);
  }

  entries.sort(compareEntries);
  return { entries, byRoute, warnings };
}

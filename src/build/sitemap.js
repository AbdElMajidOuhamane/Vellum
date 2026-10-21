// @flow
/*:: import type { ContentEntry, ResolvedConfig } from "../types.js"; */
import { escapeHtml } from "../util/html.js";
import { withBase } from "../util/path.js";

export function buildSitemap(
  entries /*: Array<ContentEntry> */,
  config /*: ResolvedConfig */,
) /*: string */ {
  if (!config.site) {
    return "";
  }
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n';
  for (const entry of entries) {
    if (entry.draft) {
      continue;
    }
    xml += "  <url><loc>" + escapeHtml(config.site + withBase(config.base, entry.route)) + "</loc></url>\n";
  }
  xml += "</urlset>\n";
  return xml;
}

export function buildRobots(config /*: ResolvedConfig */) /*: string */ {
  let text = "User-agent: *\nAllow: /\n";
  if (config.site) {
    text += "\nSitemap: " + config.site + withBase(config.base, "/sitemap.xml") + "\n";
  }
  return text;
}

// @flow
/*:: import type { Heading, LinkRef, ParsedMarkdown } from "../types.js"; */
import {
  escapeAttr,
  escapeCode,
  escapeHtml,
  isExternalUrl,
  plainTextFromHtml,
} from "../util/html.js";
import { cleanRoute, dirname, withBase } from "../util/path.js";
import { createSlugger } from "./slug.js";
import { renderInline, inlineText } from "./inline.js";
/*:: import type { InlineOptions, Reference } from "./inline.js"; */

/*::
export type MarkdownOptions = {
  tables?: boolean,
  callouts?: boolean,
  headingAnchors?: boolean,
  externalLinksNewTab?: boolean,
  base?: string,
  currentRoute?: string,
  currentFile?: string,
  trailingSlash?: boolean,
  resolveUrl?: (url: string, kind: "link" | "image") => string,
};

type BlockContext = {
  slugger: (value: string) => string,
  headings: Array<Heading>,
  links: Array<LinkRef>,
  references: Map<string, Reference>,
  options: MarkdownOptions,
  inlineOptions: InlineOptions,
  inList: boolean,
};
*/

const LIST_RE = /^( *)([-+*]|\d{1,9}[.)])( +)(.*)$/;
const FENCE_RE = /^ {0,3}(`{3,}|~{3,})\s*([^\s`]*)\s*(.*)$/;
const HEADING_RE = /^ {0,3}(#{1,6})(?:[ \t]+(.*?))?[ \t]*$/;
const HR_RE = /^ {0,3}(?:(?:\*[ \t]*){3,}|(?:-[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const BLOCK_HTML_RE = /^\s*<\/?(?:address|article|aside|base|blockquote|body|caption|center|col|colgroup|dd|details|dialog|dir|div|dl|dt|fieldset|figcaption|figure|footer|form|frame|frameset|h[1-6]|head|header|hr|html|iframe|legend|li|link|main|menu|menuitem|nav|noframes|ol|optgroup|option|p|param|pre|script|search|section|select|source|style|summary|svg|table|tbody|td|textarea|tfoot|th|thead|title|tr|track|ul|video|audio|canvas|picture|input|button|label|time|mark)\b/i;

function isBlank(line /*: string */) /*: boolean */ {
  return /^\s*$/.test(line);
}

function indentOf(line /*: string */) /*: number */ {
  const match = /^ */.exec(line);
  let width = match ? match[0].length : 0;
  if (line.charAt(width) === "\t") {
    width += 4;
  }
  return width;
}

function stripIndent(line /*: string */, width /*: number */) /*: string */ {
  let index = 0;
  let removed = 0;
  while (index < line.length && removed < width) {
    if (line.charAt(index) === " ") {
      index += 1;
      removed += 1;
    } else if (line.charAt(index) === "\t") {
      index += 1;
      removed += 4;
    } else {
      break;
    }
  }
  return line.slice(index);
}

function splitRow(line /*: string */) /*: Array<string> */ {
  let text = line.trim();
  if (text.startsWith("|")) {
    text = text.slice(1);
  }
  if (text.endsWith("|") && !text.endsWith("\\|")) {
    text = text.slice(0, -1);
  }
  const cells = [];
  let current = "";
  for (let index = 0; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === "\\" && text.charAt(index + 1) === "|") {
      current += "\\|";
      index += 1;
      continue;
    }
    if (char === "|") {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

function tableAlignment(cell /*: string */) /*: string */ {
  const left = cell.trim().startsWith(":");
  const right = cell.trim().endsWith(":");
  if (left && right) {
    return "center";
  }
  if (right) {
    return "right";
  }
  if (left) {
    return "left";
  }
  return "";
}

function isTableStart(lines /*: Array<string> */, index /*: number */) /*: boolean */ {
  if (index + 1 >= lines.length) {
    return false;
  }
  const header = lines[index];
  const separator = lines[index + 1];
  if (!header.includes("|") || !separator.includes("|")) {
    return false;
  }
  if (!separator.includes("-")) {
    return false;
  }
  const headerCells = splitRow(header);
  const separatorCells = splitRow(separator);
  if (headerCells.length < 1 || headerCells.length !== separatorCells.length) {
    return false;
  }
  return separatorCells.every((cell) => /^:?-{2,}:?$/.test(cell.trim()));
}

function isFence(line /*: string */) /*: boolean */ {
  return FENCE_RE.test(line);
}

function isBlockStart(line /*: string */) /*: boolean */ {
  if (isBlank(line)) {
    return true;
  }
  const trimmed = line.trimStart();
  return (
    isFence(line) ||
    HEADING_RE.test(line) ||
    HR_RE.test(line) ||
    /^ {0,3}>/.test(line) ||
    LIST_RE.test(line) ||
    BLOCK_HTML_RE.test(trimmed) ||
    trimmed.startsWith("<!--") ||
    trimmed.startsWith("<!DOCTYPE") ||
    /^ {4}/.test(line)
  );
}

function parseReferenceDefinitions(
  lines /*: Array<string> */,
) /*: { lines: Array<string>, references: Map<string, Reference> } */ {
  const references /*: Map<string, Reference> */ = new Map();
  const output = [];
  let inFence = false;
  let fenceChar = "";
  let fenceLength = 0;

  for (const line of lines) {
    const opening = FENCE_RE.exec(line);
    if (!inFence && opening) {
      inFence = true;
      fenceChar = opening[1].charAt(0);
      fenceLength = opening[1].length;
      output.push(line);
      continue;
    }
    if (inFence) {
      const close = new RegExp("^ {0,3}" + (fenceChar === "`" ? "`" : "~") + "{" + fenceLength + ",}\\s*$");
      if (close.test(line)) {
        inFence = false;
      }
      output.push(line);
      continue;
    }

    const match = /^ {0,3}\[([^\]]+)\]:\s*(?:<([^>]+)>|(\S+))(?:\s+(?:"([^"]*)"|'([^']*)'|\(([^)]*)\)))?\s*$/.exec(
      line,
    );
    if (!match) {
      output.push(line);
      continue;
    }
    const key = match[1].trim().toLowerCase().replace(/\s+/g, " ");
    references.set(key, {
      url: match[2] || match[3] || "",
      title: match[4] || match[5] || match[6] || undefined,
    });
    output.push("");
  }

  return { lines: output, references };
}

function renderHeading(
  level /*: number */,
  rawText /*: string */,
  context /*: BlockContext */,
) /*: string */ {
  const text = rawText.replace(/[ \t]+#+[ \t]*$/, "").trim();
  const id = context.slugger(inlineText(text, context.inlineOptions));
  const headingText = inlineText(text, context.inlineOptions);
  context.headings.push({ level, text: headingText, id });
  const content = renderInline(text, context.inlineOptions);
  const anchor =
    context.options.headingAnchors === false
      ? ""
      : '<a class="heading-anchor" href="#' +
        escapeAttr(id) +
        '" aria-label="Link to section: ' +
        escapeAttr(headingText) +
        '">#</a>';
  return "<h" + String(level) + ' id="' + escapeAttr(id) + '">' + content + anchor + "</h" + String(level) + ">";
}

function renderCodeBlock(language /*: string */, code /*: string */) /*: string */ {
  const lang = (language || "").replace(/[^A-Za-z0-9_+.-]/g, "").toLowerCase();
  const className = lang ? ' class="language-' + lang + '"' : "";
  const label = lang ? ' data-language="' + escapeAttr(lang) + '"' : "";
  return (
    '<pre class="code-block"' +
    label +
    '><code' +
    className +
    ">" +
    escapeCode(code.replace(/\n$/, "")) +
    "</code></pre>"
  );
}

function parseFence(
  lines /*: Array<string> */,
  start /*: number */,
  context /*: BlockContext */,
) /*: { html: string, next: number } */ {
  const opening = FENCE_RE.exec(lines[start]);
  if (!opening) {
    return { html: "", next: start + 1 };
  }
  const marker = opening[1];
  const fenceChar = marker.charAt(0);
  const length = marker.length;
  const language = opening[2] || "";
  const close = new RegExp("^ {0,3}" + (fenceChar === "`" ? "`" : "~") + "{" + length + ",}\\s*$");
  const content = [];
  let index = start + 1;
  while (index < lines.length && !close.test(lines[index])) {
    content.push(lines[index]);
    index += 1;
  }
  if (index < lines.length) {
    index += 1;
  }
  return { html: renderCodeBlock(language, content.join("\n")), next: index };
}

function parseIndentedCode(
  lines /*: Array<string> */,
  start /*: number */,
) /*: { html: string, next: number } */ {
  const content = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index];
    if (isBlank(line)) {
      content.push("");
      index += 1;
      continue;
    }
    if (!/^ {4}|^\t/.test(line)) {
      break;
    }
    content.push(stripIndent(line, 4));
    index += 1;
  }
  while (content.length > 0 && content[content.length - 1] === "") {
    content.pop();
  }
  return { html: renderCodeBlock("", content.join("\n")), next: index };
}

function parseBlockquote(
  lines /*: Array<string> */,
  start /*: number */,
  context /*: BlockContext */,
) /*: { html: string, next: number } */ {
  const quoted = [];
  let index = start;
  while (index < lines.length) {
    const line = lines[index];
    if (/^ {0,3}>/.test(line)) {
      quoted.push(line.replace(/^ {0,3}> ?/, ""));
      index += 1;
      continue;
    }
    if (isBlank(line)) {
      break;
    }
    break;
  }

  let calloutType = "";
  let calloutTitle = "";
  if (context.options.callouts !== false && quoted.length > 0) {
    const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)$/i.exec(quoted[0].trim());
    if (match) {
      calloutType = match[1].toLowerCase();
      calloutTitle = match[2].trim() || match[1].charAt(0) + match[1].slice(1).toLowerCase();
      quoted.shift();
    }
  }

  const inner = parseBlocks(quoted, context);
  if (calloutType) {
    return {
      html:
        '<div class="callout callout-' +
        calloutType +
        '"><p class="callout-title">' +
        escapeHtml(calloutTitle) +
        "</p>" +
        inner +
        "</div>",
      next: index,
    };
  }
  return { html: "<blockquote>" + inner + "</blockquote>", next: index };
}

function parseTable(
  lines /*: Array<string> */,
  start /*: number */,
  context /*: BlockContext */,
) /*: { html: string, next: number } */ {
  const headerCells = splitRow(lines[start]);
  const separatorCells = splitRow(lines[start + 1]);
  const alignments = separatorCells.map(tableAlignment);
  const rows = [];
  let index = start + 2;
  while (index < lines.length && !isBlank(lines[index]) && lines[index].includes("|")) {
    if (isBlockStart(lines[index]) && !/^\s*\|/.test(lines[index])) {
      break;
    }
    rows.push(splitRow(lines[index]));
    index += 1;
  }

  const renderCells = (cells /*: Array<string> */, tag /*: string */) /*: string */ =>
    cells
      .map((cell, cellIndex) => {
        const alignment = alignments[cellIndex] || "";
        const className = alignment ? ' class="align-' + alignment + '"' : "";
        return (
          "<" +
          tag +
          className +
          ">" +
          renderInline(cell, context.inlineOptions) +
          "</" +
          tag +
          ">"
        );
      })
      .join("");

  let html = '<div class="table-wrap"><table><thead><tr>';
  html += renderCells(headerCells, "th");
  html += "</tr></thead><tbody>";
  for (const row of rows) {
    const padded = headerCells.map((cell, cellIndex) =>
      row[cellIndex] === undefined ? "" : row[cellIndex],
    );
    html += "<tr>" + renderCells(padded, "td") + "</tr>";
  }
  html += "</tbody></table></div>";
  return { html, next: index };
}

function parseHtmlBlock(
  lines /*: Array<string> */,
  start /*: number */,
) /*: { html: string, next: number } */ {
  const content = [];
  let index = start;
  const first = lines[start].trim();
  const lower = first.toLowerCase();
  let closingTag = "";

  if (lower.startsWith("<!--")) {
    closingTag = "-->";
  } else if (lower.startsWith("<script")) {
    closingTag = "</script>";
  } else if (lower.startsWith("<style")) {
    closingTag = "</style>";
  } else if (lower.startsWith("<pre")) {
    closingTag = "</pre>";
  }

  if (closingTag) {
    while (index < lines.length) {
      content.push(lines[index]);
      if (lines[index].toLowerCase().includes(closingTag)) {
        index += 1;
        break;
      }
      index += 1;
    }
    return { html: content.join("\n"), next: index };
  }

  while (index < lines.length && !isBlank(lines[index])) {
    content.push(lines[index]);
    index += 1;
  }
  return { html: content.join("\n"), next: index };
}

function unwrapParagraph(html /*: string */) /*: string */ {
  const match = /^<p>([\s\S]*)<\/p>$/.exec(html.trim());
  return match ? match[1] : html;
}

function parseList(
  lines /*: Array<string> */,
  start /*: number */,
  context /*: BlockContext */,
) /*: { html: string, next: number } */ {
  const first = LIST_RE.exec(lines[start]);
  if (!first) {
    return { html: "", next: start + 1 };
  }
  const baseIndent = first[1].length;
  const ordered = /^\d/.test(first[2]);
  const startNumber = ordered ? parseInt(first[2], 10) : 1;
  const items = [];
  let loose = false;
  let index = start;

  while (index < lines.length) {
    const line = lines[index];
    if (isBlank(line)) {
      let lookahead = index + 1;
      while (lookahead < lines.length && isBlank(lines[lookahead])) {
        lookahead += 1;
      }
      if (lookahead >= lines.length) {
        index = lookahead;
        break;
      }
      const nextMarker = LIST_RE.exec(lines[lookahead]);
      if (
        nextMarker &&
        nextMarker[1].length === baseIndent &&
        /^\d/.test(nextMarker[2]) === ordered
      ) {
        loose = true;
        index = lookahead;
        continue;
      }
      break;
    }

    const marker = LIST_RE.exec(line);
    if (
      !marker ||
      marker[1].length !== baseIndent ||
      /^\d/.test(marker[2]) !== ordered
    ) {
      break;
    }

    const contentIndent = marker[1].length + marker[2].length + marker[3].length;
    const itemLines = [marker[4]];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      if (isBlank(nextLine)) {
        let lookahead = index + 1;
        while (lookahead < lines.length && isBlank(lines[lookahead])) {
          lookahead += 1;
        }
        if (lookahead >= lines.length) {
          index = lookahead;
          break;
        }
        const nextMarker = LIST_RE.exec(lines[lookahead]);
        if (
          nextMarker &&
          nextMarker[1].length === baseIndent &&
          /^\d/.test(nextMarker[2]) === ordered
        ) {
          loose = true;
          index = lookahead;
          break;
        }
        if (indentOf(lines[lookahead]) >= contentIndent) {
          loose = true;
          itemLines.push("");
          index += 1;
          continue;
        }
        break;
      }

      const nextMarker = LIST_RE.exec(nextLine);
      if (
        nextMarker &&
        nextMarker[1].length === baseIndent &&
        /^\d/.test(nextMarker[2]) === ordered
      ) {
        break;
      }

      const indent = indentOf(nextLine);
      if (indent >= contentIndent) {
        itemLines.push(stripIndent(nextLine, contentIndent));
        index += 1;
        continue;
      }
      if (indent > baseIndent) {
        itemLines.push(stripIndent(nextLine, indent));
        index += 1;
        continue;
      }
      break;
    }

    items.push(itemLines);
  }

  const tag = ordered ? "ol" : "ul";
  const startAttr = ordered && startNumber !== 1 ? ' start="' + String(startNumber) + '"' : "";
  let hasTask = false;
  const renderedItems = items.map((itemLines) => {
    let task = "";
    const working = itemLines.slice();
    if (working.length > 0) {
      const taskMatch = /^\[([ xX])\]\s+(.*)$/.exec(working[0]);
      if (taskMatch) {
        hasTask = true;
        task =
          '<input type="checkbox" disabled' +
          (taskMatch[1].toLowerCase() === "x" ? " checked" : "") +
          "> ";
        working[0] = taskMatch[2];
      }
    }
    const innerContext = context;
    let inner = parseBlocks(working, innerContext);
    if (!loose) {
      inner = unwrapParagraph(inner).replace(/^<p>([\s\S]*?)<\/p>/, "$1");
    }
    if (task) {
      inner = inner.replace(/^(<p>)?/, (match) => match + task);
    }
    return (
      '<li' +
      (task ? ' class="task-list-item"' : "") +
      ">" +
      inner +
      "</li>"
    );
  });

  const listClass = hasTask ? ' class="contains-task-list"' : "";
  return {
    html: "<" + tag + startAttr + listClass + ">" + renderedItems.join("") + "</" + tag + ">",
    next: index,
  };
}

function parseParagraph(
  lines /*: Array<string> */,
  start /*: number */,
  context /*: BlockContext */,
) /*: { html: string, next: number } */ {
  const content = [lines[start]];
  let index = start + 1;
  while (index < lines.length && !isBlank(lines[index]) && !isBlockStart(lines[index])) {
    if (isTableStart(lines, index)) {
      break;
    }
    content.push(lines[index]);
    index += 1;
  }
  const text = content.join("\n");
  return {
    html: "<p>" + renderInline(text, context.inlineOptions) + "</p>",
    next: index,
  };
}

export function parseBlocks(lines /*: Array<string> */, context /*: BlockContext */) /*: string */ {
  let html = "";
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    if (isBlank(line)) {
      index += 1;
      continue;
    }

    const fence = FENCE_RE.exec(line);
    if (fence) {
      const parsed = parseFence(lines, index, context);
      html += parsed.html;
      index = parsed.next;
      continue;
    }

    const heading = HEADING_RE.exec(line);
    if (heading) {
      html += renderHeading(heading[1].length, heading[2] || "", context);
      index += 1;
      continue;
    }

    if (
      index + 1 < lines.length &&
      /^ {0,3}(=+|-+)\s*$/.test(lines[index + 1]) &&
      !isBlank(line) &&
      !isBlockStart(line)
    ) {
      html += renderHeading(
        lines[index + 1].trim().startsWith("=") ? 1 : 2,
        line,
        context,
      );
      index += 2;
      continue;
    }

    if (HR_RE.test(line)) {
      html += "<hr>";
      index += 1;
      continue;
    }

    if (/^ {0,3}>/.test(line)) {
      const parsed = parseBlockquote(lines, index, context);
      html += parsed.html;
      index = parsed.next;
      continue;
    }

    if (LIST_RE.test(line)) {
      const parsed = parseList(lines, index, context);
      html += parsed.html;
      index = parsed.next > index ? parsed.next : index + 1;
      continue;
    }

    if (context.options.tables !== false && isTableStart(lines, index)) {
      const parsed = parseTable(lines, index, context);
      html += parsed.html;
      index = parsed.next;
      continue;
    }

    if (BLOCK_HTML_RE.test(line.trim()) || line.trim().startsWith("<!--") || line.trim().startsWith("<!DOCTYPE")) {
      const parsed = parseHtmlBlock(lines, index);
      html += parsed.html;
      index = parsed.next;
      continue;
    }

    if (/^ {4}|^\t/.test(line)) {
      const parsed = parseIndentedCode(lines, index);
      html += parsed.html;
      index = parsed.next;
      continue;
    }

    const parsed = parseParagraph(lines, index, context);
    html += parsed.html;
    index = parsed.next > index ? parsed.next : index + 1;
  }

  return html;
}

function defaultResolveUrl(
  url /*: string */,
  kind /*: "link" | "image" */,
  options /*: MarkdownOptions */,
) /*: string */ {
  if (
    url === "" ||
    url.startsWith("#") ||
    isExternalUrl(url) ||
    url.startsWith("mailto:") ||
    url.startsWith("tel:") ||
    url.startsWith("data:")
  ) {
    return url;
  }
  if (kind === "image") {
    return url.startsWith("/") ? withBase(options.base || "/", url) : url;
  }

  const docMatch = /^([^?#]+)\.(md|markdown)([?#].*)?$/.exec(url);
  if (docMatch) {
    const withSuffix = docMatch[3] || "";
    let path = docMatch[1];
    if (path.startsWith("/")) {
      path = path.replace(/^\/+/, "");
    } else {
      const sourceDirectory = options.currentFile
        ? dirname(options.currentFile)
        : dirname(options.currentRoute || "/");
      const baseSegments /*: Array<string> */ =
        sourceDirectory === "." ? [] : sourceDirectory.split("/").filter(Boolean);
      for (const segment of path.split("/")) {
        if (segment === "" || segment === ".") {
          continue;
        }
        if (segment === "..") {
          baseSegments.pop();
        } else {
          baseSegments.push(segment);
        }
      }
      path = baseSegments.join("/");
    }
    path = path.replace(/\/index$/, "");
    let route = cleanRoute("/" + path, options.trailingSlash !== false);
    return withBase(options.base || "/", route) + withSuffix;
  }

  if (url.startsWith("/")) {
    return withBase(options.base || "/", url);
  }
  return url;
}

export function renderMarkdown(
  source /*: string */,
  options /*: MarkdownOptions */ = {},
) /*: ParsedMarkdown */ {
  const normalized = source.replace(/\r\n?/g, "\n");
  const extracted = parseReferenceDefinitions(normalized.split("\n"));
  const slugger = createSlugger();
  const headings /*: Array<Heading> */ = [];
  const links /*: Array<LinkRef> */ = [];
  const inlineOptions /*: InlineOptions */ = {
    references: extracted.references,
    links,
    externalLinksNewTab: options.externalLinksNewTab === true,
    resolveUrl: (url, kind) =>
      options.resolveUrl ? options.resolveUrl(url, kind) : defaultResolveUrl(url, kind, options),
  };
  const context /*: BlockContext */ = {
    slugger,
    headings,
    links,
    references: extracted.references,
    options,
    inlineOptions,
    inList: false,
  };
  const html = parseBlocks(extracted.lines, context);
  return {
    html,
    headings,
    bodyText: plainTextFromHtml(html.replace(/<a class="heading-anchor"[\s\S]*?<\/a>/g, "")),
    links,
  };
}

export function renderMarkdownFragment(source /*: string */) /*: string */ {
  return renderMarkdown(source).html;
}

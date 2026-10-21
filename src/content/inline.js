// @flow
/*:: import type { LinkRef } from "../types.js"; */
import {
  collapseWhitespace,
  escapeAttr,
  escapeCode,
  escapeHtml,
  isExternalUrl,
  isSafeUrl,
  stripTags,
} from "../util/html.js";

/*::
export type Reference = {
  url: string,
  title: string | void,
};

export type InlineOptions = {
  references?: Map<string, Reference>,
  links?: Array<LinkRef>,
  externalLinksNewTab?: boolean,
  resolveUrl?: (url: string, kind: "link" | "image") => string,
};
*/

const PUNCTUATION = "\\\\`*_{}[]()#+-.!|>~";

function escapeChar(char /*: string */) /*: string */ {
  return escapeHtml(char);
}

function isWordChar(char /*: string */) /*: boolean */ {
  return /[\p{L}\p{N}_]/u.test(char);
}

function countRun(text /*: string */, index /*: number */, char /*: string */) /*: number */ {
  let count = 0;
  while (text.charAt(index + count) === char) {
    count += 1;
  }
  return count;
}

function findClosingBracket(text /*: string */, start /*: number */) /*: number */ {
  let depth = 0;
  for (let index = start; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === "\\") {
      index += 1;
      continue;
    }
    if (char === "`") {
      const run = countRun(text, index, "`");
      const close = text.indexOf("`".repeat(run), index + run);
      if (close >= 0) {
        index = close + run - 1;
        continue;
      }
    }
    if (char === "[") {
      depth += 1;
    } else if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function findClosingParen(text /*: string */, start /*: number */) /*: number */ {
  let depth = 0;
  let quote = "";
  for (let index = start; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (quote) {
      if (char === "\\") {
        index += 1;
        continue;
      }
      if (char === quote) {
        quote = "";
      }
      continue;
    }
    if (char === '"' || char === "'") {
      quote = char;
      continue;
    }
    if (char === "(") {
      depth += 1;
    } else if (char === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function parseDestination(raw /*: string */) /*: { url: string, title: string | void } */ {
  let rest = raw.trim();
  let url = "";
  let title = "";
  if (rest.startsWith("<")) {
    const end = rest.indexOf(">");
    if (end > 0) {
      url = rest.slice(1, end).trim();
      rest = rest.slice(end + 1).trim();
    }
  }
  if (!url) {
    const match = /^(\S+)(?:\s+([\s\S]*))?$/.exec(rest);
    if (!match) {
      return { url: "", title: undefined };
    }
    url = match[1] || "";
    rest = (match[2] || "").trim();
  }
  if (
    (rest.startsWith('"') && rest.endsWith('"')) ||
    (rest.startsWith("'") && rest.endsWith("'"))
  ) {
    title = rest.slice(1, -1);
  } else if (rest.startsWith("(") && rest.endsWith(")")) {
    title = rest.slice(1, -1);
  }
  return { url, title: title || undefined };
}

function findClosingDelimiter(
  text /*: string */,
  from /*: number */,
  delimiter /*: string */,
) /*: { index: number, end: number } | null */ {
  const char = delimiter.charAt(0);
  let index = from;
  while (index < text.length) {
    const current = text.charAt(index);
    if (current === "\\") {
      index += 2;
      continue;
    }
    if (current === "`") {
      const run = countRun(text, index, "`");
      const close = text.indexOf("`".repeat(run), index + run);
      if (close >= 0) {
        index = close + run;
        continue;
      }
    }
    if (current === char) {
      const run = countRun(text, index, char);
      if (run >= delimiter.length) {
        const closeStart = index + run - delimiter.length;
        if (delimiter === "_" || char === "_") {
          const before = text.charAt(closeStart - 1);
          const after = text.charAt(index + run);
          if (isWordChar(before) && isWordChar(after)) {
            index += run;
            continue;
          }
        }
        return { index: closeStart, end: index + run };
      }
      index += run;
      continue;
    }
    index += 1;
  }
  return null;
}

function sanitize(url /*: string */) /*: string */ {
  return isSafeUrl(url) ? url : "";
}

function renderEmphasis(
  text /*: string */,
  index /*: number */,
  options /*: InlineOptions */,
) /*: { html: string, next: number } | null */ {
  const char = text.charAt(index);
  const run = countRun(text, index, char);
  let delimiter = char + char;
  if (run >= 3) {
    const close = findClosingDelimiter(text, index + 3, char + char + char);
    if (close) {
      const inner = text.slice(index + 3, close.index);
      return {
        html:
          "<strong><em>" +
          renderInline(inner, options) +
          "</em></strong>",
        next: close.end,
      };
    }
  }
  if (run >= 2) {
    if (char === "_" && isWordChar(text.charAt(index - 1)) && isWordChar(text.charAt(index + 2))) {
      return null;
    }
    const nextChar = text.charAt(index + 2);
    if (nextChar === "" || /\s/.test(nextChar)) {
      return null;
    }
    const close = findClosingDelimiter(text, index + 2, delimiter);
    if (close) {
      return {
        html: "<strong>" + renderInline(text.slice(index + 2, close.index), options) + "</strong>",
        next: close.end,
      };
    }
    return null;
  }
  if (run === 1) {
    if (char === "_" && isWordChar(text.charAt(index - 1)) && isWordChar(text.charAt(index + 1))) {
      return null;
    }
    const nextChar = text.charAt(index + 1);
    if (nextChar === "" || /\s/.test(nextChar)) {
      return null;
    }
    const close = findClosingDelimiter(text, index + 1, char);
    if (close && close.index > index + 1) {
      return {
        html: "<em>" + renderInline(text.slice(index + 1, close.index), options) + "</em>",
        next: close.end,
      };
    }
  }
  return null;
}

function renderStrikethrough(
  text /*: string */,
  index /*: number */,
  options /*: InlineOptions */,
) /*: { html: string, next: number } | null */ {
  if (text.charAt(index) !== "~" || text.charAt(index + 1) !== "~") {
    return null;
  }
  const close = findClosingDelimiter(text, index + 2, "~~");
  if (!close) {
    return null;
  }
  return {
    html: "<del>" + renderInline(text.slice(index + 2, close.index), options) + "</del>",
    next: close.end,
  };
}

function renderCodeSpan(
  text /*: string */,
  index /*: number */,
) /*: { html: string, next: number } | null */ {
  if (text.charAt(index) !== "`") {
    return null;
  }
  const run = countRun(text, index, "`");
  const close = text.indexOf("`".repeat(run), index + run);
  if (close < 0) {
    return null;
  }
  let content = text.slice(index + run, close).replace(/\n/g, " ");
  if (
    content.length > 1 &&
    content.startsWith(" ") &&
    content.endsWith(" ") &&
    content.trim() !== ""
  ) {
    content = content.slice(1, -1);
  }
  return {
    html: "<code>" + escapeCode(content) + "</code>",
    next: close + run,
  };
}

function renderLink(
  text /*: string */,
  index /*: number */,
  image /*: boolean */,
  options /*: InlineOptions */,
) /*: { html: string, next: number } | null */ {
  const labelStart = index + (image ? 2 : 1);
  const close = findClosingBracket(text, index + (image ? 1 : 0));
  if (close < 0) {
    return null;
  }
  const label = text.slice(labelStart, close);
  let url = "";
  let title = "";
  let next = close + 1;

  if (text.charAt(next) === "(") {
    const end = findClosingParen(text, next);
    if (end < 0) {
      return null;
    }
    const destination = parseDestination(text.slice(next + 1, end));
    url = destination.url;
    title = destination.title || "";
    next = end + 1;
  } else {
    const references = options.references;
    let referenceKey = label;
    if (text.charAt(next) === "[") {
      const refEnd = text.indexOf("]", next + 1);
      if (refEnd < 0) {
        return null;
      }
      referenceKey = text.slice(next + 1, refEnd) || label;
      next = refEnd + 1;
    }
    if (!references) {
      return null;
    }
    const reference = references.get(referenceKey.trim().toLowerCase().replace(/\s+/g, " "));
    if (!reference) {
      return null;
    }
    url = reference.url;
    title = reference.title || "";
  }

  const safeUrl = sanitize(url);
  const kind = image ? "image" : "link";
  if (options.links) {
    options.links.push({ href: url, kind });
  }
  if (!safeUrl) {
    return image
      ? { html: escapeHtml(stripTags(renderInline(label, options))), next }
      : { html: renderInline(label, options), next };
  }

  const resolved = options.resolveUrl ? options.resolveUrl(safeUrl, kind) : safeUrl;
  const external = !image && isExternalUrl(resolved);
  let attrs = ' href="' + escapeAttr(resolved) + '"';
  if (title) {
    attrs += ' title="' + escapeAttr(title) + '"';
  }
  if (external) {
    attrs += ' rel="noreferrer noopener"';
    if (options.externalLinksNewTab) {
      attrs += ' target="_blank"';
    }
  }

  if (image) {
    const alt = stripTags(renderInline(label, options)).trim();
    return {
      html:
        '<img src="' +
        escapeAttr(resolved) +
        '" alt="' +
        escapeAttr(alt) +
        '"' +
        (title ? ' title="' + escapeAttr(title) + '"' : "") +
        ' loading="lazy" decoding="async">',
      next,
    };
  }

  return {
    html: "<a" + attrs + ">" + renderInline(label, options) + "</a>",
    next,
  };
}

function renderAutolink(
  text /*: string */,
  index /*: number */,
  options /*: InlineOptions */,
) /*: { html: string, next: number } | null */ {
  if (text.charAt(index) !== "<") {
    return null;
  }
  const close = text.indexOf(">", index + 1);
  if (close < 0) {
    return null;
  }
  const inner = text.slice(index + 1, close);
  if (/^https?:\/\/[^\s<>]+$/.test(inner)) {
    const resolved = options.resolveUrl ? options.resolveUrl(inner, "link") : inner;
    if (options.links) {
      options.links.push({ href: inner, kind: "link" });
    }
    return {
      html:
        '<a href="' +
        escapeAttr(resolved) +
        '" rel="noreferrer noopener">' +
        escapeHtml(inner) +
        "</a>",
      next: close + 1,
    };
  }
  if (/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/.test(inner)) {
    return {
      html: '<a href="mailto:' + escapeAttr(inner) + '">' + escapeHtml(inner) + "</a>",
      next: close + 1,
    };
  }
  if (/^mailto:[^\s<>]+$/.test(inner)) {
    return {
      html: '<a href="' + escapeAttr(inner) + '">' + escapeHtml(inner.slice(7)) + "</a>",
      next: close + 1,
    };
  }
  return null;
}

function renderRawTag(text /*: string */, index /*: number */) /*: { html: string, next: number } | null */ {
  if (text.startsWith("<!--", index)) {
    const end = text.indexOf("-->", index + 4);
    if (end >= 0) {
      return { html: text.slice(index, end + 3), next: end + 3 };
    }
    return null;
  }
  const match = /^<\/?[A-Za-z][A-Za-z0-9:-]*(?:\s+[^<>]*)?\/?>/.exec(text.slice(index));
  if (!match) {
    return null;
  }
  return { html: match[0], next: index + match[0].length };
}

export function renderInline(text /*: string */, options /*: InlineOptions */ = {}) /*: string */ {
  let output = "";
  let index = 0;

  while (index < text.length) {
    const char = text.charAt(index);

    if (char === "\\") {
      const next = text.charAt(index + 1);
      if (next === "\n") {
        output += "<br>\n";
        index += 2;
        continue;
      }
      if (next && PUNCTUATION.includes(next)) {
        output += escapeChar(next);
        index += 2;
        continue;
      }
      output += "\\";
      index += 1;
      continue;
    }

    if (char === "`") {
      const code = renderCodeSpan(text, index);
      if (code) {
        output += code.html;
        index = code.next;
        continue;
      }
      const run = countRun(text, index, "`");
      output += escapeHtml("`".repeat(run));
      index += run;
      continue;
    }

    if (char === "!" && text.charAt(index + 1) === "[") {
      const image = renderLink(text, index, true, options);
      if (image) {
        output += image.html;
        index = image.next;
        continue;
      }
    }

    if (char === "[") {
      const link = renderLink(text, index, false, options);
      if (link) {
        output += link.html;
        index = link.next;
        continue;
      }
    }

    if (char === "<") {
      const auto = renderAutolink(text, index, options);
      if (auto) {
        output += auto.html;
        index = auto.next;
        continue;
      }
      const raw = renderRawTag(text, index);
      if (raw) {
        output += raw.html;
        index = raw.next;
        continue;
      }
      output += "&lt;";
      index += 1;
      continue;
    }

    if (char === "*" || char === "_") {
      const emphasis = renderEmphasis(text, index, options);
      if (emphasis) {
        output += emphasis.html;
        index = emphasis.next;
        continue;
      }
    }

    if (char === "~" && text.charAt(index + 1) === "~") {
      const strike = renderStrikethrough(text, index, options);
      if (strike) {
        output += strike.html;
        index = strike.next;
        continue;
      }
    }

    if (char === "&") {
      const entity = /^&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/.exec(text.slice(index));
      if (entity) {
        output += entity[0];
        index += entity[0].length;
        continue;
      }
      output += "&amp;";
      index += 1;
      continue;
    }

    if (char === "\n") {
      if (text.charAt(index - 1) === " " && text.charAt(index - 2) === " ") {
        output = output.replace(/ {2}$/, "");
        output += "<br>\n";
      } else {
        output += "\n";
      }
      index += 1;
      continue;
    }

    output += escapeHtml(char);
    index += 1;
  }

  return output;
}

export function inlineText(value /*: string */, options /*: InlineOptions */ = {}) /*: string */ {
  return collapseWhitespace(stripTags(renderInline(value, options)));
}

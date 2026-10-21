// @flow

const ENTITIES /*: { [string]: string } */ = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: "\u00a0",
  copy: "\u00a9",
  reg: "\u00ae",
  mdash: "\u2014",
  ndash: "\u2013",
  hellip: "\u2026",
  laquo: "\u00ab",
  raquo: "\u00bb",
  ldquo: "\u201c",
  rdquo: "\u201d",
  lsquo: "\u2018",
  rsquo: "\u2019",
};

export function escapeHtml(value /*: string */) /*: string */ {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function escapeAttr(value /*: string */) /*: string */ {
  return escapeHtml(value);
}

export function escapeCode(value /*: string */) /*: string */ {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function decodeEntities(value /*: string */) /*: string */ {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]+);/g, (match, body) => {
    if (body.startsWith("#x") || body.startsWith("#X")) {
      const code = parseInt(body.slice(2), 16);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    if (body.startsWith("#")) {
      const code = parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : match;
    }
    const named = ENTITIES[body];
    return named === undefined ? match : named;
  });
}

export function stripTags(value /*: string */) /*: string */ {
  return decodeEntities(value.replace(/<[^>]*>/g, " "));
}

export function collapseWhitespace(value /*: string */) /*: string */ {
  return value.replace(/\s+/g, " ").trim();
}

export function plainTextFromHtml(value /*: string */) /*: string */ {
  return collapseWhitespace(stripTags(value));
}

export function truncate(value /*: string */, limit /*: number */) /*: string */ {
  const text = collapseWhitespace(value);
  if (text.length <= limit) {
    return text;
  }
  const slice = text.slice(0, limit);
  const lastSpace = slice.lastIndexOf(" ");
  return (lastSpace > limit * 0.6 ? slice.slice(0, lastSpace) : slice).trim() + "\u2026";
}

/**
 * Serialize a value for safe embedding inside a <script> element.
 */
export function jsonForScript(value /*: mixed */) /*: string */ {
  const serialized = JSON.stringify(value);
  return (serialized === undefined ? "null" : serialized)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

export function isSafeUrl(value /*: string */) /*: boolean */ {
  const url = value.trim().toLowerCase();
  if (url === "") {
    return true;
  }
  if (url.startsWith("javascript:") || url.startsWith("vbscript:")) {
    return false;
  }
  if (url.startsWith("data:")) {
    return url.startsWith("data:image/");
  }
  return true;
}

export function isExternalUrl(value /*: string */) /*: boolean */ {
  return /^(https?:)?\/\//i.test(value) || value.startsWith("mailto:") || value.startsWith("tel:");
}

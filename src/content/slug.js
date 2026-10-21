// @flow

/**
 * URL-safe, Unicode-aware heading slugs. QuickJS in Fairyfly supports
 * Unicode property escapes, so non-Latin headings keep their letters.
 */
export function slugify(value /*: string */) /*: string */ {
  let text = value;
  try {
    // Strip accents only from Latin characters. NFKD on the whole string
    // would decompose Japanese dakuten (ド -> ト + mark) and lose letters.
    text = value.replace(/[\u00C0-\u024F\u1E00-\u1EFF]/g, (char) =>
      char.normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
    );
  } catch (_error) {
    text = value;
  }
  const slug = text
    .replace(/['\u2019]/g, "")
    .replace(/&/g, " and ")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\u30FC]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
  return slug || "section";
}

export function createSlugger() /*: (value: string) => string */ {
  const used /*: Map<string, number> */ = new Map();
  return (value /*: string */) /*: string */ => {
    const base = slugify(value);
    const seen = used.get(base) || 0;
    used.set(base, seen + 1);
    return seen === 0 ? base : base + "-" + String(seen + 1);
  };
}

export function uniqueId(base /*: string */, used /*: Set<string> */) /*: string */ {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let index = 2;
  while (used.has(base + "-" + String(index))) {
    index += 1;
  }
  const id = base + "-" + String(index);
  used.add(id);
  return id;
}

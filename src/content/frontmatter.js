// @flow
/*:: import type { Frontmatter } from "../types.js"; */
import { fail } from "../util/errors.js";
import { parseYaml } from "./yaml.js";

/*::
export type ParsedDocument = {
  frontmatter: Frontmatter,
  body: string,
  bodyStartLine: number,
};
*/

function validateFrontmatter(value /*: any */, file /*: string */) /*: Frontmatter */ {
  if (value === null) {
    return {};
  }
  if (Array.isArray(value) || typeof value !== "object") {
    throw fail(
      "Frontmatter in `" + file + "` must be a mapping of keys to values.",
      "Start the block with `---`, then write `key: value` lines.",
    );
  }
  const frontmatter /*: Frontmatter */ = value;
  const stringKeys = ["title", "description", "slug", "layout", "template", "robots"];
  for (const key of stringKeys) {
    const field = frontmatter[key];
    if (field !== undefined && field !== null && typeof field !== "string") {
      throw fail(
        "Frontmatter field `" + key + "` in `" + file + "` must be a string.",
        "Remove the quotes mismatch or convert the value to text.",
      );
    }
  }
  if (
    frontmatter.order !== undefined &&
    frontmatter.order !== null &&
    typeof frontmatter.order !== "number"
  ) {
    throw fail(
      "Frontmatter field `order` in `" + file + "` must be a number.",
      "Use a value such as `order: 10`.",
    );
  }
  if (
    frontmatter.draft !== undefined &&
    frontmatter.draft !== null &&
    typeof frontmatter.draft !== "boolean"
  ) {
    throw fail(
      "Frontmatter field `draft` in `" + file + "` must be true or false.",
      "Use `draft: true` to exclude a page from production builds.",
    );
  }
  if (
    frontmatter.sidebar !== undefined &&
    frontmatter.sidebar !== null &&
    (typeof frontmatter.sidebar !== "object" || Array.isArray(frontmatter.sidebar))
  ) {
    throw fail(
      "Frontmatter field `sidebar` in `" + file + "` must be a mapping.",
      "Example:\n  sidebar:\n    label: Installation\n    order: 2",
    );
  }
  if (
    frontmatter.hero !== undefined &&
    frontmatter.hero !== null &&
    (typeof frontmatter.hero !== "object" || Array.isArray(frontmatter.hero))
  ) {
    throw fail(
      "Frontmatter field `hero` in `" + file + "` must be a mapping.",
      "Example:\n  hero:\n    tagline: Build docs that load fast\n    actions:\n      - text: Start\n        link: /guide/",
    );
  }
  const hero = frontmatter.hero;
  if (hero) {
    const heroFields = [
      { key: "title", value: hero.title },
      { key: "tagline", value: hero.tagline },
      { key: "eyebrow", value: hero.eyebrow },
      { key: "imageAlt", value: hero.imageAlt },
    ];
    for (const field of heroFields) {
      if (field.value !== undefined && field.value !== null && typeof field.value !== "string") {
        throw fail(
          "Frontmatter field `hero." + field.key + "` in `" + file + "` must be a string.",
          "Wrap the value in quotes if it contains punctuation.",
        );
      }
    }
    if (hero.actions !== undefined && hero.actions !== null) {
      if (!Array.isArray(hero.actions)) {
        throw fail(
          "Frontmatter field `hero.actions` in `" + file + "` must be a sequence.",
          "Use a `- text: ...` / `link: ...` list.",
        );
      }
      for (let index = 0; index < hero.actions.length; index += 1) {
        const action = hero.actions[index];
        if (
          !action ||
          typeof action !== "object" ||
          Array.isArray(action) ||
          typeof action.text !== "string" ||
          typeof action.link !== "string"
        ) {
          throw fail(
            "Frontmatter `hero.actions[" + String(index) + "]` in `" + file + "` needs `text` and `link` strings.",
            "Remove the action or give it both fields.",
          );
        }
        if (
          action.variant !== undefined &&
          action.variant !== null &&
          action.variant !== "primary" &&
          action.variant !== "secondary" &&
          action.variant !== "minimal"
        ) {
          throw fail(
            "Frontmatter `hero.actions[" + String(index) + "].variant` in `" + file +
              "` must be `primary`, `secondary`, or `minimal`.",
            "Remove the variant to use the primary style.",
          );
        }
      }
    }
    validateHeroImage(hero.image, "hero.image", file);
  }
  validateFeatureCards(frontmatter.features, file);
  return frontmatter;
}

function validateHeroImage(value /*: any */, label /*: string */, file /*: string */) /*: void */ {
  if (value === undefined || value === null) {
    return;
  }
  if (typeof value === "string") {
    return;
  }
  if (typeof value !== "object" || Array.isArray(value)) {
    throw fail(
      "Frontmatter field `" + label + "` in `" + file + "` must be a string or a mapping.",
      "Use `image: /logo.svg` or `image: { file: /logo.svg, alt: Logo }`.",
    );
  }
  if (typeof value.file !== "string" || value.file.trim() === "") {
    throw fail(
      "Frontmatter `" + label + ".file` in `" + file + "` must be a non-empty string.",
      "Point it at a file in `public/` or an absolute URL.",
    );
  }
  if (value.alt !== undefined && value.alt !== null && typeof value.alt !== "string") {
    throw fail(
      "Frontmatter `" + label + ".alt` in `" + file + "` must be a string.",
      "Use `alt: \"\"` for a decorative image.",
    );
  }
}

function validateFeatureCards(value /*: any */, file /*: string */) /*: void */ {
  if (value === undefined || value === null) {
    return;
  }
  if (!Array.isArray(value)) {
    throw fail(
      "Frontmatter field `features` in `" + file + "` must be a sequence.",
      "Example:\n  features:\n    - title: Fast\n      description: Static HTML by default.",
    );
  }
  for (let index = 0; index < value.length; index += 1) {
    const item = value[index];
    const label = "features[" + String(index) + "]";
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw fail(
        "Frontmatter `" + label + "` in `" + file + "` must be a mapping.",
        "Each feature needs `title` and `description`.",
      );
    }
    if (typeof item.title !== "string" || item.title.trim() === "") {
      throw fail(
        "Frontmatter `" + label + ".title` in `" + file + "` must be a non-empty string.",
        "Add a short feature name.",
      );
    }
    if (typeof item.description !== "string" || item.description.trim() === "") {
      throw fail(
        "Frontmatter `" + label + ".description` in `" + file + "` must be a non-empty string.",
        "Describe the feature in one sentence.",
      );
    }
    if (
      item.link !== undefined &&
      item.link !== null &&
      typeof item.link !== "string"
    ) {
      throw fail(
        "Frontmatter `" + label + ".link` in `" + file + "` must be a string.",
        "Use a route such as `/guide/`.",
      );
    }
  }
}

/**
 * Split an optional `---` frontmatter block from Markdown source.
 */
export function splitFrontmatter(source /*: string */, file /*: string */ = "document.md") /*: ParsedDocument */ {
  const text = source.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = text.split("\n");
  if (lines.length === 0 || !/^---\s*$/.test(lines[0])) {
    return { frontmatter: {}, body: text, bodyStartLine: 1 };
  }

  let closing = -1;
  for (let index = 1; index < lines.length; index += 1) {
    if (/^(---|\.\.\.)\s*$/.test(lines[index])) {
      closing = index;
      break;
    }
  }
  if (closing < 0) {
    throw fail(
      "Unclosed frontmatter block in `" + file + "`.",
      "Add a closing `---` line after the frontmatter fields.",
    );
  }

  const raw = lines.slice(1, closing).join("\n");
  let parsed;
  try {
    parsed = parseYaml(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw fail(
      "Invalid frontmatter in `" + file + "`: " + message,
      "Frontmatter uses a strict YAML subset: mappings, sequences, scalars, and | or > block text.",
    );
  }
  return {
    frontmatter: validateFrontmatter(parsed, file),
    body: lines.slice(closing + 1).join("\n"),
    bodyStartLine: closing + 2,
  };
}

export function parseDocument(source /*: string */, file /*: string */ = "document.md") /*: ParsedDocument */ {
  return splitFrontmatter(source, file);
}

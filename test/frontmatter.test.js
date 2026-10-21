import { check, eq, done, throws } from "./lib.js";
import { splitFrontmatter } from "../src/content/frontmatter.js";

const parsed = splitFrontmatter(
  "---\ntitle: Hello\ndescription: World\nsidebar:\n  order: 2\n---\n\n# Heading\n\nBody.\n",
  "index.md",
);
eq("frontmatter title", parsed.frontmatter.title, "Hello");
eq("frontmatter description", parsed.frontmatter.description, "World");
eq("frontmatter sidebar order", parsed.frontmatter.sidebar && parsed.frontmatter.sidebar.order, 2);
eq("body starts with heading", parsed.body.trim().slice(0, 9), "# Heading");
eq("body start line", parsed.bodyStartLine, 7);

const none = splitFrontmatter("# Just markdown\n", "page.md");
eq("no frontmatter object", none.frontmatter, {});
eq("no frontmatter body", none.body, "# Just markdown\n");

const crlf = splitFrontmatter("---\r\ntitle: CRLF\r\n---\r\nBody\r\n", "crlf.md");
eq("crlf title", crlf.frontmatter.title, "CRLF");
eq("crlf body", crlf.body, "Body\n");

const dots = splitFrontmatter("---\ntitle: Dots\n...\nBody\n", "dots.md");
eq("dots closing", dots.frontmatter.title, "Dots");

throws("unclosed frontmatter", () => splitFrontmatter("---\ntitle: X\n", "bad.md"), "Unclosed frontmatter");
throws("array frontmatter", () => splitFrontmatter("---\n- one\n- two\n---\n", "bad.md"), "must be a mapping");
throws("non-string title", () => splitFrontmatter("---\ntitle: 42\n---\n", "bad.md"), "must be a string");
throws("bad draft", () => splitFrontmatter("---\ndraft: yes\n---\n", "bad.md"), "true or false");
throws("bad sidebar", () => splitFrontmatter("---\nsidebar: nope\n---\n", "bad.md"), "must be a mapping");

const landing = splitFrontmatter(
  "---\ntitle: Landing\nlayout: splash\nhero:\n  eyebrow: Runtime\n  image: /hero.svg\n  imageAlt: Art\nfeatures:\n  - title: Fast\n    description: Static HTML.\n    link: /guide/\n  - title: Tiny\n    description: No dependencies.\n---\n",
  "index.md",
);
eq("splash layout", landing.frontmatter.layout, "splash");
eq("hero eyebrow", landing.frontmatter.hero.eyebrow, "Runtime");
eq("hero image", landing.frontmatter.hero.image, "/hero.svg");
eq("hero image alt", landing.frontmatter.hero.imageAlt, "Art");
eq("features length", landing.frontmatter.features.length, 2);
eq("feature title", landing.frontmatter.features[0].title, "Fast");
eq("feature link", landing.frontmatter.features[0].link, "/guide/");
eq("feature second description", landing.frontmatter.features[1].description, "No dependencies.");

throws(
  "features not a sequence",
  () => splitFrontmatter("---\nfeatures: nope\n---\n", "bad.md"),
  "must be a sequence",
);
throws(
  "feature without description",
  () => splitFrontmatter("---\nfeatures:\n  - title: Fast\n---\n", "bad.md"),
  "description",
);
throws(
  "feature bad link",
  () => splitFrontmatter("---\nfeatures:\n  - title: Fast\n    description: x\n    link: 5\n---\n", "bad.md"),
  "must be a string",
);
throws(
  "hero image not a string",
  () => splitFrontmatter("---\nhero:\n  image: 5\n---\n", "bad.md"),
  "hero.image",
);

done("frontmatter");

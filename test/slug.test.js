import { eq, done } from "./lib.js";
import { createSlugger, slugify } from "../src/content/slug.js";

eq("slug basic", slugify("Hello, World!"), "hello-world");
eq("slug apostrophe", slugify("It's a test"), "its-a-test");
eq("slug ampersand", slugify("Docs & API"), "docs-and-api");
eq("slug accents", slugify("Café déjà vu"), "cafe-deja-vu");
eq("slug unicode", slugify("日本語 ドキュメント"), "日本語-ドキュメント");
eq("slug collapse", slugify("--Hello   world--"), "hello-world");
eq("slug fallback", slugify("!!!"), "section");

const slugger = createSlugger();
eq("slugger first", slugger("Heading"), "heading");
eq("slugger second", slugger("Heading"), "heading-2");
eq("slugger third", slugger("Heading"), "heading-3");
eq("slugger other", slugger("Other"), "other");

done("slug");

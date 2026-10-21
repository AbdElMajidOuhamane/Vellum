import { check, eq, done } from "./lib.js";
import {
  collapseWhitespace,
  decodeEntities,
  escapeAttr,
  escapeHtml,
  isExternalUrl,
  isSafeUrl,
  jsonForScript,
  plainTextFromHtml,
  stripTags,
  truncate,
} from "../src/util/html.js";
import { mimeType } from "../src/util/mime.js";

eq("escape html", escapeHtml('<a href="x">&\'</a>'), "&lt;a href=&quot;x&quot;&gt;&amp;&#39;&lt;/a&gt;");
eq("escape attr", escapeAttr('"'), "&quot;");
eq("decode named", decodeEntities("a &amp; b"), "a & b");
eq("decode numeric", decodeEntities("&#65;&#x42;"), "AB");
eq("strip tags", stripTags("<p>Hello <strong>world</strong></p>"), " Hello  world  ");
eq("collapse", collapseWhitespace("  a\n\n b  "), "a b");
eq("plain text", plainTextFromHtml("<h1>Hi</h1><p>There</p>"), "Hi There");
eq("truncate short", truncate("one two", 20), "one two");
check("truncate long", truncate("one two three four five", 12).endsWith("\u2026"));
eq("json script", jsonForScript({ x: "</script>" }), '{"x":"\\u003c/script\\u003e"}');
eq("safe url", isSafeUrl("/guide/"), true);
eq("unsafe javascript", isSafeUrl("JavaScript:alert(1)"), false);
eq("data image", isSafeUrl("data:image/png;base64,abc"), true);
eq("data html", isSafeUrl("data:text/html,abc"), false);
eq("external http", isExternalUrl("https://example.com"), true);
eq("external mailto", isExternalUrl("mailto:a@b.c"), true);
eq("internal", isExternalUrl("/guide/"), false);

eq("mime html", mimeType("index.html"), "text/html; charset=utf-8");
eq("mime css", mimeType("a.css"), "text/css; charset=utf-8");
eq("mime js", mimeType("a.mjs"), "text/javascript; charset=utf-8");
eq("mime png", mimeType("a.png"), "image/png");
eq("mime unknown", mimeType("a.bin"), "application/octet-stream");

done("html+mime");

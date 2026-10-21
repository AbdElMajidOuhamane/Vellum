import { check, done, eq, includes, notIncludes } from "./lib.js";
import { renderMarkdown } from "../src/content/markdown.js";
import { buildToc } from "../src/content/toc.js";

function render(source, options) {
  return renderMarkdown(source, options || {});
}

const heading = render("# Hello *World*");
includes("heading html", heading.html, '<h1 id="hello-world">Hello <em>World</em>');
eq("heading text", heading.headings[0].text, "Hello World");
eq("heading id", heading.headings[0].id, "hello-world");
includes("heading anchor", heading.html, 'class="heading-anchor"');

const duplicate = render("# Same\n\n## Same\n\n### Same");
eq("duplicate ids", duplicate.headings.map((h) => h.id), ["same", "same-2", "same-3"]);

const setext = render("Title\n=====\n\nSub\n---");
eq("setext h1", setext.headings[0].level, 1);
eq("setext h2", setext.headings[1].level, 2);

const inline = render(
  "**bold** *em* ***both*** ~~gone~~ `a < b` and foo_bar_baz &amp; & raw",
);
includes("strong", inline.html, "<strong>bold</strong>");
includes("em", inline.html, "<em>em</em>");
includes("strong em", inline.html, "<strong><em>both</em></strong>");
includes("strike", inline.html, "<del>gone</del>");
includes("code span", inline.html, "<code>a &lt; b</code>");
includes("intraword underscore", inline.html, "foo_bar_baz");
includes("entity preserved", inline.html, "&amp;");
includes("bare amp escaped", inline.html, "&amp; raw");
notIncludes("no raw script", inline.html, "<script>");

const code = render("```js\nconst x = \"<tag>\";\n```");
includes("fence language", code.html, 'data-language="js"');
includes("fence class", code.html, 'class="language-js"');
includes("fence escaped", code.html, 'const x = "&lt;tag&gt;";');

const indented = render("    const y = 1;\n    const z = 2;");
includes("indented code", indented.html, "<pre class=\"code-block\"><code>const y = 1;\nconst z = 2;</code></pre>");

const lists = render("- one\n- two\n  - nested\n  - nested two\n- three");
includes("ul", lists.html, "<ul>");
includes("nested ul", lists.html, "<li>two<ul><li>nested</li>");
includes("list item", lists.html, "<li>one</li>");

const ordered = render("3. third\n4. fourth");
includes("ordered start", ordered.html, '<ol start="3">');
includes("ordered item", ordered.html, "<li>third</li>");

const task = render("- [ ] todo\n- [x] done");
includes("task list class", task.html, 'class="contains-task-list"');
includes("unchecked", task.html, '<input type="checkbox" disabled> todo');
includes("checked", task.html, '<input type="checkbox" disabled checked> done');

const table = render("| Name | Value |\n| :--- | ---: |\n| a | 1 |\n| b | 2 |");
includes("table wrap", table.html, '<div class="table-wrap"><table>');
includes("table head align", table.html, '<th class="align-left">Name</th>');
includes("table right align", table.html, '<td class="align-right">2</td>');

const links = render("[Guide](/guide/) and [Next](./next.md) and <https://example.com>", {
  base: "/docs/",
  currentFile: "guide/intro.md",
  currentRoute: "/guide/intro/",
  trailingSlash: true,
});
includes("absolute link base", links.html, 'href="/docs/guide/"');
includes("md link rewrite", links.html, 'href="/docs/guide/next/"');
includes("autolink", links.html, 'href="https://example.com"');

const reference = render("[Docs][d]\n\n[d]: /docs/ \"Title\"");
includes("reference link", reference.html, '<a href="/docs/" title="Title">Docs</a>');

const image = render("![Alt text](/img/logo.png \"Logo\")", { base: "/docs/" });
includes("image src base", image.html, 'src="/docs/img/logo.png"');
includes("image alt", image.html, 'alt="Alt text"');
includes("image title", image.html, 'title="Logo"');

const unsafe = render("[click](javascript:alert(1))");
notIncludes("unsafe link removed", unsafe.html, 'href="javascript');
includes("unsafe label kept", unsafe.html, "click");

const quote = render("> A quote with **bold**.");
includes("blockquote", quote.html, "<blockquote><p>A quote with <strong>bold</strong>.</p></blockquote>");

const callout = render("> [!WARNING]\n> Careful now.");
includes("callout class", callout.html, 'class="callout callout-warning"');
includes("callout title", callout.html, '<p class="callout-title">Warning</p>');
includes("callout body", callout.html, "<p>Careful now.</p>");

const hr = render("---");
includes("hr", hr.html, "<hr>");

const raw = render('<div class="box">raw</div>\n\nAfter');
includes("raw html", raw.html, '<div class="box">raw</div>');

const hard = render("line one  \nline two");
includes("hard break", hard.html, "<br>");

const tocSource = render("## A\n\n### B\n\n## C");
const toc = buildToc(tocSource.headings);
eq("toc length", toc.length, 2);
eq("toc child", toc[0].children.length, 1);
eq("toc child text", toc[0].children[0].text, "B");

const body = render("# Title\n\nSome **plain** text.");
eq("body text", body.bodyText, "Title Some plain text.");

const crlf = render("# Title\r\n\r\nBody\r\n");
includes("crlf heading", crlf.html, '<h1 id="title">');

done("markdown");

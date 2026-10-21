import { check, eq, done, throws } from "./lib.js";
import { parseScalar, parseYaml } from "../src/content/yaml.js";

eq("scalar string", parseScalar("hello"), "hello");
eq("scalar quoted", parseScalar('"hello: world"'), "hello: world");
eq("scalar single", parseScalar("'it''s'"), "it's");
eq("scalar number", parseScalar("42"), 42);
eq("scalar float", parseScalar("-1.5"), -1.5);
eq("scalar true", parseScalar("true"), true);
eq("scalar false", parseScalar("false"), false);
eq("scalar null", parseScalar("null"), null);
eq("scalar tilde", parseScalar("~"), null);
eq("scalar array", parseScalar("[one, 2, false]"), ["one", 2, false]);
eq("scalar map", parseScalar("{a: 1, b: two}"), { a: 1, b: "two" });
eq("scalar comment", parseScalar("value # comment"), "value");
eq("scalar url hash", parseScalar("https://example.com/#anchor"), "https://example.com/#anchor");

const flat = parseYaml("title: Hello\ncount: 2\npublished: true\nempty:\n");
eq("flat title", flat && flat.title, "Hello");
eq("flat count", flat && flat.count, 2);
eq("flat boolean", flat && flat.published, true);
eq("flat null", flat && flat.empty, null);

const nested = parseYaml(
  "sidebar:\n  label: Intro\n  order: 2\n  hidden: false\ntags:\n  - one\n  - two\n",
);
check("nested object", nested && typeof nested.sidebar === "object");
eq("nested label", nested && nested.sidebar && nested.sidebar.label, "Intro");
eq("nested order", nested && nested.sidebar && nested.sidebar.order, 2);
eq("nested tags", nested && nested.tags, ["one", "two"]);

const objects = parseYaml(
  "items:\n  - label: One\n    link: /one/\n  - label: Two\n    link: /two/\n",
);
eq("sequence length", objects && objects.items && objects.items.length, 2);
eq("sequence first label", objects && objects.items && objects.items[0].label, "One");
eq("sequence second link", objects && objects.items && objects.items[1].link, "/two/");

const literal = parseYaml("text: |\n  line one\n  line two\n");
eq("literal block", literal && literal.text, "line one\nline two\n");

const folded = parseYaml("text: >\n  line one\n  line two\n");
eq("folded block", folded && folded.text, "line one line two\n");

const stripped = parseYaml("text: |-\n  no trailing\n");
eq("literal strip", stripped && stripped.text, "no trailing");

const commented = parseYaml("# heading\ntitle: Docs # inline\n");
eq("comment-only lines", commented && commented.title, "Docs");

throws("tab indentation", () => parseYaml("a:\n\tb: 1\n"), "Tabs are not allowed");
throws("bad mapping line", () => parseYaml("a: 1\nb\n"), "Expected");

done("yaml");

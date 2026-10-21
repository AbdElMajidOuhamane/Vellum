import { check, done, eq, includes, tempDir, throws, cleanup, load } from "./lib.js";

const flags = await load("../src/cli/flags.js");
const newModule = await load("../src/cli/new.js");
const { parseCliArgs, usage } = flags;
const { scaffoldProject } = newModule;

const help = parseCliArgs([]);
eq("default command", help.command, "help");
check("usage includes build", usage().includes("build"));
check("usage includes flow note", usage().includes("Markdown-first"));

const build = parseCliArgs(["build", "--config", "site/vellum.config.js", "--bundler=rsbuild", "--out", "public", "--no-search"]);
eq("build command", build.command, "build");
eq("build config", build.configPath, "site/vellum.config.js");
eq("build bundler", build.bundler, "rsbuild");
eq("build outDir", build.outDir, "public");
eq("build search off", build.search, false);

const dev = parseCliArgs(["dev", "-p", "5111", "--verbose"]);
eq("dev command", dev.command, "dev");
eq("dev port", dev.port, 5111);
eq("dev verbose", dev.verbose, true);

const newSite = parseCliArgs(["new", "my-docs", "--title", "My Docs", "--force"]);
eq("new command", newSite.command, "new");
eq("new positional", newSite.positional[0], "my-docs");
eq("new title", newSite.title, "My Docs");
eq("new force", newSite.force, true);

const created = parseCliArgs(["create", "x"]);
eq("create alias", created.command, "new");

eq("version command", parseCliArgs(["--version"]).command, "version");
eq("help flag", parseCliArgs(["build", "--help"]).command, "help");
eq("json quiet", parseCliArgs(["build", "--json"]).quiet, true);
eq("drafts", parseCliArgs(["build", "--drafts"]).drafts, true);

throws("unknown command", () => parseCliArgs(["nope"]), "Unknown command");
throws("unknown flag", () => parseCliArgs(["build", "--wat"]), "Unknown option");
throws("bad port", () => parseCliArgs(["dev", "--port", "0"]), "Invalid port");
throws("missing value", () => parseCliArgs(["dev", "--port"]), "Missing value");
throws("extra positional", () => parseCliArgs(["build", "extra"]), "does not accept");

const logger = {
  quiet: true,
  info: () => {},
  step: () => {},
  warn: () => {},
  error: () => {},
  debug: () => {},
};
const root = tempDir("scaffold");
const written = scaffoldProject({ directory: root, title: "Scaffold Test", force: true, logger });
check("scaffold files", written.length >= 10);
check("scaffold config", fs.exists(root + "/vellum.config.js"));
check("scaffold ff manifest", fs.exists(root + "/ff.json"));
check("scaffold ff entry", fs.exists(root + "/vellum.js"));
check("scaffold index", fs.exists(root + "/src/content/docs/index.md"));
check("scaffold guide", fs.exists(root + "/src/content/docs/guide/getting-started.md"));
check("scaffold package", fs.exists(root + "/package.json"));
includes("scaffold title", fs.readFile(root + "/vellum.config.js"), "Scaffold Test");
includes("scaffold content", fs.readFile(root + "/src/content/docs/index.md"), "Why Vellum");
includes("scaffold splash", fs.readFile(root + "/src/content/docs/index.md"), "layout: splash");
includes("scaffold features", fs.readFile(root + "/src/content/docs/index.md"), "features:");
includes("ff manifest main", fs.readFile(root + "/ff.json"), 'vellum.js');
includes("ff entry runCli", fs.readFile(root + "/vellum.js"), "runCli");
includes("ff entry framework root", fs.readFile(root + "/vellum.js"), "findFrameworkRoot");
includes("npm scripts use ff", fs.readFile(root + "/package.json"), "ff vellum.js dev");

throws("nonempty without force", () => scaffoldProject({ directory: root, logger }), "not empty");
const forced = scaffoldProject({ directory: root, title: "Again", force: true, logger });
check("force writes", forced.length >= 8);

cleanup(root);
done("cli");

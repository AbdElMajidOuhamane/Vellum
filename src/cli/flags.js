// @flow
/*:: import type { BundlerProvider, CliOptions } from "../types.js"; */
import { fail } from "../util/errors.js";
import { VERSION } from "../version.js";

const COMMANDS = ["dev", "build", "preview", "check", "new", "create", "help", "version"];

function takeValue(
  rest /*: Array<string> */,
  flag /*: string */,
) /*: string */ {
  const next = rest.shift();
  if (next === undefined || next.startsWith("-")) {
    throw fail(
      "Missing value for `" + flag + "`.",
      "Usage: vellum " + flag + " <value>",
    );
  }
  return next;
}

function parsePort(value /*: string */) /*: number */ {
  const port = Number(value);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw fail(
      "Invalid port `" + value + "`.",
      "Use an integer between 1 and 65535.",
    );
  }
  return port;
}

function parseBundler(value /*: string */) /*: BundlerProvider */ {
  if (value !== "auto" && value !== "rsbuild" && value !== "builtin") {
    throw fail(
      "Invalid bundler `" + value + "`.",
      "Choose `auto`, `rsbuild`, or `builtin`.",
    );
  }
  return value;
}

export function parseCliArgs(argv /*: Array<string> */) /*: CliOptions */ {
  const options /*: CliOptions */ = {
    command: "",
    configPath: null,
    root: null,
    port: null,
    outDir: null,
    drafts: false,
    search: true,
    bundler: null,
    json: false,
    quiet: false,
    verbose: false,
    force: false,
    title: null,
    positional: [],
    help: false,
    version: false,
  };

  const rest = argv.slice();
  while (rest.length > 0) {
    const arg = rest.shift();
    if (arg === undefined) {
      break;
    }
    if (arg === "--") {
      options.positional = options.positional.concat(rest);
      break;
    }

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }
    if (arg === "--version" || arg === "-V") {
      options.version = true;
      continue;
    }
    if (arg === "-q" || arg === "--quiet") {
      options.quiet = true;
      continue;
    }
    if (arg === "-v" || arg === "--verbose") {
      options.verbose = true;
      continue;
    }
    if (arg === "--json") {
      options.json = true;
      options.quiet = true;
      continue;
    }
    if (arg === "--drafts") {
      options.drafts = true;
      continue;
    }
    if (arg === "--no-drafts") {
      options.drafts = false;
      continue;
    }
    if (arg === "--search") {
      options.search = true;
      continue;
    }
    if (arg === "--no-search") {
      options.search = false;
      continue;
    }
    if (arg === "-f" || arg === "--force") {
      options.force = true;
      continue;
    }

    const equals = arg.indexOf("=");
    const flag = equals > 0 ? arg.slice(0, equals) : arg;
    const inlineValue = equals > 0 ? arg.slice(equals + 1) : null;

    if (flag === "-c" || flag === "--config") {
      options.configPath = inlineValue === null ? takeValue(rest, flag) : inlineValue;
      continue;
    }
    if (flag === "-r" || flag === "--root") {
      options.root = inlineValue === null ? takeValue(rest, flag) : inlineValue;
      continue;
    }
    if (flag === "-p" || flag === "--port") {
      const value = inlineValue === null ? takeValue(rest, flag) : inlineValue;
      options.port = parsePort(value);
      continue;
    }
    if (flag === "--out") {
      options.outDir = inlineValue === null ? takeValue(rest, flag) : inlineValue;
      continue;
    }
    if (flag === "--bundler") {
      const value = inlineValue === null ? takeValue(rest, flag) : inlineValue;
      options.bundler = parseBundler(value);
      continue;
    }
    if (flag === "--title") {
      options.title = inlineValue === null ? takeValue(rest, flag) : inlineValue;
      continue;
    }
    if (arg.startsWith("-")) {
      throw fail(
        "Unknown option `" + arg + "`.",
        "Run `vellum --help` to see available options.",
      );
    }

    if (!options.command) {
      options.command = arg === "create" ? "new" : arg;
    } else {
      options.positional.push(arg);
    }
  }

  if (options.version) {
    options.command = "version";
  } else if (options.help) {
    options.command = "help";
  } else if (!options.command) {
    options.command = "help";
  }

  if (!COMMANDS.includes(options.command)) {
    throw fail(
      "Unknown command `" + options.command + "`.",
      "Run `vellum --help` to see the available commands.",
    );
  }

  if (options.command === "new" && options.positional.length > 1) {
    throw fail(
      "`vellum new` accepts a single directory.",
      "Example: vellum new my-docs",
    );
  }
  if (options.command !== "new" && options.positional.length > 0) {
    throw fail(
      "`vellum " + options.command + "` does not accept positional arguments.",
      "Did you mean a flag such as --config or --port?",
    );
  }

  return options;
}

export function usage() /*: string */ {
  return [
    "vellum " + VERSION + " \u2014 Markdown-first docs on Fairyfly",
    "",
    "Usage:",
    "  vellum <command> [options]",
    "",
    "Commands:",
    "  dev        Start the development server with live reload",
    "  build      Generate the static site",
    "  preview    Serve the generated site",
    "  check      Validate configuration, routes, and links",
    "  new        Scaffold a documentation site",
    "  version    Print the version",
    "  help       Show this help",
    "",
    "Options:",
    "  -c, --config <path>    Config file (default: ./vellum.config.js)",
    "  -r, --root <path>      Project root (default: config directory)",
    "  -p, --port <number>    Dev or preview port (default: 4321)",
    "      --out <path>       Override outDir",
    "      --bundler <mode>   auto, rsbuild, or builtin",
    "      --drafts           Include draft pages",
    "      --no-search        Disable search index and UI",
    "  -f, --force            Overwrite files when scaffolding",
    "  -q, --quiet            Suppress progress output",
    "  -v, --verbose          Show debug output",
    "      --json             Print a machine-readable result",
    "  -h, --help             Show this help",
    "  -V, --version          Print the version",
    "",
    "Examples:",
    "  vellum new my-docs",
    "  vellum dev --config site/vellum.config.js",
    "  vellum build --bundler rsbuild",
    "  vellum check",
  ].join("\n");
}

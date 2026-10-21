// @flow
/*:: import type { Logger } from "../types.js"; */
import { fail } from "../util/errors.js";
import { ensureDir, isDirectory, isFile, listDir, writeText } from "../util/fs.js";
import { basename, humanize, join, resolve } from "../util/path.js";
import { VERSION } from "../version.js";

/*::
export type ScaffoldOptions = {
  directory: string,
  title?: string | null,
  force?: boolean,
  logger: Logger,
};
*/

function packageNameFor(directory /*: string */) /*: string */ {
  const name = basename(directory)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return name || "vellum-site";
}

function configTemplate(title /*: string */) /*: string */ {
  return (
    'import { defineConfig } from "vellum-docs";\n\n' +
    "export default defineConfig({\n" +
    "  title: " + JSON.stringify(title) + ",\n" +
    '  description: "Documentation built with Vellum.",\n' +
    "  // Set this to your deployed origin to enable canonical URLs and sitemap.xml.\n" +
    '  site: "",\n' +
    '  lang: "en",\n' +
    "  nav: [{ label: \"Guide\", link: \"/guide/getting-started/\" }],\n" +
    "  sidebar: [\n" +
    "    {\n" +
    '      label: "Overview",\n' +
    "      items: [{ label: \"Welcome\", link: \"/\" }],\n" +
    "    },\n" +
    "    {\n" +
    '      label: "Guide",\n' +
    "      items: [\n" +
    "        { label: \"Getting started\", link: \"/guide/getting-started/\" },\n" +
    "        { label: \"Writing content\", link: \"/guide/writing/\" },\n" +
    "      ],\n" +
    "    },\n" +
    "  ],\n" +
    "  theme: {\n" +
    '    accent: "#5b5bd6",\n' +
    "  },\n" +
    "  search: { enabled: true },\n" +
    "});\n"
  );
}

function indexMarkdown(title /*: string */) /*: string */ {
  return (
    "---\n" +
    "title: " + JSON.stringify(title) + "\n" +
    "description: A fast, Markdown-first documentation site.\n" +
    "layout: splash\n" +
    "hero:\n" +
    "  tagline: Write Markdown. Ship fast, accessible documentation with search, navigation, and dark mode built in.\n" +
    "  actions:\n" +
    "    - text: Get started\n" +
    "      link: /guide/getting-started/\n" +
    "      variant: primary\n" +
    "    - text: Write content\n" +
    "      link: /guide/writing/\n" +
    "      variant: secondary\n" +
    "features:\n" +
    "  - title: Markdown-first\n" +
    "    description: Author in plain `.md` files with frontmatter, no component syntax.\n" +
    "  - title: Static by default\n" +
    "    description: Every page is pre-rendered to HTML, CSS, JSON, and XML.\n" +
    "  - title: Fast local loop\n" +
    "    description: The dev server re-renders on change and reloads the browser.\n" +
    "  - title: Search included\n" +
    "    description: A small client-side index, generated at build time.\n" +
    "---\n\n" +
    "## Why Vellum\n\n" +
    "Vellum turns a folder of Markdown files into a complete documentation site. " +
    "There is no database, no client framework, and no required build service.\n\n" +
    "> [!TIP]\n" +
    "> Edit this page at `src/content/docs/index.md` and save. The dev server reloads automatically.\n\n" +
    "## Next steps\n\n" +
    "Read [Getting started](/guide/getting-started/) to install dependencies and run the site, " +
    "or jump to [Writing content](/guide/writing/) for frontmatter and Markdown syntax.\n"
  );
}

function gettingStartedMarkdown() /*: string */ {
  return (
    "---\n" +
    "title: Getting started\n" +
    "description: Install Vellum, run the development server, and build the site.\n" +
    "order: 1\n" +
    "---\n\n" +
    "# Getting started\n\n" +
    "Vellum runs on [Fairyfly](https://github.com/AbdElMajidOuhamane/ff), a small " +
    "JavaScript runtime built with Zig and QuickJS. The framework itself is plain " +
    "ES modules, so it starts with the runtime rather than a Node.js boot sequence.\n\n" +
    "## Install\n\n" +
    "```sh\n" +
    "npm install\n" +
    "```\n\n" +
    "## Develop\n\n" +
    "```sh\n" +
    "npm run dev\n" +
    "```\n\n" +
    "Open `http://localhost:4321/`. Markdown edits are picked up by the dev server's " +
    "polling watcher and the page reloads.\n\n" +
    "## Build\n\n" +
    "```sh\n" +
    "npm run build\n" +
    "```\n\n" +
    "The generated site is written to `dist/`. Preview it with:\n\n" +
    "```sh\n" +
    "npm run preview\n" +
    "```\n\n" +
    "> [!NOTE]\n" +
    "> Vellum builds browser assets with Rsbuild when `@rsbuild/core` is installed. " +
    "If it is missing, the built-in asset pipeline emits the theme CSS and client script instead.\n\n" +
    "## Project layout\n\n" +
    "| Path | Purpose |\n" +
    "| --- | --- |\n" +
    "| `vellum.config.js` | Site title, navigation, sidebar, theme, and build options |\n" +
    "| `src/content/docs/` | Markdown content; every `.md` becomes a page |\n" +
    "| `public/` | Static files copied to the output root |\n" +
    "| `dist/` | Generated site |\n"
  );
}

function writingMarkdown() /*: string */ {
  return (
    "---\n" +
    "title: Writing content\n" +
    "description: Frontmatter, headings, callouts, tables, and links.\n" +
    "order: 2\n" +
    "---\n\n" +
    "# Writing content\n\n" +
    "Add a `.md` file under `src/content/docs/`. The file path becomes the route:\n\n" +
    "| File | Route |\n" +
    "| --- | --- |\n" +
    "| `index.md` | `/` |\n" +
    "| `guide/writing.md` | `/guide/writing/` |\n" +
    "| `guide/index.md` | `/guide/` |\n\n" +
    "## Frontmatter\n\n" +
    "```yaml\n" +
    "---\n" +
    "title: Writing content\n" +
    "description: Shown in search results and meta tags.\n" +
    "order: 2\n" +
    "draft: false\n" +
    "sidebar:\n" +
    "  label: Writing\n" +
    "  group: Guide\n" +
    "  order: 2\n" +
    "---\n" +
    "```\n\n" +
    "Use `draft: true` to keep a page out of production builds. `vellum dev` still shows drafts.\n\n" +
    "## Markdown\n\n" +
    "Vellum supports headings, paragraphs, emphasis, lists, blockquotes, fenced code, " +
    "tables, links, images, task lists, and GitHub-style callouts.\n\n" +
    "```js\n" +
    "export function greet(name) {\n" +
    "  return `Hello, ${name}!`;\n" +
    "}\n" +
    "```\n\n" +
    "> [!WARNING]\n" +
    "> Raw HTML is allowed because documentation content is trusted. Do not render untrusted Markdown.\n\n" +
    "## Links\n\n" +
    "Link to another page with an absolute route or a `.md` path:\n\n" +
    "- [Getting started](/guide/getting-started/)\n" +
    "- [Writing content](./writing.md)\n\n" +
    "`vellum check` verifies internal links and reports broken routes.\n"
  );
}

export function scaffoldProject(options /*: ScaffoldOptions */) /*: Array<string> */ {
  const root = resolve(process.cwd(), [options.directory]);
  const requestedTitle = options.title;
  const title =
    typeof requestedTitle === "string" && requestedTitle.trim()
      ? requestedTitle.trim()
      : humanize(basename(root)) || "Vellum Docs";

  if (isFile(root)) {
    throw fail(
      "`" + root + "` is a file, not a directory.",
      "Choose another directory name.",
    );
  }
  if (isDirectory(root) && listDir(root).length > 0 && options.force !== true) {
    throw fail(
      "Directory `" + root + "` is not empty.",
      "Choose a new directory, or pass --force to write the scaffold into it.",
    );
  }

  ensureDir(root);
  ensureDir(join([root, "src/content/docs/guide"]));
  ensureDir(join([root, "public"]));

  const written = [];
  const write = (relativePath /*: string */, content /*: string */) => {
    const file = join([root, relativePath]);
    writeText(file, content);
    written.push(file);
  };

  write("vellum.config.js", configTemplate(title));
  write(
    "ff.json",
    JSON.stringify(
      {
        name: packageNameFor(root),
        version: "0.1.0",
        description: "Documentation built with Vellum on Fairyfly.",
        main: "vellum.js",
        author: "",
        license: "MIT",
      },
      null,
      2,
    ) + "\n",
  );
  write(
    "vellum.js",
    'import { findFrameworkRoot, runCli } from "vellum-docs";\n\n' +
      "// ff.json points here, so `ff start` runs the dev server with no arguments.\n" +
      "const command = process.argv[2] || \"dev\";\n\n" +
      "try {\n" +
      "  await runCli([command, ...process.argv.slice(3)], {\n" +
      "    frameworkRoot: findFrameworkRoot(process.cwd()),\n" +
      "  });\n" +
      "} catch (error) {\n" +
      '  console.error("error: " + (error && error.message ? error.message : String(error)));\n' +
      '  if (error && error.hint) console.error("hint: " + error.hint);\n' +
      "  process.exit(1);\n" +
      "}\n",
  );
  write("src/content/docs/index.md", indexMarkdown(title));
  write("src/content/docs/guide/getting-started.md", gettingStartedMarkdown());
  write("src/content/docs/guide/writing.md", writingMarkdown());
  write(
    "public/favicon.svg",
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">' +
      '<rect width="32" height="32" rx="9" fill="#5b5bd6"/>' +
      '<path d="M9 10.5 15.8 21.5 23 10.5" fill="none" stroke="white" stroke-width="2.8" ' +
      'stroke-linecap="round" stroke-linejoin="round"/></svg>\n',
  );
  write(
    "package.json",
    JSON.stringify(
      {
        name: packageNameFor(root),
        version: "0.1.0",
        private: true,
        type: "module",
        scripts: {
          dev: "ff vellum.js dev",
          build: "ff vellum.js build",
          preview: "ff vellum.js preview",
          check: "ff vellum.js check",
        },
        devDependencies: {
          "@rsbuild/core": "^1.7.6",
          "vellum-docs": "github:AbdElMajidOuhamane/Vellum#v" + VERSION,
        },
      },
      null,
      2,
    ) + "\n",
  );
  write(
    ".gitignore",
    "node_modules/\ndist/\n.vellum/\n.DS_Store\n",
  );
  write(
    "README.md",
    "# " + title + "\n\n" +
      "Documentation site built with Vellum on Fairyfly.\n\n" +
      "## Fairyfly (recommended)\n\n" +
      "```sh\nff imprint github:AbdElMajidOuhamane/Vellum#v" + VERSION + "\nff start\n```\n\n" +
      "`ff.json` points at `vellum.js`; `ff start` runs the dev server.\n\n" +
      "```sh\nff vellum.js build\nff vellum.js preview\nff vellum.js check\n```\n\n" +
      "## npm (optional)\n\n" +
      "Node.js and npm are only needed for Rsbuild and Flow. The built-in asset\n" +
      "pipeline works with Fairyfly alone.\n\n" +
      "```sh\nnpm install\nnpm run dev\n```\n\n" +
      "Build with `npm run build`; preview the output with `npm run preview`.\n",
  );

  for (const file of written) {
    options.logger.step("created " + file);
  }
  options.logger.info("\u2713 Scaffolded " + title + " in `" + root + "`.");
  options.logger.info(
    "  \u2022 next: cd " + options.directory + " && ff imprint github:AbdElMajidOuhamane/Vellum#v" + VERSION + " && ff start",
  );
  return written;
}

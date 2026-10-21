// @flow
/*:: import type { VellumError } from "./errors.js"; */
import { fail, errorMessage } from "./errors.js";
import {
  basename,
  dirname,
  extname,
  isWithin,
  join,
  normalize,
  toPosix,
} from "./path.js";
import { hashBytes } from "./hash.js";

const TEXT_EXTENSIONS /*: Array<string> */ = [
  ".html",
  ".htm",
  ".css",
  ".js",
  ".mjs",
  ".json",
  ".map",
  ".xml",
  ".txt",
  ".md",
  ".markdown",
  ".svg",
  ".webmanifest",
];

/*::
export type WalkOptions = {
  skipDirs?: Array<string>,
  extensions?: Array<string>,
  includeHidden?: boolean,
  maxDepth?: number,
  maxFiles?: number,
};
*/

const DEFAULT_SKIPPED /*: Array<string> */ = [
  "node_modules",
  "dist",
  ".vellum",
  ".git",
  ".hg",
  ".svn",
];

export function exists(file /*: string */) /*: boolean */ {
  try {
    return fs.exists(file) === true;
  } catch (_error) {
    return false;
  }
}

export function isDirectory(file /*: string */) /*: boolean */ {
  if (!exists(file)) {
    return false;
  }
  try {
    const names = fs.readdir(file);
    return names !== undefined && names !== null;
  } catch (_error) {
    return false;
  }
}

export function isFile(file /*: string */) /*: boolean */ {
  return exists(file) && !isDirectory(file);
}

export function readText(file /*: string */) /*: string | null */ {
  try {
    const value = fs.readFile(file);
    return typeof value === "string" ? value : null;
  } catch (_error) {
    return null;
  }
}

export function readBytes(file /*: string */) /*: ArrayBuffer | null */ {
  try {
    const value = fs.readFile(file, "buffer");
    if (value === undefined || value === null) {
      return null;
    }
    if (typeof value === "string") {
      return new TextEncoder().encode(value).buffer;
    }
    return value;
  } catch (_error) {
    return null;
  }
}

export function ensureDir(directory /*: string */) /*: void */ {
  const target = normalize(directory);
  if (target === "." || target === "/") {
    return;
  }
  if (exists(target)) {
    if (!isDirectory(target)) {
      throw fail(
        "Cannot create directory `" + target + "`: a file already exists there.",
        "Remove or rename the file, then run the command again.",
      );
    }
    return;
  }
  try {
    fs.mkdir(target, true);
  } catch (error) {
    throw fail(
      "Could not create directory `" + target + "`: " + errorMessage(error),
      "Check permissions on the parent directory.",
    );
  }
  if (!isDirectory(target)) {
    throw fail(
      "Could not create directory `" + target + "`.",
      "Check that the path is valid and the parent is writable.",
    );
  }
}

export function writeText(file /*: string */, content /*: string */) /*: void */ {
  const target = normalize(file);
  ensureDir(dirname(target));
  try {
    fs.writeFile(target, content);
  } catch (error) {
    throw fail(
      "Could not write `" + target + "`: " + errorMessage(error),
      "Check permissions and the available disk space.",
    );
  }
  if (!exists(target)) {
    throw fail(
      "Could not write `" + target + "`.",
      "Fairyfly's sync filesystem calls fail silently; verify the parent directory is writable.",
    );
  }
}

export function readJson(file /*: string */) /*: any */ {
  const text = readText(file);
  if (text === null) {
    throw fail("Could not read `" + file + "`.", "Check that the file exists.");
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    throw fail(
      "Invalid JSON in `" + file + "`: " + errorMessage(error),
      "Fix the JSON syntax and try again.",
    );
  }
}

export function writeJson(file /*: string */, value /*: mixed */, indent /*: number */ = 2) /*: void */ {
  const serialized = JSON.stringify(value, null, indent);
  writeText(file, (serialized === undefined ? "null" : serialized) + "\n");
}

export function listDir(directory /*: string */) /*: Array<string> */ {
  try {
    const names = fs.readdir(directory);
    if (!names) {
      return [];
    }
    return names.slice().sort();
  } catch (_error) {
    return [];
  }
}

export function walkFiles(root /*: string */, options /*: WalkOptions */ = {}) /*: Array<string> */ {
  const extensions = options.extensions || [];
  const skipped = (options.skipDirs || []).concat(DEFAULT_SKIPPED);
  const includeHidden = options.includeHidden === true;
  const maxDepth = options.maxDepth === undefined ? 32 : options.maxDepth;
  const maxFiles = options.maxFiles === undefined ? 100000 : options.maxFiles;
  const output = [];
  const visited /*: Set<string> */ = new Set();

  function visit(directory /*: string */, depth /*: number */) /*: void */ {
    if (depth > maxDepth || output.length >= maxFiles) {
      return;
    }
    const normalized = normalize(directory);
    if (visited.has(normalized)) {
      return;
    }
    visited.add(normalized);

    for (const name of listDir(normalized)) {
      if (!includeHidden && name.startsWith(".")) {
        continue;
      }
      if (skipped.includes(name)) {
        continue;
      }
      const target = join([normalized, name]);
      if (isDirectory(target)) {
        visit(target, depth + 1);
        continue;
      }
      if (extensions.length > 0) {
        const ext = extname(target).toLowerCase();
        if (!extensions.includes(ext)) {
          continue;
        }
      }
      output.push(target);
      if (output.length >= maxFiles) {
        return;
      }
    }
  }

  if (!isDirectory(root)) {
    return [];
  }
  visit(root, 0);
  output.sort();
  return output;
}

export function removePath(target /*: string */) /*: void */ {
  if (!exists(target)) {
    return;
  }
  try {
    fs.rm(target, true);
  } catch (error) {
    throw fail(
      "Could not remove `" + target + "`: " + errorMessage(error),
      "Check permissions on the path.",
    );
  }
  if (exists(target)) {
    throw fail(
      "Could not remove `" + target + "`.",
      "Close any program using it and check permissions.",
    );
  }
}

export function clearDir(directory /*: string */) /*: void */ {
  if (!exists(directory)) {
    ensureDir(directory);
    return;
  }
  if (!isDirectory(directory)) {
    throw fail(
      "Output path `" + directory + "` is a file, not a directory.",
      "Choose a different outDir in vellum.config.js.",
    );
  }
  for (const name of listDir(directory)) {
    removePath(join([directory, name]));
  }
  // Fairyfly's recursive rm can leave a pending error in the runtime. A
  // successful mkdir on the (still existing) output directory clears it.
  fs.mkdir(directory, true);
}

export function hashFile(file /*: string */) /*: string */ {
  const bytes = readBytes(file);
  if (bytes === null) {
    return "missing";
  }
  return hashBytes(new Uint8Array(bytes));
}

async function copyWithShell(source /*: string */, destination /*: string */) /*: Promise<boolean> */ {
  if (typeof child_process === "undefined" || !child_process || typeof child_process.spawn !== "function") {
    return false;
  }
  try {
    const child = child_process.spawn("cp", [source, destination]);
    const result = await child.wait();
    return result.code === 0;
  } catch (_error) {
    return false;
  }
}

export async function copyFile(source /*: string */, destination /*: string */) /*: Promise<void> */ {
  ensureDir(dirname(destination));
  const copied = await copyWithShell(source, destination);
  if (!copied) {
    const ext = extname(source).toLowerCase();
    if (TEXT_EXTENSIONS.includes(ext)) {
      const text = readText(source);
      if (text !== null) {
        writeText(destination, text);
        return;
      }
    }
    throw fail(
      "Could not copy `" + source + "` to `" + destination + "`.",
      "Binary assets require the POSIX `cp` command; Fairyfly's fs.writeFile accepts text only.",
    );
  }
  if (!exists(destination)) {
    throw fail(
      "Copy appeared to succeed but `" + destination + "` is missing.",
      "Check that the destination directory is writable.",
    );
  }
}

export async function copyDir(
  source /*: string */,
  destination /*: string */,
  options /*: { skipDirs?: Array<string>, includeHidden?: boolean } */ = {},
) /*: Promise<Array<string>> */ {
  const skipped = (options.skipDirs || []).concat(DEFAULT_SKIPPED);
  const includeHidden = options.includeHidden === true;
  const copied = [];

  async function visit(from /*: string */, to /*: string */, depth /*: number */) /*: Promise<void> */ {
    if (depth > 32) {
      return;
    }
    ensureDir(to);
    for (const name of listDir(from)) {
      if (!includeHidden && name.startsWith(".")) {
        continue;
      }
      if (skipped.includes(name)) {
        continue;
      }
      const sourcePath = join([from, name]);
      const destinationPath = join([to, name]);
      if (isDirectory(sourcePath)) {
        await visit(sourcePath, destinationPath, depth + 1);
      } else {
        await copyFile(sourcePath, destinationPath);
        copied.push(destinationPath);
      }
    }
  }

  if (!isDirectory(source)) {
    return copied;
  }
  await visit(source, destination, 0);
  return copied;
}

export function safeJoin(root /*: string */, requestPath /*: string */) /*: string */ {
  let relativePath = toPosix(requestPath);
  relativePath = relativePath.replace(/^\/+/, "");
  if (relativePath.includes("\u0000")) {
    throw fail("Invalid request path.", "Paths may not contain NUL bytes.");
  }
  const target = join([root, relativePath]);
  if (!isWithin(root, target)) {
    throw fail(
      "Path escapes the project root: `" + requestPath + "`.",
      "Only paths inside the configured directory can be served.",
    );
  }
  return target;
}

export function fileExistsWithExtension(
  directory /*: string */,
  name /*: string */,
  extensions /*: Array<string> */,
) /*: string | null */ {
  const base = basename(name);
  for (const ext of extensions) {
    const candidate = join([directory, base + ext]);
    if (isFile(candidate)) {
      return candidate;
    }
  }
  return null;
}

export function describePath(file /*: string */) /*: string */ {
  const ext = extname(file);
  return ext ? basename(file) : file;
}

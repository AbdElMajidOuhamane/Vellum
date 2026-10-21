// @flow
import { dirname, join } from "../src/util/path.js";

let suiteChecks = 0;
let suiteFailures = 0;

export async function load(specifier /*: string */) /*: Promise<any> */ {
  try {
    return await import(specifier);
  } catch (_error) {
    // Fairyfly can throw NotDir while resolving the first module from a new
    // directory after another module evaluation. A retry succeeds.
    return await import(specifier);
  }
}

export function check(
  name /*: string */,
  condition /*: mixed */,
  detail /*: string */ = "",
) /*: void */ {
  suiteChecks += 1;
  if (condition) {
    console.log("ok   " + name);
  } else {
    suiteFailures += 1;
    console.log("FAIL " + name + (detail ? " :: " + detail : ""));
  }
}

export function eq(name /*: string */, actual /*: mixed */, expected /*: mixed */) /*: void */ {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  check(name, actualText === expectedText, "got " + String(actualText) + " expected " + String(expectedText));
}

export function includes(name /*: string */, value /*: string */, needle /*: string */) /*: void */ {
  check(name, value.includes(needle), "missing `" + needle + "` in " + value.slice(0, 300));
}

export function notIncludes(name /*: string */, value /*: string */, needle /*: string */) /*: void */ {
  check(name, !value.includes(needle), "unexpected `" + needle + "`");
}

export function throws(name /*: string */, fn /*: () => mixed */, needle /*: string */) /*: void */ {
  try {
    fn();
    check(name, false, "did not throw");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    check(name, message.includes(needle), "got `" + message + "`");
  }
}

function shellRemove(directory /*: string */) /*: void */ {
  const quoted = "'" + directory.replace(/'/g, "'\\''") + "'";
  if (typeof child_process === "undefined" || !child_process || typeof child_process.execSync !== "function") {
    // ff releases <= 0.1.x predate the child_process API. Fall back to the
    // native rm, then clear ff's pending-error quirk (see src/util/fs.js).
    try {
      fs.rm(directory, true);
    } catch (_error) {
      /* Best effort: the path may already be absent. */
    }
    try {
      fs.mkdir(directory, true);
    } catch (_error) {
      /* mkdir fails when the target was a file path — fine. */
    }
    return;
  }
  try {
    child_process.execSync("rm -rf " + quoted);
  } catch (_error) {
    /* Best effort: the path may already be absent. */
  }
}

export function tempDir(name /*: string */) /*: string */ {
  const directory = join([process.cwd(), "test/.tmp", name + "-" + String(process.pid)]);
  shellRemove(directory);
  fs.mkdir(directory, true);
  return directory;
}

export function writeFile(file /*: string */, content /*: string */) /*: void */ {
  fs.mkdir(dirname(file), true);
  fs.writeFile(file, content);
}

export function writeJson(file /*: string */, value /*: mixed */) /*: void */ {
  writeFile(file, JSON.stringify(value, null, 2) + "\n");
}

export function readFile(file /*: string */) /*: string */ {
  const value = fs.readFile(file);
  return typeof value === "string" ? value : "";
}

export function cleanup(directory /*: string */) /*: void */ {
  // Use a subprocess: Fairyfly's recursive fs.rm can leave a pending
  // NotDir/FileNotFound error that the next module import surfaces.
  shellRemove(directory);
}

export function done(suite /*: string */) /*: void */ {
  const failed = suiteFailures;
  const total = suiteChecks;
  suiteChecks = 0;
  suiteFailures = 0;
  if (failed === 0) {
    console.log("PASS " + suite + " (" + String(total) + " checks)");
    return;
  }
  // ff test evaluates each file in one runtime. Throwing marks this file as
  // failed without preventing later suites from running.
  throw new Error(
    "FAIL " + suite + " (" + String(failed) + "/" + String(total) + " checks failed)",
  );
}

// @flow
import { hashFile, walkFiles } from "../util/fs.js";
import { relative } from "../util/path.js";
import { combineHashes } from "../util/hash.js";

/*::
export type WatcherOptions = {
  roots: Array<string>,
  extensions?: Array<string>,
  extraFiles?: Array<string>,
  interval?: number,
  includePublic?: boolean,
};

export type Watcher = {
  start: () => void,
  stop: () => void,
  pollNow: () => { changed: boolean, fingerprint: string, version: string },
  getVersion: () => string,
  consumeDirty: () => boolean,
  isDirty: () => boolean,
};
*/

/*::
export type Fingerprint = {
  fingerprint: string,
  files: Array<string>,
};
*/

export function fingerprintFiles(
  options /*: WatcherOptions */,
) /*: Fingerprint */ {
  const files = [];
  const extra = options.extraFiles || [];
  const extensions = options.extensions || [];
  for (const root of options.roots) {
    for (const file of walkFiles(root, { extensions, includeHidden: false })) {
      files.push(root + "\u0000" + relative(root, file));
    }
  }
  for (const file of extra) {
    files.push(file);
  }
  files.sort();

  const hashes = [];
  const seen /*: Set<string> */ = new Set();
  for (const token of files) {
    const separator = token.indexOf("\u0000");
    const path = separator >= 0 ? token.slice(separator + 1) : token;
    const absolute = separator >= 0 ? token.slice(0, separator) + "/" + path : token;
    if (seen.has(absolute)) {
      continue;
    }
    seen.add(absolute);
    hashes.push(path + ":" + hashFile(absolute));
  }
  return {
    fingerprint: combineHashes(hashes),
    files: Array.from(seen),
  };
}

export function createWatcher(options /*: WatcherOptions */) /*: Watcher */ {
  const interval = options.interval === undefined ? 700 : options.interval;
  let current = fingerprintFiles(options);
  let revision = 0;
  let dirty = false;
  let timer = null;

  function pollNow() /*: { changed: boolean, fingerprint: string, version: string } */ {
    const next = fingerprintFiles(options);
    const changed = next.fingerprint !== current.fingerprint;
    if (changed) {
      revision += 1;
      current = next;
      dirty = true;
    }
    return {
      changed,
      fingerprint: current.fingerprint,
      version: versionString(),
    };
  }

  function versionString() /*: string */ {
    return "dev-" + String(revision) + "-" + current.fingerprint;
  }

  return {
    start: () => {
      if (timer !== null) {
        return;
      }
      timer = setInterval(() => {
        pollNow();
      }, interval);
    },
    stop: () => {
      if (timer !== null) {
        clearInterval(timer);
        timer = null;
      }
    },
    pollNow,
    getVersion: versionString,
    consumeDirty: () => {
      const wasDirty = dirty;
      dirty = false;
      return wasDirty;
    },
    isDirty: () => dirty,
  };
}

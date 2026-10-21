// @flow

/**
 * Deterministic, dependency-free hashing used for dev-server change
 * detection. FNV-1a is not cryptographic; it only needs to notice edits.
 */

export function hashString(value /*: string */) /*: string */ {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function hashBytes(bytes /*: Uint8Array */) /*: string */ {
  let hash = 0x811c9dc5;
  for (let index = 0; index < bytes.length; index += 1) {
    hash ^= bytes[index];
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function combineHashes(parts /*: Array<string> */) /*: string */ {
  return hashString(parts.join("|"));
}

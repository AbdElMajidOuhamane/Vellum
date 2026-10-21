// @flow

/**
 * Errors that carry an actionable hint, rendered by the CLI in the same
 * `error:` / `hint:` shape Fairyfly uses for its own diagnostics.
 */
export class VellumError extends Error {
  hint /*: string | void */;

  constructor(message /*: string */, hint /*: string | void */) {
    super(message);
    this.name = "VellumError";
    this.hint = hint;
  }
}

export function fail(message /*: string */, hint /*: string | void */) /*: VellumError */ {
  return new VellumError(message, hint);
}

export function assert(
  condition /*: mixed */,
  message /*: string */,
  hint /*: string | void */,
) /*: void */ {
  if (!condition) {
    throw fail(message, hint);
  }
}

export function errorMessage(error /*: mixed */) /*: string */ {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return String(error);
}

export function errorHint(error /*: mixed */) /*: string | void */ {
  if (error instanceof VellumError) {
    return error.hint;
  }
  return undefined;
}

export function errorStack(error /*: mixed */) /*: string */ {
  if (error instanceof Error && error.stack) {
    return String(error.stack);
  }
  return errorMessage(error);
}

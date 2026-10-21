// @flow
/*:: import type { Logger } from "../types.js"; */

/*::
type LoggerOptions = {
  quiet?: boolean,
  verbose?: boolean,
};
*/

function write(line /*: string */, toError /*: boolean */) /*: void */ {
  if (toError) {
    console.error(line);
  } else {
    console.log(line);
  }
}

/**
 * Fairyfly's console writes to stderr. Vellum keeps the same behavior and
 * never mixes progress output into generated files.
 */
export function createLogger(options /*: LoggerOptions */ = {}) /*: Logger */ {
  const quiet = options.quiet === true;
  const verbose = options.verbose === true;

  return {
    quiet,
    info: (message /*: string */) => {
      if (!quiet) {
        write(message, false);
      }
    },
    step: (message /*: string */) => {
      if (!quiet) {
        write("  \u2192 " + message, false);
      }
    },
    warn: (message /*: string */) => {
      write("warning: " + message, true);
    },
    error: (message /*: string */) => {
      write("error: " + message, true);
    },
    debug: (message /*: string */) => {
      if (verbose && !quiet) {
        write("debug: " + message, false);
      }
    },
  };
}

export function formatDuration(milliseconds /*: number */) /*: string */ {
  if (milliseconds < 1000) {
    return Math.round(milliseconds) + "ms";
  }
  return (milliseconds / 1000).toFixed(2) + "s";
}

export function plural(count /*: number */, word /*: string */) /*: string */ {
  return count === 1 ? word : word + "s";
}

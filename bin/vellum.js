import { main } from "../src/cli.js";
import { errorHint, errorMessage, errorStack } from "../src/util/errors.js";
import { dirname, isAbsolute, join } from "../src/util/path.js";

// bin/vellum launches from the package root so Fairyfly resolves relative
// imports correctly. The CLI receives the caller's cwd through VELLUM_CWD and
// only changes directory for commands that resolve user-relative paths.

const argv1 = process.argv[1] || join([process.cwd(), "bin/vellum.js"]);
const entry = isAbsolute(argv1) ? argv1 : join([process.cwd(), argv1]);
const frameworkRoot = process.env.VELLUM_ROOT || dirname(dirname(entry));

main(process.argv.slice(2), { frameworkRoot }).catch((error) => {
  console.error("error: " + errorMessage(error));
  const hint = errorHint(error);
  if (hint) {
    console.error("hint: " + hint);
  }
  if (process.env.VELLUM_DEBUG) {
    console.error(errorStack(error));
  }
  process.exit(1);
});

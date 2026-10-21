// A scaffolded Vellum project uses this exact shape. `ff.json` points here, so
// `ff start` runs the dev server and `ff vellum.js build` runs a command.
import { findFrameworkRoot, runCli } from "vellum-docs";

const command = process.argv[2] || "dev";

try {
  await runCli([command, ...process.argv.slice(3)], {
    frameworkRoot: findFrameworkRoot(process.cwd()),
  });
} catch (error) {
  console.error("error: " + (error && error.message ? error.message : String(error)));
  if (error && error.hint) {
    console.error("hint: " + error.hint);
  }
  process.exit(1);
}

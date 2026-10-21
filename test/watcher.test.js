import { check, done, eq, tempDir, writeFile, cleanup, removeFile } from "./lib.js";
import { createWatcher, fingerprintFiles } from "../src/server/watcher.js";

const root = tempDir("watcher");
writeFile(root + "/a.md", "# A\n");
writeFile(root + "/b.md", "# B\n");

const watcher = createWatcher({
  roots: [root],
  extensions: [".md"],
  interval: 1000,
});

const first = watcher.pollNow();
check("initial unchanged", !first.changed);
check("initial not dirty", !watcher.isDirty());
eq("version shape", first.version.startsWith("dev-0-"), true);

writeFile(root + "/a.md", "# A changed\n");
const second = watcher.pollNow();
check("edit detected", second.changed);
check("edit dirty", watcher.isDirty());
check("version changed", second.version !== first.version);
check("consume dirty", watcher.consumeDirty());
check("consume clears", !watcher.consumeDirty());

writeFile(root + "/c.md", "# C\n");
const third = watcher.pollNow();
check("new file detected", third.changed);

const stable = watcher.pollNow();
check("no change settles", !stable.changed);
writeFile(root + "/ignore.txt", "not watched\n");
const fourth = watcher.pollNow();
check("ignored extension", !fourth.changed);

removeFile(root + "/c.md");
const fifth = watcher.pollNow();
check("delete detected", fifth.changed);

const fingerprint = fingerprintFiles({ roots: [root], extensions: [".md"] });
check("fingerprint deterministic", fingerprint.fingerprint === watcher.pollNow().fingerprint);
check("fingerprint files", fingerprint.files.length === 2);

watcher.stop();
watcher.stop();
cleanup(root);
done("watcher");

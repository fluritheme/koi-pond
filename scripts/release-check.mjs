import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const p = JSON.parse(
  await readFile(new URL("../package.json", import.meta.url), "utf8"),
);
assert.equal(p.name, "@fluritheme/koi-pond");
assert.equal(p.license, "SEE LICENSE IN LICENSE");
assert.equal(p.homepage, "https://fluri.xyz/");
for (const f of [
  "dist/index.js",
  "dist/index.d.ts",
  "dist/standalone.js",
  "README.md",
  "LICENSE",
  "LICENSE-MIT-LEGACY",
  "LICENSING.md",
  "licensing.json",
  "THIRD-PARTY-NOTICES.txt",
])
  assert.ok(
    (await readFile(new URL("../" + f, import.meta.url))).length > 10,
    f,
  );
const { createKoiPond } = await import("../dist/index.js");
const c = createKoiPond();
assert.equal(c.getState().ready, false);
assert.equal(c.getState().fish.length, 8);
c.feed();
c.destroy();
c.destroy();
assert.equal(c.getState().destroyed, true);
console.log(
  p.name +
    "@" +
    p.version +
    ": licensing, browser-independent import and cleanup verified.",
);

import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
const run = (command, args, cwd) => {
  const r = spawnSync(command, args, { cwd, encoding: "utf8" });
  if (r.status) throw Error(r.stderr || r.stdout);
  return r.stdout;
};
const root = new URL("../", import.meta.url).pathname;
const dir = await mkdtemp(join(tmpdir(), "fluri-koi-consumer-"));
const output = JSON.parse(
  run(
    "npm",
    ["pack", "--ignore-scripts", "--json", "--pack-destination", dir],
    root,
  ),
)[0];
const names = output.files.map((f) => f.path);
for (const f of [
  "LICENSE",
  "LICENSE-MIT-LEGACY",
  "LICENSING.md",
  "licensing.json",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/standalone.js",
  "README.md",
])
  assert.ok(names.includes(f), f);
assert.ok(
  !names.some((n) => /\.env|\.npmrc|node_modules|test-results/.test(n)),
);
await writeFile(join(dir, "package.json"), '{"private":true,"type":"module"}');
run(
  "npm",
  [
    "install",
    "--ignore-scripts",
    "--no-audit",
    "--no-fund",
    join(dir, output.filename),
  ],
  dir,
);
run(
  "node",
  [
    "--input-type=module",
    "-e",
    "import {createKoiPond} from '@fluritheme/koi-pond';const c=createKoiPond();if(c.getState().ready||c.getState().fish.length!==8)throw Error('Invalid installed SSR controller');c.destroy();c.destroy();",
  ],
  dir,
);
const installed = JSON.parse(
  await readFile(
    join(dir, "node_modules/@fluritheme/koi-pond/package.json"),
    "utf8",
  ),
);
assert.equal(installed.version, "0.1.0");
console.log(
  JSON.stringify({
    package: installed.name,
    version: installed.version,
    files: names.length,
    packedBytes: output.size,
    unpackedBytes: output.unpackedSize,
    consumer: dir,
    installed: true,
  }),
);

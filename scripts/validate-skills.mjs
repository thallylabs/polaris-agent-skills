/**
 * Validate every published skill. POLARIS_SKILL_VALIDATOR lets CI opt into
 * Codex's canonical validator while the local fallback keeps the repo usable.
 */

import { readdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const validator = process.env.POLARIS_SKILL_VALIDATOR;
const skillRoot = new URL("../skills/", import.meta.url);
const skillDirectories = readdirSync(skillRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => join(skillRoot.pathname, entry.name))
  .sort();

if (skillDirectories.length === 0) {
  throw new Error("No skills found under skills/.");
}

for (const directory of skillDirectories) {
  const command = validator ? "python3" : process.execPath;
  const args = validator
    ? [validator, directory]
    : [new URL("./validate-skill.mjs", import.meta.url).pathname, directory];
  const result = spawnSync(command, args, { encoding: "utf8" });

  process.stdout.write(result.stdout);
  process.stderr.write(result.stderr);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

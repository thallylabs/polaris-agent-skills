#!/usr/bin/env node

/**
 * Portable structural fallback for environments without the Codex validator.
 * It checks format and unfinished scaffolds, not generated prose wording.
 */

import { readFileSync } from "node:fs";
import { basename, join } from "node:path";

const directory = process.argv[2];
if (!directory) throw new Error("Expected a skill directory.");

const name = basename(directory);
const skill = readFileSync(join(directory, "SKILL.md"), "utf8");
const metadata = readFileSync(join(directory, "agents/openai.yaml"), "utf8");
const frontmatter = skill.match(/^---\n([\s\S]*?)\n---\n/u)?.[1];

if (!frontmatter) throw new Error(`${name}: missing YAML frontmatter.`);
if (!frontmatter.includes(`name: ${name}`)) {
  throw new Error(`${name}: frontmatter name does not match its folder.`);
}
if (!/^description: .+/mu.test(frontmatter)) {
  throw new Error(`${name}: missing description.`);
}
if (/\bTODO\b|\[TODO/u.test(skill)) {
  throw new Error(`${name}: unfinished scaffold content.`);
}
if (!metadata.includes(`$${name}`)) {
  throw new Error(`${name}: default prompt must mention the skill.`);
}

process.stdout.write(`${name}: valid\n`);

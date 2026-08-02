#!/usr/bin/env node
// CI's one hard quality gate: no key/token pattern may land in the repo or
// the built client bundle. Deliberately pattern-based (known key-format
// signatures), not a broad "contains the word key" check, which would
// false-positive on ordinary identifiers throughout this codebase. Ported
// verbatim from allergy-locator (this project's spiritual predecessor).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/sk-[a-zA-Z0-9]{20,}/, "OpenAI-style secret key"],
  [/ghp_[a-zA-Z0-9]{36}/, "GitHub personal access token"],
  [/xox[baprs]-[0-9a-zA-Z-]{10,}/, "Slack token"],
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, "private key block"],
  [/eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, "JWT-shaped token"],
];

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "test-results", "playwright-report"]);

function walk(dir, onFile) {
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, onFile);
    } else if (stat.isFile()) {
      onFile(full);
    }
  }
}

function scan(root, label) {
  const findings = [];
  walk(root, (file) => {
    let content;
    try {
      content = readFileSync(file, "utf8");
    } catch {
      return; // binary/unreadable file -- not a text secret carrier
    }
    for (const [pattern, name] of SECRET_PATTERNS) {
      if (pattern.test(content)) {
        findings.push(`${label}: ${file} -- looks like a ${name}`);
      }
    }
  });
  return findings;
}

const findings = [...scan(process.cwd(), "repo"), ...scan(join(process.cwd(), ".next"), "client bundle")];

if (findings.length > 0) {
  console.error("Secret scan FAILED:");
  findings.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log("Secret scan passed: no key/token pattern found in the repo or built client bundle.");

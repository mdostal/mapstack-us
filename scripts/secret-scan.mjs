#!/usr/bin/env node
// CI's one hard quality gate: no key/token pattern may land in the repo or
// the built client bundle. Deliberately pattern-based (known key-format
// signatures), not a broad "contains the word key" check, which would
// false-positive on ordinary identifiers throughout this codebase. Ported
// verbatim from allergy-locator (this project's spiritual predecessor),
// including the git-aware "repo" scan fix (see scanRepo below).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { execFileSync } from "node:child_process";

const SECRET_PATTERNS = [
  [/AKIA[0-9A-Z]{16}/, "AWS access key"],
  [/sk-[a-zA-Z0-9]{20,}/, "OpenAI-style secret key"],
  [/ghp_[a-zA-Z0-9]{36}/, "GitHub personal access token"],
  [/xox[baprs]-[0-9a-zA-Z-]{10,}/, "Slack token"],
  [/-----BEGIN (RSA |EC |OPENSSH |DSA |)PRIVATE KEY-----/, "private key block"],
  [/eyJhbGciOi[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/, "JWT-shaped token"],
];

const SKIP_DIRS = new Set(["node_modules", ".git", ".next", "test-results", "playwright-report"]);

function scanFile(file, label, findings) {
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
}

/**
 * The "repo" scan only covers git-tracked + untracked-but-NOT-gitignored
 * files -- this is what "no secret may land in the repo" actually means, and
 * it's what keeps a routine local dev artifact like `vercel link`'s own
 * gitignored .env.local (a short-lived Vercel OIDC token, never committed)
 * from failing this check on every developer's machine. Falls back to a raw
 * filesystem walk if git itself is unavailable (e.g. a tarball checkout).
 */
function scanRepo(root, label) {
  const findings = [];
  let files;
  try {
    files = execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
      cwd: root,
      encoding: "utf8",
    })
      .split("\n")
      .filter(Boolean);
  } catch {
    files = null;
  }

  if (files) {
    for (const relPath of files) scanFile(join(root, relPath), label, findings);
    return findings;
  }

  walk(root, (file) => scanFile(file, label, findings));
  return findings;
}

/** The "client bundle" scan is deliberately a raw filesystem walk, NOT
 * git-aware -- .next/ is itself gitignored, but that's exactly the shipped
 * output this check exists to catch secrets baked into (a real, distinct
 * concern from "committed to git"). */
function scanBuildOutput(root, label) {
  const findings = [];
  walk(root, (file) => scanFile(file, label, findings));
  return findings;
}

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

const findings = [
  ...scanRepo(process.cwd(), "repo"),
  ...scanBuildOutput(join(process.cwd(), ".next"), "client bundle"),
];

if (findings.length > 0) {
  console.error("Secret scan FAILED:");
  findings.forEach((f) => console.error(`  ${f}`));
  process.exit(1);
}

console.log("Secret scan passed: no key/token pattern found in the repo or built client bundle.");

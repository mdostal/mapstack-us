#!/usr/bin/env bash
# Codifies the full manual ship ritual this project has repeated by hand
# every session (dvd-2, dataset-verification-drive epic) into one command.
# Composes the EXISTING named pnpm scripts in the established order --
# does not reimplement any step's logic, so there's one source of truth
# per step; only the sequencing and clean-build orchestration are new.
#
# Deliberately stops short of: the live-browser Playwright MCP check
# (needs a human-in-the-loop-capable agent session, not a shell script)
# and git commit/push/deploy (judgment calls, not mechanically scriptable).
set -euo pipefail
cd "$(dirname "$0")/.."

step() { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }

step "1/6 typecheck (tsc --noEmit)"
pnpm typecheck

step "2/6 lint"
pnpm lint

step "3/6 unit tests (vitest)"
pnpm test

step "4/6 secret scan"
pnpm test:secrets

step "5/6 clean production build"
rm -rf .next
pnpm build

step "6/6 e2e tests (playwright)"
pnpm test:e2e

printf '\n\033[1;32mverify: all steps passed.\033[0m\n'

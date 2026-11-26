#!/bin/sh
# Layer 1 of gasp-core-e2e: the contract in code. Run from anywhere.
# Exits non-zero on the first failing step; prints a one-line verdict per step.
set -u
APP_DIR="$(cd "$(dirname "$0")/../../../.." && pwd)"
OUT="${1:-${TMPDIR:-/tmp}/gasp-core-e2e}"
mkdir -p "$OUT"
cd "$APP_DIR" || exit 1

step() {
  name="$1"; shift
  if "$@" >"$OUT/$name.log" 2>&1; then
    echo "PASS $name"
  else
    echo "FAIL $name (see $OUT/$name.log)"
    tail -30 "$OUT/$name.log"
    exit 1
  fi
}

step flow-contract npx jest "app/\(modals\)/__tests__/view-gasp.flow" services/__tests__/flowTrace
step full-suite npm run test:ci
step typecheck npm run typecheck
step lint npm run lint
echo "GATE OK"

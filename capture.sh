#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

CAPTURE_URL="${CAPTURE_URL:?Set CAPTURE_URL.}"
CAPTURE_DIR="${CAPTURE_DIR:?Set CAPTURE_DIR.}"
RUNTIME_DIR="${RUNTIME_DIR:-/home/runner/work/_temp/omgithub-runtime}"
CAPTURE_DIR="$(realpath -m "$CAPTURE_DIR")"

case "$CAPTURE_DIR" in
  "$PROJECT_DIR"|"$PROJECT_DIR"/*)
    echo "CAPTURE_DIR must be outside the project source: $CAPTURE_DIR" >&2
    exit 1
    ;;
esac

/usr/bin/time -p mkdir -p "$CAPTURE_DIR"
/usr/bin/time -p test -f "$PROJECT_DIR/capture.mjs"
export CAPTURE_URL CAPTURE_DIR RUNTIME_DIR
/usr/bin/time -p node "$PROJECT_DIR/capture.mjs"
/usr/bin/time -p test -s "$CAPTURE_DIR/final-desktop.png"
/usr/bin/time -p test -s "$CAPTURE_DIR/final-mobile.png"

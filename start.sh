#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_DIR"

PORT="${PORT:-3000}"
DIST_DIR="$PROJECT_DIR/dist"
WEB_DIR="${OPENCODE_WEB_DIR:-/home/runner/work/_temp/omgithub-web}"

/usr/bin/time -p mkdir -p "$WEB_DIR"
/usr/bin/time -p rm -rf "$DIST_DIR"
/usr/bin/time -p mkdir -p "$DIST_DIR"
/usr/bin/time -p cp "$PROJECT_DIR/index.html" "$DIST_DIR/index.html"
/usr/bin/time -p test -f "$DIST_DIR/index.html"
/usr/bin/time -p node -e 'const fs = require("node:fs"); const [file, project, directory] = process.argv.slice(1); fs.writeFileSync(file, JSON.stringify({ project, directory }) + "\n");' "$WEB_DIR/deployment-output.json" "$PROJECT_DIR" "$DIST_DIR"

echo "Serving $DIST_DIR at http://0.0.0.0:$PORT"
exec /usr/bin/time -p python3 -m http.server "$PORT" --bind 0.0.0.0 --directory "$DIST_DIR"

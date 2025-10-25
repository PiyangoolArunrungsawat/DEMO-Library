#!/usr/bin/env bash
# Launch the manga reader dev server (Linux/macOS shell helper).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

python3 "$SCRIPT_DIR/start_server.py"


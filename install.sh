#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
ACTION="${1:-apply}"
shift || true

if [ ! -f "$ROOT/packages/cli/dist/bin.js" ]; then
  echo "[omx] building workspace"
  npm install
  npm run build
fi

case "$ACTION" in
  apply|repair|uninstall|migrate-v1)
    echo "[omx] setup $ACTION"
    node "$ROOT/packages/cli/dist/bin.js" setup "$ACTION" "$@"
    ;;
  doctor)
    echo "[omx] doctor"
    node "$ROOT/packages/cli/dist/bin.js" doctor "$@"
    ;;
  *)
    cat <<'EOF'
usage: bash install.sh [apply|repair|uninstall|migrate-v1|doctor]

examples:
  bash install.sh apply
  bash install.sh repair
  bash install.sh doctor
EOF
    exit 1
    ;;
esac

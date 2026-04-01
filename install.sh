#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
MODE="bootstrap"
SETUP_ARGS=()
RUN_DOCTOR=1
RUN_LINK=1
SKIP_BUILD=0
DRY_RUN=0

usage() {
  cat <<'EOF'
usage: bash install.sh [bootstrap|repair|uninstall|doctor] [options]

bootstrap is the default and does:
  1. install workspace deps when needed
  2. build OMX
  3. link the omx CLI globally
  4. run omx setup
  5. run omx doctor

options:
  --dry-run            show planned setup work without changing files
  --force              allow setup to overwrite AGENTS.md targets
  --no-plugin          skip first-party plugin install during setup
  --no-hooks           skip repo hook install during setup
  --no-project-agents  skip repo AGENTS.md generation during setup
  --skip-build         skip npm install/build
  --skip-link          skip npm link
  --skip-doctor        skip doctor after bootstrap/repair

examples:
  bash install.sh
  bash install.sh --force
  bash install.sh repair
  bash install.sh doctor
  bash install.sh uninstall
EOF
}

while [ "$#" -gt 0 ]; do
  case "$1" in
    bootstrap|repair|uninstall|doctor)
      MODE="$1"
      ;;
    --dry-run)
      DRY_RUN=1
      SETUP_ARGS+=("--dry-run")
      ;;
    --force|--no-plugin|--no-hooks|--no-project-agents|--no-layout)
      SETUP_ARGS+=("$1")
      ;;
    --presets=*)
      SETUP_ARGS+=("$1")
      ;;
    --skip-build)
      SKIP_BUILD=1
      ;;
    --skip-link)
      RUN_LINK=0
      ;;
    --skip-doctor)
      RUN_DOCTOR=0
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      echo "[omx] unknown option: $1" >&2
      usage
      exit 1
      ;;
  esac
  shift
done

run_cli() {
  node "$ROOT/packages/cli/dist/bin.js" "$@"
}

build_workspace() {
  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[1/5] Would install workspace dependencies if needed."
    echo "[2/5] Would build OMX."
    return
  fi

  if [ "$SKIP_BUILD" -eq 1 ]; then
    echo "[omx] skipping build"
    return
  fi

  if [ ! -d "$ROOT/node_modules" ]; then
    echo "[1/5] Installing workspace dependencies..."
    (cd "$ROOT" && npm install)
  else
    echo "[1/5] Dependencies already present."
  fi

  echo "[2/5] Building OMX..."
  (cd "$ROOT" && npm run build)
}

link_cli() {
  if [ "$RUN_LINK" -eq 0 ]; then
    echo "[3/5] Skipping global link."
    return
  fi

  if [ "$DRY_RUN" -eq 1 ]; then
    echo "[3/5] Would link omx globally with npm link."
    return
  fi

  echo "[3/5] Linking omx globally..."
  (cd "$ROOT/packages/cli" && npm link)
}

case "$MODE" in
  doctor)
    if [ ! -f "$ROOT/packages/cli/dist/bin.js" ] && [ "$DRY_RUN" -eq 0 ]; then
      build_workspace
    fi
    echo "[omx] doctor"
    run_cli doctor
    exit 0
    ;;
  uninstall)
    if [ ! -f "$ROOT/packages/cli/dist/bin.js" ] && [ "$DRY_RUN" -eq 0 ]; then
      build_workspace
    fi
    if [ "$DRY_RUN" -eq 1 ]; then
      echo "[omx] setup uninstall (dry-run)"
    else
      echo "[omx] setup uninstall"
    fi
    run_cli setup uninstall "${SETUP_ARGS[@]}"
    exit 0
    ;;
  bootstrap|repair)
    build_workspace
    link_cli
    echo "[4/5] Running omx setup..."
    if [ "$MODE" = "repair" ]; then
      run_cli setup repair "${SETUP_ARGS[@]}"
    else
      run_cli setup "${SETUP_ARGS[@]}"
    fi
    if [ "$RUN_DOCTOR" -eq 1 ]; then
      echo "[5/5] Running omx doctor..."
      run_cli doctor
    else
      echo "[5/5] Doctor skipped."
    fi
    ;;
esac

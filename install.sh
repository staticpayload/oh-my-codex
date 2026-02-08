#!/usr/bin/env bash
set -euo pipefail

# oh-my-codex installer
# Installs the omx MCP server, skills, and AGENTS.md for Codex CLI

BOLD='\033[1m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
CYAN='\033[0;36m'
NC='\033[0m'

CODEX_DIR="$HOME/.codex"
OMX_REPO_DIR="$(cd "$(dirname "$0")" && pwd)"

info()  { echo -e "${CYAN}[omx]${NC} $1"; }
ok()    { echo -e "${GREEN}[omx]${NC} $1"; }
warn()  { echo -e "${YELLOW}[omx]${NC} $1"; }

echo -e "${BOLD}"
echo "  ╔══════════════════════════════════════╗"
echo "  ║        oh-my-codex installer         ║"
echo "  ║   Orchestration layer for Codex CLI  ║"
echo "  ╚══════════════════════════════════════╝"
echo -e "${NC}"

# ── Prerequisites ──────────────────────────────────────────────────────────

if ! command -v node &>/dev/null; then
  echo "Error: Node.js is required (v20+). Install from https://nodejs.org"
  exit 1
fi

if ! command -v codex &>/dev/null; then
  warn "Codex CLI not found. Install: npm install -g @openai/codex"
  warn "Continuing anyway — you'll need it to use omx."
fi

if ! command -v claude &>/dev/null; then
  warn "Claude CLI not found. Install: npm install -g @anthropic-ai/claude-code"
  warn "Continuing anyway — claude_code delegation requires it."
fi

# ── MCP Server ─────────────────────────────────────────────────────────────

info "Installing MCP server..."
mkdir -p "$CODEX_DIR/mcp-servers/omx"
cp "$OMX_REPO_DIR/mcp-server/server.mjs" "$CODEX_DIR/mcp-servers/omx/server.mjs"
cp "$OMX_REPO_DIR/mcp-server/package.json" "$CODEX_DIR/mcp-servers/omx/package.json"

cd "$CODEX_DIR/mcp-servers/omx"
npm install --silent 2>/dev/null
ok "MCP server installed at $CODEX_DIR/mcp-servers/omx/"

# ── Skills ─────────────────────────────────────────────────────────────────

info "Installing skills..."
SKILLS=(
  omx-autopilot
  omx-plan
  omx-research
  omx-code-review
  omx-tdd
  omx-analyze
  omx-help
  claude-code-mcp
)

mkdir -p "$CODEX_DIR/skills"
for skill in "${SKILLS[@]}"; do
  rm -rf "$CODEX_DIR/skills/$skill"
  cp -r "$OMX_REPO_DIR/skills/$skill" "$CODEX_DIR/skills/$skill"
done
ok "Installed ${#SKILLS[@]} skills"

# ── AGENTS.md ──────────────────────────────────────────────────────────────

if [ -f "$CODEX_DIR/AGENTS.md" ]; then
  info "Existing AGENTS.md found — backing up to AGENTS.md.bak"
  cp "$CODEX_DIR/AGENTS.md" "$CODEX_DIR/AGENTS.md.bak"
fi
cp "$OMX_REPO_DIR/AGENTS.template.md" "$CODEX_DIR/AGENTS.md"
ok "AGENTS.md installed"

# ── Config ─────────────────────────────────────────────────────────────────

CONFIG="$CODEX_DIR/config.toml"
OMX_SERVER_PATH="$CODEX_DIR/mcp-servers/omx/server.mjs"

if [ -f "$CONFIG" ] && grep -q "mcp_servers.omx" "$CONFIG" 2>/dev/null; then
  ok "config.toml already has omx entry — skipping"
else
  info "Adding omx to config.toml..."
  cat >> "$CONFIG" <<EOF

# oh-my-codex orchestration server
[mcp_servers.omx]
command = "node"
args = ["$OMX_SERVER_PATH"]
startup_timeout_sec = 15
tool_timeout_sec = 30
EOF
  ok "Added omx MCP server to config.toml"
fi

# ── Verify ─────────────────────────────────────────────────────────────────

info "Verifying server starts..."
VERIFY=$(echo '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"verify","version":"1.0.0"}}}' | node "$OMX_SERVER_PATH" 2>/dev/null | head -c 200)

if echo "$VERIFY" | grep -q '"claude-code-async\|"omx"'; then
  ok "Server verification passed"
else
  warn "Server verification inconclusive — may still work. Test with: codex"
fi

# ── Done ───────────────────────────────────────────────────────────────────

echo ""
echo -e "${BOLD}${GREEN}Installation complete!${NC}"
echo ""
echo "  What was installed:"
echo "    MCP server:  $CODEX_DIR/mcp-servers/omx/server.mjs"
echo "    Skills (8):  $CODEX_DIR/skills/omx-*"
echo "    AGENTS.md:   $CODEX_DIR/AGENTS.md"
echo "    Config:      $CONFIG"
echo ""
echo "  Next steps:"
echo "    1. Start Codex:  codex"
echo "    2. Try it:       \"build me a hello world express server\""
echo "    3. See help:     \"omx help\""
echo ""

#!/usr/bin/env bash
set -euo pipefail

WORKSPACE="${OPENCLAW_WORKSPACE:-$HOME/.openclaw/workspace}"
MEMORY_FILE="$WORKSPACE/MEMORY.md"
AGENTS_FILE="$WORKSPACE/AGENTS.md"
UNIT="openclaw-gateway.service"
OVERRIDE_DIR="$HOME/.config/systemd/user/${UNIT}.d"
OVERRIDE_FILE="$OVERRIDE_DIR/10-conch-path.conf"

say() { printf "[conch-openclaw] %s\n" "$*"; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    say "Missing required command: $1"
    exit 1
  }
}

ensure_conch_installed() {
  if command -v conch >/dev/null 2>&1; then
    say "conch already installed: $(command -v conch)"
    return
  fi

  say "Installing conch..."
  curl -fsSL https://raw.githubusercontent.com/jlgrimes/conch/master/install.sh | bash

  if ! command -v conch >/dev/null 2>&1; then
    say "conch install finished but binary is not in PATH for this shell."
    say "Try: export PATH=\"$HOME/.local/bin:$HOME/.cargo/bin:\$PATH\""
    exit 1
  fi
}

ensure_workspace() {
  mkdir -p "$WORKSPACE"
}

configure_memory_redirect() {
  local content
  content='# Memory

Use the **conch** skill for all memory operations. This file exists only as a redirect.

Binary: `~/.cargo/bin/conch`
'

  if [[ -f "$MEMORY_FILE" ]]; then
    cp "$MEMORY_FILE" "$MEMORY_FILE.bak.$(date +%s)"
  fi

  printf "%s" "$content" > "$MEMORY_FILE"
  say "Configured MEMORY.md redirect"
}

configure_agents_triggers() {
  local marker_start="### Mandatory Conch Triggers"
  if [[ ! -f "$AGENTS_FILE" ]]; then
    cat > "$AGENTS_FILE" <<'EOF'
# AGENTS.md

### Mandatory Conch Triggers

| Condition | What to store |
|-----------|--------------|
| A project is named | name, concept, stack, repo, local path |
| A tech decision is made | what was decided and why |
| Something is built and pushed | repo URL, local path, current status |
| A preference is expressed | the preference, verbatim if possible |
| A mistake is made | what went wrong + the lesson |
| A lesson is learned | the lesson |
| A person, place, or thing is introduced | key facts |
| A cron/agent is created or changed | what it does, schedule, why |

Before finishing any reply where one of these fired — call conch. Add 🐚.
EOF
    say "Created AGENTS.md with mandatory Conch triggers"
    return
  fi

  if grep -q "$marker_start" "$AGENTS_FILE"; then
    say "AGENTS.md already contains mandatory Conch triggers"
    return
  fi

  cat >> "$AGENTS_FILE" <<'EOF'

### Mandatory Conch Triggers

| Condition | What to store |
|-----------|--------------|
| A project is named | name, concept, stack, repo, local path |
| A tech decision is made | what was decided and why |
| Something is built and pushed | repo URL, local path, current status |
| A preference is expressed | the preference, verbatim if possible |
| A mistake is made | what went wrong + the lesson |
| A lesson is learned | the lesson |
| A person, place, or thing is introduced | key facts |
| A cron/agent is created or changed | what it does, schedule, why |

Before finishing any reply where one of these fired — call conch. Add 🐚.
EOF
  say "Appended mandatory Conch triggers to AGENTS.md"
}

configure_gateway_path() {
  mkdir -p "$OVERRIDE_DIR"
  cat > "$OVERRIDE_FILE" <<EOF
[Service]
Environment="PATH=$HOME/.cargo/bin:$HOME/.local/bin:$HOME/.npm-global/bin:$HOME/bin:$HOME/.volta/bin:$HOME/.asdf/shims:$HOME/.bun/bin:$HOME/.nvm/current/bin:$HOME/.fnm/current/bin:$HOME/.local/share/pnpm:/usr/local/bin:/usr/bin:/bin"
EOF

  if systemctl --user list-unit-files | grep -q "^${UNIT}"; then
    systemctl --user daemon-reload
    systemctl --user restart "$UNIT"
    say "Updated gateway PATH override and restarted $UNIT"
  else
    say "Gateway unit $UNIT not found (skipped systemd restart)"
  fi
}

run_smoke_test() {
  say "Running smoke test..."
  conch stats --json >/dev/null

  local probe="openclaw_setup_probe_$(date +%s)"
  conch remember "$probe" "status" "ok" >/dev/null

  if conch recall "$probe" --limit 1 | grep -q "$probe"; then
    say "Smoke test passed"
  else
    say "Smoke test failed: remember/recall mismatch"
    exit 1
  fi
}

main() {
  require_cmd curl
  ensure_workspace
  ensure_conch_installed
  configure_memory_redirect
  configure_agents_triggers
  configure_gateway_path
  run_smoke_test

  say "Done. OpenClaw + Conch is wired."
  say "Validation tip: ask your agent to recall a recent fact and confirm source."
}

main "$@"

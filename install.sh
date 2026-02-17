#!/bin/bash
set -euo pipefail

REPO="jlgrimes/conch"
BIN="conch"
INSTALL_DIR="${CONCH_INSTALL_DIR:-$HOME/.local/bin}"

# Detect platform
OS="$(uname -s)"
ARCH="$(uname -m)"

case "$OS" in
  Linux)  PLATFORM="linux" ;;
  Darwin) PLATFORM="macos" ;;
  *) echo "Unsupported OS: $OS"; exit 1 ;;
esac

case "$ARCH" in
  x86_64|amd64) ARCH="x86_64" ;;
  aarch64|arm64) ARCH="aarch64" ;;
  *) echo "Unsupported arch: $ARCH"; exit 1 ;;
esac

TARGET="${BIN}-${PLATFORM}-${ARCH}"

# Get latest release
LATEST=$(curl -fsSL "https://api.github.com/repos/$REPO/releases/latest" | grep '"tag_name"' | sed -E 's/.*"([^"]+)".*/\1/')
if [ -z "$LATEST" ]; then
  echo "No releases found. Install from source: cargo install --git https://github.com/$REPO conch"
  exit 1
fi

URL="https://github.com/$REPO/releases/download/$LATEST/$TARGET"
echo "Installing conch $LATEST ($PLATFORM/$ARCH)..."

mkdir -p "$INSTALL_DIR"
curl -fsSL "$URL" -o "$INSTALL_DIR/$BIN"
chmod +x "$INSTALL_DIR/$BIN"

# Check if in PATH
if ! echo "$PATH" | tr ':' '\n' | grep -qx "$INSTALL_DIR"; then
  echo ""
  echo "Add to your PATH:"
  echo "  export PATH=\"$INSTALL_DIR:\$PATH\""
  echo ""
fi

echo "✅ conch installed to $INSTALL_DIR/$BIN"
"$INSTALL_DIR/$BIN" --help

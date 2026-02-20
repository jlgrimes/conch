# Installing Conch

Conch is a CLI tool that stores and recalls memories for AI agents. Here's how to install it on any platform.

---

## Option 1: Cargo (Rust users)

If you have Rust installed, this is the easiest option:

```bash
cargo install conch
```

Requires Rust 1.70+. Install Rust via [rustup.rs](https://rustup.rs) if you don't have it.

After install, verify it works:

```bash
conch --version
conch stats
```

---

## Option 2: Prebuilt Binary

> **Note:** Prebuilt binaries are coming soon. Watch [GitHub Releases](https://github.com/jlgrimes/conch/releases) for the first release.

Once available, download the binary for your platform and make it executable:

### Linux (x86_64)

```bash
curl -Lo conch https://github.com/jlgrimes/conch/releases/latest/download/conch-linux-x86_64
chmod +x conch
sudo mv conch /usr/local/bin/
conch --version
```

### macOS (Apple Silicon / ARM)

```bash
curl -Lo conch https://github.com/jlgrimes/conch/releases/latest/download/conch-macos-aarch64
chmod +x conch
sudo mv conch /usr/local/bin/
conch --version
```

### macOS (Intel / x86_64)

```bash
curl -Lo conch https://github.com/jlgrimes/conch/releases/latest/download/conch-macos-x86_64
chmod +x conch
sudo mv conch /usr/local/bin/
conch --version
```

### Windows

Download `conch-windows-x86_64.exe` from the [Releases page](https://github.com/jlgrimes/conch/releases), rename to `conch.exe`, and add to your `PATH`.

---

## Option 3: Build from Source

Use this if prebuilt binaries aren't available for your platform, or you want the latest unreleased code.

### Prerequisites

- Rust 1.70+ — install via [rustup.rs](https://rustup.rs)
- Git
- A C compiler (for SQLite; usually already present on Linux/macOS)

### Steps

```bash
# Clone the repository
git clone https://github.com/jlgrimes/conch.git
cd conch

# Build and install the CLI binary
cargo install --path crates/conch-cli

# Verify
conch --version
conch stats
```

To also install the MCP server:

```bash
cargo install --path crates/conch-mcp
conch-mcp --version
```

### Build without installing

```bash
cargo build --release
./target/release/conch --version
```

---

## Verify Your Install

```bash
# Should print version
conch --version

# Should show empty DB stats
conch stats

# Quick smoke test
conch remember "install" "status" "working"
conch recall "install"
# → [fact] install status working
```

---

## Uninstall

If installed via cargo:

```bash
cargo uninstall conch
```

If installed as a binary, just remove the file:

```bash
sudo rm /usr/local/bin/conch
```

The memory database lives at `~/.conch/default.db` — remove it too if you want a clean slate:

```bash
rm -rf ~/.conch
```

---

## Troubleshooting

**`conch: command not found`**
Make sure `~/.cargo/bin` is in your `PATH`. Add this to your shell profile:
```bash
export PATH="$HOME/.cargo/bin:$PATH"
```

**Slow first run**
The first `recall` or `remember` downloads embedding model weights (~20MB). This is a one-time download cached at `~/.fastembed_cache/`.

**SQLite errors**
Conch creates `~/.conch/default.db` automatically. If you see permission errors, check that `~/.conch/` is writable.

---

Back to [README](../README.md)

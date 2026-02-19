# Testing

Conch has two primary layers of test coverage:

- **Core/unit tests (`conch-core`)**
  - Storage and migration behavior (including legacy DB schema upgrade paths)
  - Namespace isolation and import/export behavior
  - Recall ranking and decay behavior with deterministic mock embeddings
- **CLI-level command handling tests (`conch`)**
  - High-level command behavior around namespace-aware `remember`/`recall --kind`
  - Namespace-scoped export/import flows via command-level helpers

## Run all tests

```bash
cargo test --workspace
```

## Run specific suites

```bash
# Core/unit tests
cargo test -p conch-core

# CLI command-level tests
cargo test -p conch
```

## Lint/format checks used in CI

```bash
cargo fmt --all --check
cargo clippy --workspace -- -D warnings
```

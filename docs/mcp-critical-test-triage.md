# MCP Critical Test Failure Triage

This document provides triage guidance for failures in the MCP critical reliability test suite.

## Critical Tests Overview

The MCP critical reliability tests are designed to catch the highest-impact failure modes:

1. **`concurrent_mixed_remember_and_recall_regression`** - Concurrency safety
2. **`lock_conch_returns_error_when_poisoned`** - Lock poisoning recovery  
3. **`forget_rejects_negative_older_than_secs_and_does_not_delete`** - Input validation
4. **`namespace_falls_back_to_server_default`** - Namespace isolation

These tests run in a dedicated CI job (`mcp-critical`) and must pass for all builds.

## Failure Classification & Response

### 🔴 P0 - Immediate Block (Block all releases)
- **Concurrency test failure**: Data races, deadlocks, or inconsistent state
- **Lock poisoning test failure**: Cascading lock failures or hangs
- **Mass deletion test failure**: Input validation bypassed, potential data loss

**Response**: 
1. Immediately halt releases
2. Assign senior engineer for root cause analysis  
3. Create incident issue with P0 label
4. Fix within 4 hours or rollback

### 🟡 P1 - High Priority (Fix in current sprint)
- **Namespace isolation failure**: Cross-namespace data leaks
- **Intermittent failures**: Flaky behavior in any critical test

**Response**:
1. Create P1 bug issue
2. Investigate within 24 hours
3. Fix within current sprint

### 🔵 P2 - Standard Priority (Fix in next sprint)
- **Test infrastructure issues**: CI environment problems not related to code
- **Documentation gaps**: Missing or unclear test failure messages

## Triage Workflow

### Step 1: Reproduce Locally
```bash
# Run the specific failing test
cargo test -p conch-mcp <test_name>

# Run with detailed output
RUST_LOG=debug cargo test -p conch-mcp <test_name> -- --nocapture

# Run multiple times to check for flakiness  
for i in {1..10}; do cargo test -p conch-mcp <test_name> || echo "Failed run $i"; done
```

### Step 2: Analyze Failure Mode

#### Concurrency Test Failures
- **Deadlock**: Look for hanging processes or timeout errors
- **Data race**: Check for inconsistent memory state or access violations
- **Performance regression**: Compare timing with baseline benchmarks

#### Lock Poisoning Test Failures
- **Not recovering from poison**: Verify poison detection and clearing logic
- **Cascading failures**: Check if poison spreads to other operations
- **Error propagation**: Ensure clean MCP error responses

#### Input Validation Test Failures
- **Validation bypass**: Check if negative values reach delete operations
- **Incorrect error messages**: Verify user-facing error clarity
- **Edge cases**: Test boundary values (0, -1, very large numbers)

#### Namespace Test Failures
- **Default namespace not applied**: Check empty/whitespace handling
- **Cross-namespace contamination**: Verify isolation between namespaces
- **Configuration drift**: Ensure server default is correctly applied

### Step 3: Create Incident Issue

Use this template for P0/P1 incidents:

```markdown
## MCP Critical Test Failure: [test_name]

**Priority**: P0/P1
**Test**: `<failing_test_name>`
**First Failed**: [timestamp]
**Frequency**: [always|intermittent|once]

### Failure Details
- **Error message**: [exact error from CI]
- **Local reproduction**: [yes/no + steps]
- **Affected branches**: [list branches]

### Impact Assessment
- **Data safety**: [risk level + justification]
- **User experience**: [impact description]
- **System reliability**: [degradation description]

### Investigation Plan
- [ ] Root cause analysis
- [ ] Fix implementation
- [ ] Regression prevention
- [ ] Additional test coverage (if needed)

### Timeline
- **Discovery**: [timestamp]
- **Assignment**: [timestamp]  
- **Target fix**: [timestamp]
- **Verification**: [timestamp]
```

## Prevention & Monitoring

### Code Review Checklist
When reviewing changes to MCP code, ensure:
- [ ] Concurrency patterns follow established safety guidelines
- [ ] Lock usage is minimal and well-scoped  
- [ ] Input validation covers all edge cases
- [ ] Namespace handling is explicit and tested

### Monitoring Alerts
Set up alerts for:
- MCP critical test failures in CI
- Performance regression in concurrency tests (>20% slower)
- Flaky test detection (>5% failure rate over 7 days)

### Regular Maintenance  
- **Weekly**: Review test timing trends for performance regressions
- **Monthly**: Update test fixtures to cover new edge cases
- **Quarterly**: Stress test with higher concurrency loads

## Emergency Contacts

For P0 incidents requiring immediate attention:
- **MCP maintainer**: Check CODEOWNERS file
- **Conch team lead**: Check Linear team assignments
- **Platform engineering**: For CI infrastructure issues

## References
- [MCP API Documentation](../README.md#mcp-api)
- [Conch Architecture](../docs/architecture.md) 
- [Incident Response Playbook](../docs/incident-response.md)
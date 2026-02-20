# PharmaChain Smart Contract Security Audit Report

| Field            | Value                                                         |
|------------------|---------------------------------------------------------------|
| **Contract**     | PharmaChain.sol                                               |
| **Version**      | Solidity 0.8.24                                               |
| **Framework**    | Hardhat 2.22.x, OpenZeppelin Contracts 5.4.x                 |
| **Auditor**      | Stefan James                                                  |
| **Date**         | 2026-02-20                                                    |
| **Methodology**  | Manual line-by-line review, SWC Registry mapping, automated test suite analysis |
| **Commit**       | `main` branch — initial release                               |

---

## Executive Summary

PharmaChain is a pharmaceutical supply-chain tracking smart contract implementing role-based access control (RBAC) via OpenZeppelin's `AccessControl` and a strict state machine for batch lifecycle management. The contract is well-architected with strong security fundamentals: locked pragma, comprehensive reentrancy protection, custom errors for gas efficiency, explicit visibility on all functions and state variables, and no ETH handling surface.

The audit identified **0 Critical**, **0 High**, **2 Medium**, **2 Low**, and **1 Gas/Informational** findings. No funds are at risk. The issues found relate to input validation gaps and a gas scalability concern on view functions.

### Severity Summary

| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 0 | Exploitable vulnerabilities leading to fund loss or contract takeover |
| High     | 0 | Serious vulnerabilities affecting core functionality or access control |
| Medium   | 2 | Issues that could lead to unexpected behavior under edge conditions |
| Low      | 2 | Minor issues with limited impact; best-practice improvements |
| Gas/Info | 1 | Gas optimizations and informational observations |
| **Total** | **5** | |

---

## Scope

### Files Reviewed

| File | Lines | Description |
|------|-------|-------------|
| `contracts/contracts/PharmaChain.sol` | 319 | Core smart contract |
| `test/PharmaChain.test.ts` | 1,470 | Hardhat test suite |
| `scripts/deploy-local.ts` | 95 | Local deployment script |
| `scripts/deploy-sepolia.ts` | 108 | Sepolia deployment script |
| `scripts/grant-roles.ts` | 126 | Role assignment script |
| `scripts/generate-frontend-config.ts` | 64 | ABI/config generator |
| `contracts/hardhat.config.ts` | 41 | Compiler configuration |
| `frontend/src/lib/contract.ts` | 184 | Frontend ABI & types |
| `frontend/src/hooks/usePharmaChain.ts` | 257 | Frontend contract hook |

**Total lines reviewed: 2,664**

### Out of Scope

- OpenZeppelin library internals (`AccessControl.sol`, `ReentrancyGuard.sol`)
- Hardhat framework and toolchain
- Frontend UI components (not security-critical)
- Network infrastructure (RPC nodes, MetaMask)

---

## Findings

### F-01: `deliverBatch` Allows Delivery to `address(0)` (Medium)

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **SWC ID** | SWC-135 (Code With No Effects) |
| **Location** | `contracts/contracts/PharmaChain.sol:181-189` |
| **Function** | `deliverBatch(uint256 batchId, address destination)` |

**Description**

The `deliverBatch` function accepts any `destination` address without validation. Unlike `shipBatch` (which verifies the recipient holds `LOGISTICS_ROLE`), `deliverBatch` performs no check on the `destination` parameter. This allows delivery to `address(0)`, effectively burning the batch's custody chain.

**Vulnerable Code**

```solidity
// PharmaChain.sol:181-189
function deliverBatch(uint256 batchId, address destination)
    external
    onlyRole(LOGISTICS_ROLE)
    batchExists(batchId)
    onlyHolder(batchId)
    nonReentrant
{
    _requireStatus(batchId, Status.InTransit, Status.Delivered);
    _transition(batchId, Status.Delivered, destination);  // no validation on destination
}
```

**Impact**

If a logistics provider accidentally passes `address(0)` as the destination, the batch becomes orphaned — no account can become the `currentHolder`, and the `onlyHolder` modifier will block all subsequent operations that require it (`shipBatch`, `approveBatch`, `rejectBatch`). The batch could still be recalled by a regulator (since `recallBatch` does not use `onlyHolder`), but the intended workflow is disrupted.

**Remediation**

```solidity
function deliverBatch(uint256 batchId, address destination)
    external
    onlyRole(LOGISTICS_ROLE)
    batchExists(batchId)
    onlyHolder(batchId)
    nonReentrant
{
    if (destination == address(0)) revert InvalidDestination();
    _requireStatus(batchId, Status.InTransit, Status.Delivered);
    _transition(batchId, Status.Delivered, destination);
}
```

Add `error InvalidDestination();` to the custom errors block (line 61).

---

### F-02: `recordTemperature` Has No Status Guard (Medium)

| Field | Value |
|-------|-------|
| **Severity** | Medium |
| **SWC ID** | — |
| **Location** | `contracts/contracts/PharmaChain.sol:248-266` |
| **Function** | `recordTemperature(uint256 batchId, int16 temperatureCelsius)` |

**Description**

The `recordTemperature` function can be called on batches in any status, including terminal states (`Approved`, `Rejected`, `Recalled`). While temperature logging doesn't alter the batch lifecycle, allowing temperature records on terminal batches creates misleading audit trail data. A temperature reading on an already-approved batch could be used to falsely suggest the batch was monitored post-approval.

**Vulnerable Code**

```solidity
// PharmaChain.sol:248-266
function recordTemperature(uint256 batchId, int16 temperatureCelsius)
    external
    batchExists(batchId)        // no status check
    nonReentrant
{
    bool isLogistics = hasRole(LOGISTICS_ROLE, msg.sender);
    bool isTester    = hasRole(TESTER_ROLE, msg.sender);

    if (!isLogistics && !isTester)
        revert RecipientMissingRole(msg.sender, LOGISTICS_ROLE);
    // ...
}
```

**Impact**

Low operational impact; no funds at risk. However, in a regulated pharmaceutical environment, phantom temperature logs on terminal batches could create compliance confusion.

**Remediation**

```solidity
function recordTemperature(uint256 batchId, int16 temperatureCelsius)
    external
    batchExists(batchId)
    notTerminal(batchId)        // add status guard
    nonReentrant
{
    // ...
}
```

---

### F-03: `deliverBatch` Does Not Validate Destination Role (Low)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **SWC ID** | — |
| **Location** | `contracts/contracts/PharmaChain.sol:181-189` |
| **Function** | `deliverBatch(uint256 batchId, address destination)` |

**Description**

While `shipBatch` validates that the recipient holds `LOGISTICS_ROLE` (line 172), `deliverBatch` does not verify that the `destination` address holds any role in the system. This is by design (a pharmacy/warehouse may not have a contract role), but it means batches can be delivered to completely unknown addresses with no on-chain identity.

**Impact**

In the current design, `beginQATesting` does not require `onlyHolder` — any tester can pick up a delivered batch. This partially mitigates the risk. However, if the destination address is incorrect, the `currentHolder` record becomes inaccurate for off-chain audit purposes.

**Remediation (Optional)**

This is an architectural choice. If stricter custody is desired:

```solidity
// Option A: Require destination to have at least one role
// Option B: Accept as-is (current design) — pharmacies don't need on-chain roles
// Recommendation: Document the design decision in NatSpec
```

---

### F-04: No Upper Bound on `drugName` Length (Low)

| Field | Value |
|-------|-------|
| **Severity** | Low |
| **SWC ID** | SWC-128 (DoS With Block Gas Limit) |
| **Location** | `contracts/contracts/PharmaChain.sol:133-157` |
| **Function** | `createBatch(string calldata drugName)` |

**Description**

The `createBatch` function validates that `drugName` is non-empty (line 141) but does not enforce a maximum length. A manufacturer could submit an extremely long drug name (e.g., 100KB), which would increase gas costs for storage and for any subsequent `getBatch` call that returns the string.

**Vulnerable Code**

```solidity
// PharmaChain.sol:141
if (bytes(drugName).length == 0) revert EmptyDrugName();
// no upper bound check
```

**Impact**

Minimal in practice — the caller pays the gas cost. However, it could make `getBatch` more expensive for other callers reading the data and could be used to grief the event indexing layer.

**Remediation**

```solidity
uint256 constant MAX_DRUG_NAME_LENGTH = 256;

function createBatch(string calldata drugName) external ... {
    if (bytes(drugName).length == 0) revert EmptyDrugName();
    if (bytes(drugName).length > MAX_DRUG_NAME_LENGTH) revert DrugNameTooLong();
    // ...
}
```

---

### F-05: `getTemperatureLogs` Returns Unbounded Array (Gas/Informational)

| Field | Value |
|-------|-------|
| **Severity** | Gas/Informational |
| **SWC ID** | SWC-128 (DoS With Block Gas Limit) |
| **Location** | `contracts/contracts/PharmaChain.sol:285-292` |
| **Function** | `getTemperatureLogs(uint256 batchId)` |

**Description**

The `getTemperatureLogs` function returns the entire `_temperatureLogs[batchId]` array. As a `view` function, this is free when called off-chain (e.g., from the frontend via `eth_call`). However, if another on-chain contract calls this function, the gas cost scales linearly with the number of logs and could exceed the block gas limit for batches with extensive monitoring history.

**Vulnerable Code**

```solidity
// PharmaChain.sol:285-292
function getTemperatureLogs(uint256 batchId)
    external
    view
    batchExists(batchId)
    returns (TemperatureLog[] memory logs)
{
    logs = _temperatureLogs[batchId];
}
```

**Impact**

No impact for the current frontend-only architecture. Would become an issue if PharmaChain is composed with other on-chain contracts.

**Remediation**

Add a paginated variant:

```solidity
function getTemperatureLogsPaginated(
    uint256 batchId,
    uint256 offset,
    uint256 limit
) external view batchExists(batchId) returns (TemperatureLog[] memory logs) {
    TemperatureLog[] storage all = _temperatureLogs[batchId];
    if (offset >= all.length) return new TemperatureLog[](0);
    uint256 end = offset + limit;
    if (end > all.length) end = all.length;
    logs = new TemperatureLog[](end - offset);
    for (uint256 i = offset; i < end; i++) {
        logs[i - offset] = all[i];
    }
}
```

---

## Positive Findings

The following security properties deserve recognition:

### P-01: OpenZeppelin AccessControl Usage
The contract correctly delegates RBAC to OpenZeppelin's battle-tested `AccessControl` library rather than implementing custom authorization. Role constants are defined as `public constant bytes32` values using `keccak256`, following the standard pattern. The deployer receives `DEFAULT_ADMIN_ROLE` via `_grantRole` (not the deprecated `_setupRole`).

### P-02: Comprehensive ReentrancyGuard Coverage
All 8 state-changing functions include the `nonReentrant` modifier. While the contract makes no external calls (so reentrancy is not currently exploitable), this is excellent defense-in-depth against future modifications.

### P-03: No ETH Handling Surface
The contract has no `receive()`, `fallback()`, or `payable` functions. It cannot receive or hold ETH, eliminating an entire class of vulnerabilities (fund extraction, selfdestruct deposits, stuck ETH).

### P-04: Custom Errors for Gas Efficiency
All 8 error conditions use Solidity custom errors instead of `require` strings, saving approximately 200-500 gas per revert and reducing deployment bytecode size.

### P-05: Locked Pragma with Recent Compiler
`pragma solidity 0.8.24` is locked (not floating), ensuring deterministic compilation. Version 0.8.24 includes native overflow/underflow protection, eliminating SWC-101 concerns.

### P-06: Strict State Machine with Single Transition Path
Each batch follows a deterministic path through the state machine. The `_requireStatus` helper enforces exact source-state matching, and the centralized `_transition` function ensures every state change emits an event and updates timestamps. There are no ambiguous or bypassed transitions.

### P-07: Comprehensive Event Emission
Every state change emits an indexed event with actor address and timestamp. This provides a complete on-chain audit trail suitable for regulatory compliance (FDA 21 CFR Part 11, DSCSA).

### P-08: Excellent Test Coverage
The test suite contains 85+ test cases covering happy paths, invalid transitions, role denials, edge cases (batchId 0, zero address, unicode strings, int16 boundaries), modifier ordering, and reentrancy guard verification. The storage manipulation technique for testing `nonReentrant` is particularly thorough.

### P-09: Private State Variables with Getter Functions
All storage mappings (`_batches`, `_temperatureLogs`, `_batchCount`) are `private`, with controlled access through explicit `external view` getter functions. This prevents subclasses or external contracts from directly reading/writing state.

### P-10: No `tx.origin` Usage
The contract exclusively uses `msg.sender` for authorization. `tx.origin` does not appear anywhere in the codebase, fully mitigating SWC-115 phishing attacks.

---

## Remediation Priority Matrix

| ID | Severity | Finding | Effort | Priority |
|----|----------|---------|--------|----------|
| F-01 | Medium | `deliverBatch` allows `address(0)` | Low (1 line + 1 error) | **1 — Fix first** |
| F-02 | Medium | `recordTemperature` has no status guard | Low (add 1 modifier) | **2** |
| F-04 | Low | No upper bound on `drugName` length | Low (2 lines + 1 error) | **3** |
| F-03 | Low | `deliverBatch` no role check on destination | Medium (design decision) | **4 — Evaluate** |
| F-05 | Gas | Unbounded array return in `getTemperatureLogs` | Medium (new function) | **5 — Future** |

---

## Conclusion

PharmaChain demonstrates strong security engineering fundamentals. The contract makes excellent use of established OpenZeppelin libraries, maintains a clean state machine with no ambiguous transitions, provides comprehensive event emission for regulatory audit trails, and includes defense-in-depth reentrancy protection despite having no external call surface.

The five findings identified are all **non-critical** and represent improvements to input validation and gas scalability rather than exploitable vulnerabilities. No funds are at risk, and no access control bypasses were discovered. The two medium-severity items (F-01 and F-02) are straightforward to remediate and should be addressed before mainnet deployment.

**Overall Assessment: PASS with minor recommendations**

The contract is suitable for testnet deployment and controlled production use. The recommended remediations (F-01 through F-04) should be applied before mainnet deployment in a regulated pharmaceutical environment.

---

## Disclaimer

This audit report represents a point-in-time review of the PharmaChain smart contract as committed to the `main` branch. The audit was conducted through manual code review and automated test analysis. It does not constitute a formal guarantee of security. Smart contract security is a continuous process — changes to the codebase after this audit may introduce new vulnerabilities. The auditor recommends ongoing monitoring, additional third-party review for mainnet deployment, and a bug bounty program.

This report does not cover economic attack vectors, oracle manipulation, MEV/front-running analysis, or infrastructure security (RPC nodes, key management, deployment pipelines).

---

## References

- [SWC Registry](https://swcregistry.io/)
- [OpenZeppelin AccessControl](https://docs.openzeppelin.com/contracts/5.x/access-control)
- [OpenZeppelin ReentrancyGuard](https://docs.openzeppelin.com/contracts/5.x/api/utils#ReentrancyGuard)
- [Solidity 0.8.24 Release Notes](https://soliditylang.org/)
- [FDA 21 CFR Part 11](https://www.ecfr.gov/current/title-21/chapter-I/subchapter-A/part-11)
- [Drug Supply Chain Security Act (DSCSA)](https://www.fda.gov/drugs/drug-supply-chain-integrity/drug-supply-chain-security-act-dscsa)

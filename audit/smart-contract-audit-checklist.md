# PharmaChain Smart Contract Security Audit Checklist

| Field            | Value                                                         |
|------------------|---------------------------------------------------------------|
| **Contract**     | `PharmaChain.sol` (319 lines)                                 |
| **Solidity**     | 0.8.24                                                        |
| **Framework**    | Hardhat 2.22.x + OpenZeppelin Contracts 5.4.x                |
| **Auditor**      | Stefan James                                                  |
| **Date**         | 2026-02-20                                                    |
| **Methodology**  | Manual line-by-line review against SWC Registry + automated Hardhat test suite (100% coverage) |

---

## Scoring

- **PASS** = requirement fully satisfied in the current codebase
- **FAIL** = issue found that should be addressed (see audit report for details)

---

## 1. Compiler & Pragma Configuration (6 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 1.1 | Pragma is locked to an exact version | SWC-103 | :white_check_mark: PASS | `pragma solidity 0.8.24;` (line 2) |
| 1.2 | Compiler version is recent and maintained | — | :white_check_mark: PASS | 0.8.24 is current stable; native overflow protection active |
| 1.3 | Optimizer is enabled with reasonable runs | — | :white_check_mark: PASS | `optimizer: { enabled: true, runs: 200 }` in hardhat.config.ts:14-17 |
| 1.4 | No floating pragma (`^`, `>=`, `>`) | SWC-103 | :white_check_mark: PASS | Exact `0.8.24` used |
| 1.5 | No deprecated Solidity features used | — | :white_check_mark: PASS | Custom errors, `calldata` keyword, no `throw`/`suicide` |
| 1.6 | SPDX license identifier present | — | :white_check_mark: PASS | `// SPDX-License-Identifier: MIT` (line 1) |

**Category score: 6/6**

---

## 2. Access Control (9 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 2.1 | Admin role assigned in constructor | — | :white_check_mark: PASS | `_grantRole(DEFAULT_ADMIN_ROLE, msg.sender)` (line 103) |
| 2.2 | Role constants use `keccak256` hashing | — | :white_check_mark: PASS | Lines 26-29: all four roles defined via `keccak256("..._ROLE")` |
| 2.3 | All state-changing functions have role guards | SWC-105 | :white_check_mark: PASS | `onlyRole()` modifier on `createBatch` (137), `shipBatch` (166), `deliverBatch` (183), `beginQATesting` (196), `approveBatch` (208), `rejectBatch` (221), `recallBatch` (234) |
| 2.4 | `tx.origin` is never used for authorization | SWC-115 | :white_check_mark: PASS | Only `msg.sender` used throughout |
| 2.5 | Role admin configuration is correct | — | :white_check_mark: PASS | All custom roles default to `DEFAULT_ADMIN_ROLE` as admin (OpenZeppelin default) |
| 2.6 | `recordTemperature` enforces caller roles | — | :white_check_mark: PASS | Checks `LOGISTICS_ROLE` or `TESTER_ROLE` (lines 253-256) |
| 2.7 | `onlyHolder` modifier enforces custody chain | — | :white_check_mark: PASS | Applied to `shipBatch` (168), `deliverBatch` (185), `approveBatch` (210), `rejectBatch` (223) |
| 2.8 | Recipient role validated on `shipBatch` | — | :white_check_mark: PASS | Checks `hasRole(LOGISTICS_ROLE, logistics)` (line 172) |
| 2.9 | No role check on `deliverBatch` destination | — | :x: FAIL | `deliverBatch` does not validate that `destination` holds any role. Batch can be delivered to an arbitrary address including `address(0)`. See Finding F-03 in audit report. |

**Category score: 8/9**

---

## 3. State Machine Integrity (8 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 3.1 | All valid transitions enforced via `_requireStatus` | — | :white_check_mark: PASS | Created->InTransit (171), InTransit->Delivered (188), Delivered->QATesting (200), QATesting->Approved (213), QATesting->Rejected (226) |
| 3.2 | Terminal states (Approved/Rejected/Recalled) block further transitions | — | :white_check_mark: PASS | `notTerminal` modifier (lines 121-126) on `recallBatch`; `_requireStatus` blocks other transitions |
| 3.3 | Recall is available from all non-terminal states | — | :white_check_mark: PASS | `recallBatch` uses `notTerminal` without `_requireStatus` (line 238-239) |
| 3.4 | Cannot approve and reject the same batch | — | :white_check_mark: PASS | Both require `QATesting` source status; once one is applied, the other is unreachable |
| 3.5 | Status enum covers all lifecycle states | — | :white_check_mark: PASS | 7 states: Created(0) through Recalled(6) (lines 33-41) |
| 3.6 | `updatedAt` timestamp refreshed on every transition | — | :white_check_mark: PASS | `_transition()` sets `updatedAt = block.timestamp` (line 315) |
| 3.7 | `currentHolder` updated on every transition | — | :white_check_mark: PASS | `_transition()` sets `currentHolder = newHolder` (line 314) |
| 3.8 | No back-transitions (e.g. Delivered -> Created) possible | — | :white_check_mark: PASS | `_requireStatus` enforces exact source status for each transition |

**Category score: 8/8**

---

## 4. Data Validation (7 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 4.1 | Empty drug name rejected | — | :white_check_mark: PASS | `if (bytes(drugName).length == 0) revert EmptyDrugName()` (line 141) |
| 4.2 | Batch ID 0 rejected | — | :white_check_mark: PASS | `batchExists` modifier: `if (batchId == 0 || batchId > _batchCount)` (line 109) |
| 4.3 | Batch ID beyond count rejected | — | :white_check_mark: PASS | Same modifier (line 109) |
| 4.4 | Drug name length is unbounded | — | :x: FAIL | No upper bound on `drugName` length. A caller could pass an extremely long string, increasing gas costs and storage. See Finding F-04 in audit report. |
| 4.5 | Temperature uses `int16` for bounded range | — | :white_check_mark: PASS | `int16 temperatureCelsius` (line 248) — range -32768 to 32767 |
| 4.6 | No integer overflow on `_batchCount` | SWC-101 | :white_check_mark: PASS | Uses `unchecked { _batchCount++; }` (line 143). Overflow to 0 at `type(uint256).max` is practically unreachable (>10^77 batches). |
| 4.7 | `string calldata` used for gas efficiency | — | :white_check_mark: PASS | `createBatch(string calldata drugName)` (line 134) |

**Category score: 6/7**

---

## 5. Event Emission (6 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 5.1 | `BatchCreated` emitted on batch creation | — | :white_check_mark: PASS | Line 156: `emit BatchCreated(batchId, drugName, msg.sender, block.timestamp)` |
| 5.2 | `BatchTransitioned` emitted on every state change | — | :white_check_mark: PASS | Emitted in `_transition()` (line 317) — all 6 transitions route through this |
| 5.3 | `TemperatureRecorded` emitted on temp logs | — | :white_check_mark: PASS | Line 265 |
| 5.4 | Events include `indexed` parameters for efficient filtering | — | :white_check_mark: PASS | `batchId indexed` on all events; `manufacturer indexed`, `fromStatus indexed`, `toStatus indexed`, `recorder indexed` |
| 5.5 | Events emit `block.timestamp` for off-chain time reference | — | :white_check_mark: PASS | All three events include `uint256 timestamp` |
| 5.6 | Events emit actor address for audit trail | — | :white_check_mark: PASS | `manufacturer` in BatchCreated, `actor` in BatchTransitioned, `recorder` in TemperatureRecorded |

**Category score: 6/6**

---

## 6. Reentrancy Protection (6 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 6.1 | Contract inherits `ReentrancyGuard` | SWC-107 | :white_check_mark: PASS | `contract PharmaChain is AccessControl, ReentrancyGuard` (line 23) |
| 6.2 | `createBatch` uses `nonReentrant` | SWC-107 | :white_check_mark: PASS | Line 138 |
| 6.3 | `shipBatch` uses `nonReentrant` | SWC-107 | :white_check_mark: PASS | Line 169 |
| 6.4 | `deliverBatch` uses `nonReentrant` | SWC-107 | :white_check_mark: PASS | Line 186 |
| 6.5 | `beginQATesting` / `approveBatch` / `rejectBatch` use `nonReentrant` | SWC-107 | :white_check_mark: PASS | Lines 198, 211, 224 |
| 6.6 | `recallBatch` / `recordTemperature` use `nonReentrant` | SWC-107 | :white_check_mark: PASS | Lines 237, 251 |

**Category score: 6/6**

---

## 7. Gas & DoS Prevention (7 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 7.1 | No unbounded loops in state-changing functions | SWC-128 | :white_check_mark: PASS | All functions are O(1) |
| 7.2 | `getTemperatureLogs` returns full array (view function) | SWC-128 | :x: FAIL | Returns entire `_temperatureLogs[batchId]` array. If a batch accumulates thousands of logs, this call could exceed block gas limit when called by another contract. See Finding F-05 in audit report. |
| 7.3 | Custom errors used instead of `require` strings | — | :white_check_mark: PASS | 8 custom errors defined (lines 61-68); no `require` statements |
| 7.4 | `calldata` used for string parameters | — | :white_check_mark: PASS | `string calldata drugName` (line 134) |
| 7.5 | No ETH handling (no `receive`/`fallback`/`payable`) | — | :white_check_mark: PASS | Contract cannot receive ETH; no value transfer attack surface |
| 7.6 | `unchecked` math used only where safe | — | :white_check_mark: PASS | Only on `_batchCount++` (line 143) which cannot realistically overflow uint256 |
| 7.7 | No external calls to untrusted contracts | SWC-107 | :white_check_mark: PASS | No `.call()`, `.delegatecall()`, or external contract calls |

**Category score: 6/7**

---

## 8. Visibility & Encapsulation (6 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 8.1 | All functions have explicit visibility | SWC-100 | :white_check_mark: PASS | `external` on public functions; `private` on internal helpers |
| 8.2 | State variables have explicit visibility | SWC-108 | :white_check_mark: PASS | `_batchCount` (96), `_batches` (97), `_temperatureLogs` (98) all `private` |
| 8.3 | Internal helpers use `private` visibility | — | :white_check_mark: PASS | `_requireStatus` (303) and `_transition` (310) are `private` |
| 8.4 | View functions are marked `view` | — | :white_check_mark: PASS | `getBatch` (275), `getTemperatureLogs` (287), `batchCount` (296) |
| 8.5 | No public/external state variables bypass encapsulation | — | :white_check_mark: PASS | Role constants are `public constant` (read-only); mappings are `private` |
| 8.6 | Modifiers do not have side effects | — | :white_check_mark: PASS | `batchExists`, `onlyHolder`, `notTerminal` are all read-only checks |

**Category score: 6/6**

---

## 9. Documentation (5 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 9.1 | Contract-level NatSpec `@title`, `@author`, `@notice`, `@dev` | — | :white_check_mark: PASS | Lines 7-22 |
| 9.2 | All `external` functions have NatSpec `@notice` + `@param` | — | :white_check_mark: PASS | All 10 external functions documented |
| 9.3 | SWC compliance documented in header | — | :white_check_mark: PASS | Header references SWC-103, SWC-100, SWC-108, SWC-115 (lines 17-22) |
| 9.4 | State machine lifecycle documented | — | :white_check_mark: PASS | Lines 14-15 |
| 9.5 | Custom errors are self-documenting with descriptive names | — | :white_check_mark: PASS | `EmptyDrugName`, `BatchDoesNotExist`, `InvalidStateTransition`, `NotCurrentHolder`, `TerminalState`, `RecipientMissingRole` |

**Category score: 5/5**

---

## 10. Testing Coverage (7 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 10.1 | All happy-path transitions tested | — | :white_check_mark: PASS | Full lifecycle walk-through tests (lines 697-734) |
| 10.2 | All invalid transitions tested | — | :white_check_mark: PASS | Each transition tested from wrong source status (lines 741-925) |
| 10.3 | All role-based access denials tested | — | :white_check_mark: PASS | 7 unauthorized access tests (lines 210-291) |
| 10.4 | Terminal state enforcement tested | — | :white_check_mark: PASS | Recall from Approved/Rejected/Recalled tested (lines 869-890) |
| 10.5 | Edge cases (batchId 0, zero address, empty strings) | — | :white_check_mark: PASS | Lines 1133-1212 |
| 10.6 | Reentrancy guard tested | — | :white_check_mark: PASS | All 8 `nonReentrant` functions tested via `hardhat_setStorageAt` (lines 1354-1468) |
| 10.7 | Event emission verified | — | :white_check_mark: PASS | `to.emit()` assertions on all event types |

**Category score: 7/7**

---

## 11. Deployment Security (4 checks)

| # | Check | SWC | Result | Notes |
|---|-------|-----|--------|-------|
| 11.1 | Private keys loaded from environment, not hardcoded | — | :white_check_mark: PASS | `process.env.PRIVATE_KEY` in hardhat.config.ts:8 |
| 11.2 | Network guard on testnet deploy script | — | :white_check_mark: PASS | deploy-sepolia.ts:7-13 checks `network.name !== "sepolia"` |
| 11.3 | Etherscan verification included | — | :white_check_mark: PASS | deploy-sepolia.ts:35-49 with "already verified" handling |
| 11.4 | `.env` files excluded from version control | — | :white_check_mark: PASS | `.gitignore` includes `.env`, `.env.local`, `.env.production` |

**Category score: 4/4**

---

## Summary

| Category | Checks | Passed | Failed |
|----------|--------|--------|--------|
| 1. Compiler & Pragma | 6 | 6 | 0 |
| 2. Access Control | 9 | 8 | 1 |
| 3. State Machine | 8 | 8 | 0 |
| 4. Data Validation | 7 | 6 | 1 |
| 5. Event Emission | 6 | 6 | 0 |
| 6. Reentrancy | 6 | 6 | 0 |
| 7. Gas & DoS | 7 | 6 | 1 |
| 8. Visibility & Encapsulation | 6 | 6 | 0 |
| 9. Documentation | 5 | 5 | 0 |
| 10. Testing Coverage | 7 | 7 | 0 |
| 11. Deployment Security | 4 | 4 | 0 |
| **TOTAL** | **71** | **68** | **3** |

**Overall pass rate: 95.8% (68/71)**

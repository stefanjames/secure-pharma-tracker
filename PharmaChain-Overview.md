# PharmaChain dApp - Comprehensive Overview

## Quick Overview

PharmaChain is a full-stack dApp that tracks pharmaceutical batches from manufacturer to patient using role-based access control and immutable on-chain event logging. I built it to explore how smart contract architecture can solve real supply chain transparency problems and to understand the security surface area of multi-rolepermissioned systems.  

## Security Focus:

This project is my way of learning blockchain security from the builder's side understanding vulnerabilities like reentrancy, access control gaps, and input
validation by writing the contracts myself and auditing them against real checklists like SWC and the Solidity security best practices.

## What PharmaChain Is

PharmaChain is a **blockchain-based pharmaceutical supply chain tracking system** built on Ethereum. It creates an immutable, transparent audit trail for drug batches as they move from manufacturer to quality approval (or rejection/recall).

**Tech stack:** Solidity 0.8.24 + Hardhat | React 18 + TypeScript + Vite | ethers.js v6 + MetaMask | TailwindCSS + shadcn/ui

---

## The Problem It Solves

Counterfeit pharmaceuticals are a **$200B+ global problem**. Traditional supply chains fail because:

1. **Counterfeit infiltration** — Forged drugs enter through opaque handoff points
2. **Broken audit trails** — Paper-based or siloed digital records are easy to falsify
3. **No real-time visibility** — Regulators, pharmacies, and patients can't verify authenticity

PharmaChain addresses this by putting every lifecycle event on-chain — creating a **tamper-proof, cryptographically signed record** that no single party can alter.

---

## How the State Machine Works

```
Created ──► InTransit ──► Delivered ──► QATesting ──► Approved (terminal)
                                            │
                                            └──► Rejected (terminal)

     Regulator can RECALL from any non-terminal state ──► Recalled (terminal)
```

Each transition is enforced by `_requireStatus()` — you can't skip stages, go backward, or operate on terminal batches.

### Status Enum (7 States)

| Status | Value | Description |
|--------|-------|-------------|
| Created | 0 | Initial batch registration |
| InTransit | 1 | Shipped to logistics |
| Delivered | 2 | Received at destination |
| QATesting | 3 | Under quality assurance |
| Approved | 4 | TERMINAL: Passed QA |
| Rejected | 5 | TERMINAL: Failed QA |
| Recalled | 6 | TERMINAL: Regulatory recall |

### State Transition Functions

| Function | Caller | From Status | To Status | New Holder |
|----------|--------|-------------|-----------|------------|
| `shipBatch(batchId, logistics)` | Manufacturer | Created | InTransit | logistics (role-validated) |
| `deliverBatch(batchId, destination)` | Logistics | InTransit | Delivered | destination |
| `beginQATesting(batchId)` | Tester | Delivered | QATesting | msg.sender (tester) |
| `approveBatch(batchId)` | Tester | QATesting | Approved | msg.sender |
| `rejectBatch(batchId)` | Tester | QATesting | Rejected | msg.sender |
| `recallBatch(batchId)` | Regulator | Any non-terminal | Recalled | msg.sender |

---

## Data Structures

### BatchInfo Struct

```solidity
struct BatchInfo {
    uint256 batchId;        // Unique identifier (auto-incremented)
    string drugName;        // Human-readable drug name
    address manufacturer;   // Original creator
    address currentHolder;  // Current custody holder
    Status status;          // Current lifecycle state
    uint256 createdAt;      // Creation timestamp
    uint256 updatedAt;      // Last transition timestamp
}
```

### TemperatureLog Struct

```solidity
struct TemperatureLog {
    int16 temperatureCelsius; // Stored as tenths (e.g., 365 = 36.5°C)
    uint256 timestamp;        // When recorded
    address recorder;         // Who recorded it
}
```

---

## Role-Based Access Control (RBAC)

| Role | Constant | Permissions |
|------|----------|-------------|
| Admin | `DEFAULT_ADMIN_ROLE` | Grant/revoke all roles |
| Manufacturer | `MANUFACTURER_ROLE` | Create batches, ship to logistics |
| Logistics | `LOGISTICS_ROLE` | Confirm delivery, record temperature |
| QA Tester | `TESTER_ROLE` | Begin QA, approve/reject, record temperature |
| Regulator | `REGULATOR_ROLE` | Recall batches from any non-terminal state |

Implemented via **OpenZeppelin AccessControl** with keccak256-hashed role identifiers.

---

## Security Patterns Baked In

### 1. Role-Based Access Control (OpenZeppelin `AccessControl`)

- **5 roles**: Admin, Manufacturer, Logistics, Tester, Regulator
- Each function is gated with `onlyRole(ROLE)` — a manufacturer can't approve a batch, a logistics provider can't create one
- `AccessControl` was chosen over `Ownable` — this is the **correct pattern** for multi-party systems (`Ownable` = single admin, which doesn't model real supply chains)
- Role identifiers are `keccak256` hashes, not plain strings

### 2. Reentrancy Guard (OpenZeppelin `ReentrancyGuard`)

- Applied to **all 8 state-changing functions** via `nonReentrant`
- Even though the contract has **no ETH transfers or external calls** (meaning reentrancy isn't currently exploitable), this is **defense-in-depth** — if the contract evolves to include external calls, the guard is already there
- As an auditor, you'll see contracts that skip this "because there's no ETH" — and then get exploited when someone adds a callback later

### 3. State Machine Enforcement

```solidity
_requireStatus(batchId, Status.InTransit, Status.Delivered);
```

- Explicit validation of **current state before allowing transition**
- `notTerminal` modifier blocks any operation on Approved/Rejected/Recalled batches
- Prevents the classic **state manipulation attack** where an attacker skips QA by calling `approveBatch` directly on a `Created` batch

### 4. Custom Errors (Gas-Efficient Reverts)

```solidity
error BatchDoesNotExist(uint256 batchId);
error InvalidStateTransition(Status current, Status target);
error NotCurrentHolder(address caller, address holder);
error TerminalState(uint256 batchId, Status status);
error RecipientMissingRole(address recipient, bytes32 role);
```

- Saves **~60 bytes per revert** compared to `require(condition, "string")`
- Enables ABI-level error decoding on the frontend (`parseContractError()` translates these to user-friendly messages)
- As an auditor, you'll flag contracts still using string reverts as a gas optimization finding

### 5. Input Validation

- Empty drug names rejected (`EmptyDrugName()`)
- Batch ID 0 rejected, out-of-range IDs rejected
- `shipBatch()` validates the recipient **actually holds `LOGISTICS_ROLE`** before transferring custody
- No `tx.origin` usage anywhere (only `msg.sender`) — prevents phishing attacks

### 6. Locked Pragma & No Dangerous Patterns

- `pragma solidity 0.8.24` (locked, not floating `^0.8.0`)
- No `delegatecall` (no code injection vector)
- No `selfdestruct` (can't kill the contract)
- No upgradeable proxy (no admin takeover vector)
- No ETH handling (no fund loss risk)
- Built-in overflow protection (Solidity 0.8+)

---

## Custom Modifiers (Security Guards)

```solidity
modifier batchExists(uint256 batchId)    // Validate batch ID range
modifier onlyHolder(uint256 batchId)     // Restrict to current holder
modifier notTerminal(uint256 batchId)    // Block terminal state operations
```

---

## Events (Indexed for Efficient Filtering)

```solidity
event BatchCreated(
    uint256 indexed batchId,
    string drugName,
    address indexed manufacturer,
    uint256 timestamp
);

event BatchTransitioned(
    uint256 indexed batchId,
    Status indexed fromStatus,
    Status indexed toStatus,
    address actor,
    uint256 timestamp
);

event TemperatureRecorded(
    uint256 indexed batchId,
    int16 temperatureCelsius,
    address indexed recorder,
    uint256 timestamp
);
```

---

## Known Audit Findings

| Severity | ID | Finding | Issue |
|----------|----|---------|-------|
| **Medium** | F-01 | `deliverBatch()` missing validation | Allows delivery to `address(0)` — batch becomes permanently orphaned |
| **Medium** | F-02 | `recordTemperature()` no status guard | Allows temp logs on terminal batches, creating misleading audit trails |
| **Low** | F-03 | Unbounded drug name string | No max length — potential gas griefing |
| **Low** | F-04 | Unbounded array return | `getTemperatureLogs()` returns unbounded array — gas scalability risk |

**Overall Result: PASS** — No critical or high-severity vulnerabilities.

### Recommended Remediations

- **F-01:** Add `if (destination == address(0)) revert InvalidDestination();`
- **F-02:** Add `notTerminal(batchId)` modifier to `recordTemperature()`
- **F-03:** Add `if (bytes(drugName).length > 128) revert DrugNameTooLong();`
- **F-04:** Implement pagination or limit temperature log entries per batch

---

## Testing Coverage

**Test file:** `test/PharmaChain.test.ts` (1,470 lines, 85+ tests)

**Coverage: 100%** (line, branch, function, and statement)

| Category | What's Tested |
|----------|---------------|
| Deployment | Constructor, DEFAULT_ADMIN_ROLE, batch count, role constants |
| RBAC | Role grant/revoke, unauthorized access on each function, role enumeration |
| Batch Creation | Valid creation, invalid inputs, sequential IDs, empty name rejection |
| State Transitions | All 6 valid transitions |
| Invalid Transitions | All invalid paths blocked, wrong holder rejection |
| Terminal State Enforcement | No transitions from Approved/Rejected/Recalled |
| Recall | Recall from all non-terminal states, regulator-only access |
| Temperature Logging | Valid logs, role enforcement, int16 boundaries, negative values |
| Edge Cases | batchId 0, zero address, unicode strings, very long drug names |
| Reentrancy Guard | All 8 protected functions tested |
| View Functions | Boundary conditions, batch lookup, temp log retrieval |

### Test Fixtures (Progressive Setup)

```
deployFixture()
  ├── createdFixture()        → Batch 1 in Created status
  │   ├── inTransitFixture()  → Shipped to logistics
  │   │   └── deliveredFixture()  → Delivered to destination
  │   │       └── qaTestingFixture()  → Under QA testing
  │   │           ├── approvedFixture()  → Passed QA
  │   │           └── rejectedFixture()  → Failed QA
  │   └── recalledFixture()   → Recalled by regulator
```

---

## Frontend Architecture

### Component Hierarchy

**Landing Page** (when no wallet connected):
- `LandingPage.tsx` — Wrapper
- `Hero.tsx` — Hero section with `NetworkCanvas` particle animation
- `ProblemSolution.tsx` — Problem/solution overview
- `HowItWorks.tsx` — Workflow visualization
- `ChainStats.tsx` — Key statistics cards
- `DemoExplorer.tsx` — Interactive batch demo
- `RoleCards.tsx` — Role descriptions

**Dashboard** (when wallet connected):
- `DashboardHome.tsx` — Stats, quick actions, recent activity
- `BatchSearch.tsx` — Batch lookup by ID + actions panel
- `BatchTimeline.tsx` — Event history timeline
- `BatchActions.tsx` — Role-specific batch operations
- `CreateBatch.tsx` — Batch registration form
- `EventFeed.tsx` — Live on-chain event stream
- `RoleManager.tsx` — Admin role grant/revoke interface

### Custom Hooks

| Hook | Purpose |
|------|---------|
| `useWallet` | MetaMask connection, signer, provider, chain ID |
| `usePharmaChain` | All contract read/write methods, role state, tx pending state |
| `useToast` | Notification system (success, error, info) |

### Error Handling

`parseContractError()` translates on-chain custom errors to user-friendly messages:

| Contract Error | User Message |
|----------------|-------------|
| `EmptyDrugName` | "Drug name cannot be empty" |
| `BatchDoesNotExist` | "Batch does not exist" |
| `InvalidStateTransition` | "Invalid state transition for this batch" |
| `NotCurrentHolder` | "You are not the current holder of this batch" |
| `TerminalState` | "Batch is in a terminal state and cannot be modified" |
| `RecipientMissingRole` | "Recipient does not have the required role" |
| `AccessControlUnauthorizedAccount` | "You do not have the required role for this action" |

---

## Regulatory Alignment

PharmaChain is designed with awareness of:

- **FDA 21 CFR Part 11** — On-chain events provide tamper-evident audit trails with cryptographic attribution
- **Drug Supply Chain Security Act (DSCSA)** — State machine maps directly to DSCSA track-and-trace requirements
- **EU Falsified Medicines Directive (FMD)** — Role-based access control ensures only authorized participants interact

---

## What This Teaches You for Auditing

| What You Built | What You'll Audit For |
|---|---|
| `AccessControl` RBAC | Missing access controls, privilege escalation, role confusion |
| `ReentrancyGuard` on all functions | Missing guards, cross-function reentrancy, read-only reentrancy |
| State machine with `_requireStatus` | State manipulation, skipped transitions, front-running state changes |
| Custom errors | Gas optimization findings, missing error context |
| `deliverBatch` missing role check (F-01) | Access control gaps on specific functions |
| No status guard on `recordTemperature` (F-02) | Incomplete invariant enforcement |
| 100% test coverage | Whether projects have adequate test coverage (most don't) |
| Self-audit report | Writing professional audit reports for clients |

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `contracts/contracts/PharmaChain.sol` | Core smart contract (319 lines) |
| `test/PharmaChain.test.ts` | Test suite (1,470 lines, 85+ tests) |
| `frontend/src/hooks/usePharmaChain.ts` | Contract interaction hook |
| `frontend/src/lib/contract.ts` | ABI, roles, status enums, error parsing |
| `frontend/src/components/Dashboard.tsx` | Main UI shell |
| `frontend/src/components/BatchActions.tsx` | Role-specific batch operations |
| `scripts/deploy-local.ts` | Local deployment + role assignment |
| `scripts/deploy-sepolia.ts` | Testnet deployment + Etherscan verification |
| `audit/smart-contract-audit-report.md` | Security audit (5 findings, 0 critical/high) |
| `audit/smart-contract-audit-checklist.md` | 71-point SWC-aligned audit checklist |

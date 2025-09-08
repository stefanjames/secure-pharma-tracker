# ✅ Smart Contract Audit Checklist  
**For Manual, Automated, and AI-Assisted Review**

This checklist provides a structured guide for reviewing smart contracts for security, best practices, and gas efficiency.

---

## 🔐 Access Control

- [ ] All privileged functions protected by `onlyOwner`, `AccessControl`, or custom modifiers
- [ ] Constructor or initializer access set correctly
- [ ] Upgradeability (if used) is restricted and secure
- [ ] Role-based permissions (if used) are properly defined

**AI Prompt:**
> "Review the contract for access control weaknesses. Are there any public or external functions missing role restrictions like `onlyOwner` or `hasRole()`?"

---

## 🔄 Reentrancy

- [ ] External calls do not occur before internal state changes
- [ ] `nonReentrant` modifier used where needed
- [ ] No reentrancy risks via callbacks or proxy interactions

**AI Prompt:**
> "Are there any reentrancy vulnerabilities in this smart contract? Identify unsafe external calls and suggest use of `nonReentrant` where appropriate."

---

## ➕ Arithmetic & Overflow

- [ ] Solidity ≥0.8 used (with built-in overflow checks)
- [ ] `unchecked` blocks only used where safe and justified
- [ ] Calculations involving user inputs are bounded

**AI Prompt:**
> "Are there any unsafe arithmetic operations or unguarded uses of `unchecked` in this contract?"

---

## 📦 External Calls

- [ ] `.call`, `.delegatecall`, `.staticcall` used safely
- [ ] Return values from low-level calls are checked
- [ ] Contract is not vulnerable to external contract behavior

**AI Prompt:**
> "Analyze use of external contract calls. Are return values verified and access protected? Is delegatecall safe?"

---

## 📤 Fallback / Receive Functions

- [ ] Only included if needed
- [ ] Contains no logic that could be exploited
- [ ] Emits events when triggered (if appropriate)

**AI Prompt:**
> "Is the fallback or receive function in this contract safe and necessary? Could it lead to unexpected behavior?"

---

## 📊 Event Logging

- [ ] Important state changes emit events
- [ ] Events include critical information for off-chain indexing
- [ ] No sensitive data is logged

**AI Prompt:**
> "Review the smart contract for missing event emissions. Recommend logs for state changes

---

## 🧪 Testing & Fuzzing

- [ ] All public/external functions are covered by unit tests
- [ ] Revert conditions and access control are tested
- [ ] Fuzz tests or property-based tests applied to core logic
- [ ] Invariants are verified where applicable (e.g., totals must always match)

**Tools**: Foundry (`forge test`, `forge fuzz`), Hardhat + Chai/Waffle

**AI Prompt:**
> "Generate unit tests and fuzzing cases for this contract’s external functions using Foundry or Hardhat."

---

## ⚙️ Compiler & Optimization Review

- [ ] Compiler version specified and >= `0.8.x`
- [ ] Optimizer enabled in Hardhat config (`enabled: true, runs: 200`)
- [ ] Stack-too-deep handled via `--via-ir` or function refactor

**Note**: If Slither or solc fail due to stack depth, document it in the audit report and fallback to manual/AI review.

**AI Prompt:**
> "Refactor this Solidity function to avoid the stack-too-deep error while preserving functionality."

---

## 🤖 AI Audit Fallback Coverage

When tool-based analysis fails:

- [ ] Entire contract reviewed in Cursor or ChatGPT with security-focused prompt
- [ ] AI flagged reentrancy, access control, and validation risks
- [ ] AI-suggested refactors and logic improvements applied and tested
- [ ] Summary of AI findings documented in audit report

---

## 📚 SWC ID Reference Table

| SWC ID | Title                                 | Link |
|--------|---------------------------------------|------|
| SWC-101 | Integer Overflow/Underflow           | [View](https://swcregistry.io/docs/SWC-101) |
| SWC-104 | Unchecked Call Return Value          | [View](https://swcregistry.io/docs/SWC-104) |
| SWC-105 | Unprotected Critical Function        | [View](https://swcregistry.io/docs/SWC-105) |
| SWC-107 | Reentrancy                           | [View](https://swcregistry.io/docs/SWC-107) |
| SWC-110 | Assert Violation                     | [View](https://swcregistry.io/docs/SWC-110) |
| SWC-112 | Delegatecall to Untrusted Contract   | [View](https://swcregistry.io/docs/SWC-112) |
| SWC-113 | DoS with Failed Call                 | [View](https://swcregistry.io/docs/SWC-113) |
| SWC-119 | Shadowing State Variables            | [View](https://swcregistry.io/docs/SWC-119) |
| SWC-122 | Lack of Input Validation             | [View](https://swcregistry.io/docs/SWC-122) |
| SWC-123 | Requirement Violation                | [View](https://swcregistry.io/docs/SWC-123) |
| SWC-128 | DoS via Block Gas Limit              | [View](https://swcregistry.io/docs/SWC-128) |
| SWC-135 | Code With No Effects                 | [View](https://swcregistry.io/docs/SWC-135) |
| SWC-136 | Unencrypted Event Logging            | [View](https://swcregistry.io/docs/SWC-136) |

---

**Checklist Version**: v1.1  
**Last Updated**: September 2025  
**Maintained By**: Stefan James, James Consulting Group LLC


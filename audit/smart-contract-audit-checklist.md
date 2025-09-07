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

# 🔐 Master Web3 DApp Security Assessment Checklist

Use this checklist to audit the **frontend + integration layer** of any Web3 DApp.  
For backend smart contract audits, use a dedicated contract audit template.

Each section includes **Purpose, Test Prompt, Evidence, and Remediation Guidance**.

---

## 1. Scope & Threat Model
**Purpose:** Define assets, trust boundaries, and attacker types.  
**Test Prompt:** List all assets (funds, API keys, batch data, wallets), map trust boundaries (frontend ↔ backend ↔ blockchain), and define attacker goals.  
**Evidence:** Threat model diagram, notes.  
**Remediation:** Keep updated threat models; reassess before release.

---

## 2. API Key & Secret Exposure
**Purpose:** Prevent leakage of API keys or secrets.  
**Test Prompt:** Inspect browser DevTools → Network/Source tabs for exposed RPC keys, DB strings, or env variables.  
**Evidence:** Screenshot if found.  
**Remediation:** Move secrets to server-side `.env`; use API gateways/proxies.

---

## 3. Authentication & Authorization
**Purpose:** Ensure only authenticated and authorized users access sensitive actions.  
**Test Prompt:**  
- Try accessing protected routes without logging in.  
- Manipulate JWT/session tokens.  
- Attempt admin-only actions as normal user.  
**Evidence:** Screenshots/logs of bypass attempts.  
**Remediation:** Enforce RBAC, signed sessions, short token TTL, backend checks.

---

## 4. Input Validation & Injection
**Purpose:** Block XSS, SQLi, NoSQLi.  
**Test Prompt:** Submit payloads like `<script>alert(1)</script>` or `' OR '1'='1'`.  
**Evidence:** Screenshots of failed/successful injection.  
**Remediation:** Use server-side validation, parameterized queries, DOM sanitization (`DOMPurify`).

---

## 5. Wallet & Transaction Safety
**Purpose:** Prevent unsafe wallet interactions.  
**Test Prompt:**  
- Switch chain ID to unsupported network.  
- Reject transactions and see if app fails gracefully.  
- Verify transaction previews are human-readable.  
**Evidence:** Screenshots of MetaMask confirmations/rejections.  
**Remediation:** Enforce `chainId` checks, always display safe previews, require explicit user confirmation.

---

## 6. Smart Contract Interaction via UI
**Purpose:** Ensure UI doesn’t allow privilege escalation or unsafe calls.  
**Test Prompt:**  
- Attempt to call high-privilege contract functions via UI.  
- Try granting unlimited token approvals.  
**Evidence:** Tx attempt screenshots.  
**Remediation:** Limit approvals, enforce role checks in UI + smart contract.

---

## 7. On-chain ⇄ Off-chain Data Integrity
**Purpose:** Ensure UI data matches blockchain data.  
**Test Prompt:** Compare UI batch data (e.g., product status, logs) with blockchain explorer (`hardhat` local or Etherscan).  
**Evidence:** Screenshot comparison.  
**Remediation:** Always fetch authoritative data from chain, not cached backend.

---

## 8. Security Headers & HTTPS
**Purpose:** Enforce browser security protections.  
**Test Prompt:**  
- Use [securityheaders.com](https://securityheaders.com) or curl.  
- Verify `CSP`, `HSTS`, `X-Frame-Options`, and HTTPS.  
**Evidence:** Header scan results.  
**Remediation:** Add headers via server or CDN (`helmet` in Express).

---

## 9. Rate Limiting & Abuse Controls
**Purpose:** Prevent brute force & DoS.  
**Test Prompt:** Run `ab -n 200 -c 50 https://app/api/endpoint` or `curl` loops to flood endpoints.  
**Evidence:** Logs showing throttling/blocks.  
**Remediation:** Add per-IP rate limiting (`express-rate-limit`, Cloudflare rules).

---

## 10. Dependency & Supply-Chain Security
**Purpose:** Avoid known vulnerable packages.  
**Test Prompt:**  
- Run `npm audit --production`.  
- Run `semgrep --config auto .`.  
- Run `gitleaks detect .`.  
**Evidence:** Scan output.  
**Remediation:** Update or replace vulnerable dependencies; pin versions.

---

# ✅ Deliverables per Audit
- `/SECURITY/ASSESSMENT_REPORT.md` → filled with Pass/Fail, Evidence/Notes.  
- `/SECURITY/EVIDENCE/` → screenshots (XSS attempts, headers, wallet tx tests).  
- `/SECURITY/SECURITY_SUMMARY.md` → 1-page summary (Pass/Fail + fixes applied).  

---

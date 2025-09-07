# 🤖 AI-Powered Frontend Security Assessment Prompts

This file documents the AI prompts used to perform a security assessment of the frontend interface of this decentralized application (DApp). The goal is to identify potential frontend-level vulnerabilities and misconfigurations using structured, repeatable AI workflows.

---

## 🔐 Categories & Prompts

### 1. 🔑 **API Key Exposure / Secret Leakage**
> "Inspect the entire frontend codebase (React/Next/Vue) and browser DevTools network traffic. Are any API keys, private endpoints, JWTs, or blockchain provider keys exposed either in code or through client-side calls?"

---

### 2. 🔄 **Authentication & Session Management**
> "Review how user sessions are handled in the frontend. Is access to protected routes properly gated? Are tokens stored in localStorage or cookies? Is there risk of session hijacking or token replay?"

---

### 3. ⚙️ **Wallet Connection Security**
> "Analyze the MetaMask (or WalletConnect) integration in this dApp. Are wallet events properly validated? Is chain switching handled securely? Is there any possibility of phishing prompts or signature abuse?"

---

### 4. 📊 **Frontend Input Validation**
> "Review form inputs and user-submitted fields. Are input values validated client-side and sanitized before blockchain interaction or API calls? Could malicious input affect smart contract state or create UI injection?"

---

### 5. 🌐 **CORS & Security Headers**
> "Does this app implement proper frontend-origin protections? Are CSP, X-Frame-Options, and Referrer-Policy headers configured? Could the dApp be embedded in an iframe for phishing or clickjacking?"

---

### 6. 🚨 **Rate Limiting & Abuse Prevention**
> "Could a user automate UI interactions to spam smart contract calls (e.g., batch creation, vote spamming, transaction flooding)? Are there UI-based rate limits or UX throttling to discourage abuse?"

---

### 7. 🧪 **Error Handling and Leak Prevention**
> "Are error messages exposing stack traces, internal logic, or hints about the underlying smart contract behavior? Are unexpected errors gracefully handled on the frontend?"

---

### 8. 🕵️‍♂️ **Sensitive Data Exposure**
> "Are blockchain transactions or form inputs exposing sensitive user information unnecessarily (e.g., usernames, wallet balances, off-chain identifiers)? Is the frontend properly obfuscating or limiting sensitive data?"

---

### 9. 📲 **Mobile Responsiveness & UX Security**
> "Does the mobile layout introduce hidden vulnerabilities—such as buttons appearing off-screen, overlapping wallets, or obscured modals that can be abused?"

---

### 10. 🔁 **Replay / Signature Attack Vectors**
> "If the dApp involves off-chain signatures (e.g., EIP-712), can the same signature be reused maliciously? Does the frontend enforce nonce, expiration, or single-use protections?"

---

## 🧠 Prompt Methodology

These AI prompts were iteratively applied using tools like:
- GPT-4 / ChatGPT
- Replit AI
- DevTools + manual fuzz testing
- OWASP & blockchain-specific threat modeling

---

## ✅ Usage Instructions

Copy this file into each audited frontend project in the `/audit/` or `/security/` directory and update the assessment date and context.

- Last updated: `{{MONTH}} {{YEAR}}`
- Auditor: `@stefanjames`

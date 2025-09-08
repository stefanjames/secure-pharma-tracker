# Threat Model Diagram - PharmaChain Application
## Visual Threat Modeling and Trust Boundary Analysis

### SYSTEM ARCHITECTURE DIAGRAM

```
                           ┌─────────────────────────────────────────────────┐
                           │                THREAT ACTORS                   │
                           │  👤 Nation-State  💰 Crime Orgs  👨‍💼 Insiders  │
                           │  🏢 Competitors   🎯 Opportunists               │
                           └─────────────────────┬───────────────────────────┘
                                                 │
                                        ⚡ ATTACK VECTORS
                                                 │
┌────────────────────────────────────────────────┼────────────────────────────────────────────────┐
│                                                ▼                                                │
│                                    🌐 INTERNET / PUBLIC WEB                                    │
│ ┌──────────────────────────────────────────────────────────────────────────────────────────┐ │
│ │                                  FRONTEND (UNTRUSTED)                                   │ │
│ │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐    │ │
│ │  │   React Client  │  │  MetaMask Wallet│  │   Input Forms   │  │  Local Storage  │    │ │
│ │  │                 │  │                 │  │                 │  │                 │    │ │
│ │  │ • UI Components │  │ • Private Keys  │  │ • Batch Data    │  │ • Role Info     │    │ │
│ │  │ • Business Logic│  │ • Signing       │  │ • Quality Tests │  │ • Session Data  │    │ │
│ │  │ • API Calls     │  │ • Transactions  │  │ • User Input    │  │ • App State     │    │ │
│ │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘    │ │
│ │                                                                                        │ │
│ │  🔓 Current Vulnerabilities:                                                          │ │
│ │  • XSS Injection Points                                                               │ │
│ │  • Client-side Security Theater                                                       │ │
│ │  • Exposed Environment Variables                                                      │ │
│ │  • No Input Validation                                                                │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                                                │                                                │
│                                    ═══════════════════════                                     │
│                                   🚨 TRUST BOUNDARY 1 🚨                                      │
│                                   ❌ COMPLETELY BROKEN ❌                                      │
│                                    ═══════════════════════                                     │
│                                                │                                                │
│ ┌──────────────────────────────────────────────▼────────────────────────────────────────────┐ │
│ │                                BACKEND (SEMI-TRUSTED)                                     │ │
│ │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐      │ │
│ │  │  Express Server │  │  API Endpoints  │  │ Business Logic  │  │  Validation     │      │ │
│ │  │                 │  │                 │  │                 │  │                 │      │ │
│ │  │ • Routing       │  │ • /api/batches  │  │ • CRUD Ops      │  │ • Zod Schemas   │      │ │
│ │  │ • Middleware    │  │ • /api/quality  │  │ • Calculations  │  │ • Type Checking │      │ │
│ │  │ • Error Handling│  │ • /api/audit    │  │ • Workflows     │  │ • Sanitization  │      │ │
│ │  └─────────────────┘  └─────────────────┘  └─────────────────┘  └─────────────────┘      │ │
│ │                                                                                          │ │
│ │  🔓 Current Vulnerabilities:                                                            │ │
│ │  • No Authentication Required                                                           │ │
│ │  • No Authorization Checks                                                              │ │
│ │  • No Rate Limiting                                                                     │ │
│ │  • Missing Security Headers                                                             │ │
│ └──────────────────────────────────────────────────────────────────────────────────────────┘ │
│                 │                                                │                             │
│     ═══════════════════════                          ═══════════════════════                  │
│    🔒 TRUST BOUNDARY 2 🔒                           🔒 TRUST BOUNDARY 3 🔒                   │
│    ✅ PARTIALLY SECURE ✅                           ⚠️  DEV CONFIGURATION ⚠️                  │
│     ═══════════════════════                          ═══════════════════════                  │
│                 │                                                │                             │
│ ┌───────────────▼───────────────┐                    ┌───────────▼───────────────┐             │
│ │        DATABASE (TRUSTED)     │                    │     BLOCKCHAIN (PSEUDO)   │             │
│ │  ┌───────────┐ ┌───────────┐  │                    │  ┌───────────┐ ┌─────────┐ │             │
│ │  │  Batches  │ │ QualityTests│ │                    │  │ Smart     │ │ Local   │ │             │
│ │  │   Table   │ │   Table     │ │                    │  │ Contract  │ │ Network │ │             │
│ │  │           │ │             │ │                    │  │           │ │         │ │             │
│ │  │📦 6 Batches│ │🧪 9 Tests  │ │                    │  │• createBatch│ │Chain ID │ │             │
│ │  │4 Active   │ │Contaminated │ │                    │  │• updateStatus│ │31337   │ │             │
│ │  │2 Recalled │ │w/ Malicious │ │                    │  │• addQualityTest│ │Test  │ │             │
│ │  │           │ │Payloads     │ │                    │  │• recallBatch│ │Network │ │             │
│ │  └───────────┘ └───────────┘  │                    │  └───────────┘ └─────────┘ │             │
│ │  ┌───────────┐ ┌───────────┐  │                    │                           │             │
│ │  │AuditLogs  │ │   Users    │  │                    │  🔓 Development Risks:    │             │
│ │  │  Table    │ │   Table    │  │                    │  • Test Mnemonic Exposed  │             │
│ │  │           │ │            │  │                    │  • Predictable Addresses  │             │
│ │  │22 Entries │ │❌ NOT USED │  │                    │  • Local Only Network     │             │
│ │  │Contaminated│ │           │  │                    │  • Default Configuration  │             │
│ │  └───────────┘ └───────────┘  │                    └───────────────────────────┘             │
│ │                               │                                                              │
│ │  🔒 Database Security:        │                                                              │
│ │  ✅ Connection String Secured │                                                              │
│ │  ✅ SQL Injection Protected   │                                                              │
│ │  ❌ No Access Controls       │                                                              │
│ │  ❌ Data Contaminated        │                                                              │
│ └───────────────────────────────┘                                                              │
└────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### THREAT FLOW DIAGRAM

```
                                    ⚡ ATTACK SCENARIOS ⚡

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   SCENARIO 1: DATA BREACH                                        │
│                                                                                                 │
│  🎯 Attacker → 🌐 Internet → 🔓 No Auth → 📡 API Access → 💾 Database → 📊 Pharma Data        │
│                                                                                                 │
│  Steps: 1. Discover unprotected endpoints                                                      │
│         2. Extract all pharmaceutical batch data                                                │
│         3. Access quality test results                                                          │
│         4. Download complete audit trail                                                        │
│                                                                                                 │
│  Impact: Complete pharmaceutical supply chain exposure                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                SCENARIO 2: COUNTERFEIT ENABLEMENT                               │
│                                                                                                 │
│  💰 Crime Org → 🔍 Recon → 📝 Batch IDs → 🧪 Test Results → 💊 Counterfeit → 🏥 Distribution  │
│                                                                                                 │
│  Steps: 1. Harvest legitimate batch identifiers                                                │
│         2. Copy manufacturing and expiry dates                                                  │
│         3. Generate fake QR codes with real data                                                │
│         4. Distribute dangerous counterfeit drugs                                               │
│                                                                                                 │
│  Impact: Patient deaths from counterfeit medications                                            │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               SCENARIO 3: SUPPLY CHAIN SABOTAGE                                 │
│                                                                                                 │
│  🏛️ Nation State → 🔐 Persist → ⏰ Crisis → 🚨 False Recalls → 💊 Shortages → 🏥 Emergency    │
│                                                                                                 │
│  Steps: 1. Gain persistent access via auth bypass                                              │
│         2. Monitor pharmaceutical production patterns                                           │
│         3. During health crisis, trigger false recalls                                         │
│         4. Create artificial medication shortages                                               │
│                                                                                                 │
│  Impact: National health emergency during crisis                                                │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 SCENARIO 4: INSIDER SABOTAGE                                    │
│                                                                                                 │
│  👨‍💼 Insider → 💻 Access → 🧪 Fake Tests → ❌ False Fails → 🚨 Recalls → 💸 Financial Loss     │
│                                                                                                 │
│  Steps: 1. Use existing access (no auth required)                                              │
│         2. Create false quality test failures                                                   │
│         3. Trigger unnecessary product recalls                                                  │
│         4. Inject malicious payloads into records                                               │
│                                                                                                 │
│  Impact: Millions in unnecessary recall costs                                                   │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### ATTACK VECTOR MAPPING

```
                                      🎯 TARGET ASSETS 🎯

                    ┌─────────────────────────────────────────────────┐
                    │            PHARMACEUTICAL DATA                  │
                    │  💊 Batch Records    🧪 Quality Tests          │
                    │  📋 Audit Trails    👥 User Accounts           │
                    │  🔐 API Keys        💰 Business Intelligence    │
                    └─────────────────────┬───────────────────────────┘
                                          │
                                          ▼
                            ┌─────────────────────────┐
                            │     ATTACK VECTORS      │
                            └─────────────────────────┘
                                          │
            ┌─────────────────────────────┼─────────────────────────────┐
            │                             │                             │
            ▼                             ▼                             ▼
    ┌───────────────┐            ┌───────────────┐            ┌───────────────┐
    │   EXTERNAL    │            │   NETWORK     │            │   APPLICATION │
    │   THREATS     │            │   ATTACKS     │            │   LAYER       │
    └───────────────┘            └───────────────┘            └───────────────┘
            │                             │                             │
    ┌───────┼───────┐              ┌─────┼─────┐              ┌─────┼─────┐
    │       │       │              │     │     │              │     │     │
    ▼       ▼       ▼              ▼     ▼     ▼              ▼     ▼     ▼
  APT   Crime  Competitors      MITM  DDoS  Sniff         XSS  SQLi  Auth
Groups  Orgs                                                        Bypass

📊 CURRENT EXPLOITABILITY MATRIX:

┌─────────────────┬─────────────┬─────────────┬─────────────┐
│ Attack Vector   │ Difficulty  │ Impact      │ Status      │
├─────────────────┼─────────────┼─────────────┼─────────────┤
│ Auth Bypass     │ Trivial     │ Critical    │ ✅ Active   │
│ Data Theft      │ Trivial     │ Critical    │ ✅ Active   │
│ XSS Injection   │ Easy        │ High        │ ✅ Active   │
│ Privilege Esc   │ Easy        │ High        │ ✅ Active   │
│ SQLi            │ Blocked     │ High        │ 🔒 Protected│
│ XXE             │ Blocked     │ Medium      │ 🔒 Protected│
│ CSRF            │ Easy        │ Medium      │ ⚠️ Possible │
│ DoS             │ Easy        │ Medium      │ ⚠️ Possible │
└─────────────────┴─────────────┴─────────────┴─────────────┘
```

### COMPLIANCE VIOLATION MAP

```
                           🏛️ REGULATORY FRAMEWORKS 🏛️

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                FDA 21 CFR PART 11                                                │
│                                                                                                 │
│  ❌ 11.10(a) - Validation of systems to ensure accuracy and reliability                        │
│  ❌ 11.10(d) - Limiting system access to authorized individuals                                │
│  ❌ 11.10(g) - Use of authority checks to ensure only authorized individuals                   │
│  ❌ 11.30 - Controls for open systems to ensure authenticity and integrity                     │
│  ❌ 11.100 - Electronic signature controls                                                     │
│                                                                                                 │
│  🚨 VIOLATION SEVERITY: CRITICAL - Manufacturing shutdown risk                                 │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    DSCSA COMPLIANCE                                              │
│                                                                                                 │
│  ❌ Product Traceability - Unauthorized access to transaction data                             │
│  ❌ Product Verification - No trading partner authentication                                   │
│  ❌ Detection and Response - Compromised investigation capabilities                             │
│  ❌ Notification - Unauthorized recall initiation possible                                     │
│                                                                                                 │
│  🚨 VIOLATION SEVERITY: HIGH - Supply chain integrity compromised                              │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    GXP COMPLIANCE                                                │
│                                                                                                 │
│  ❌ Data Integrity (ALCOA+) - Malicious payloads contaminating records                        │
│  ❌ System Validation - Inadequate security controls                                           │
│  ❌ Change Control - No protection against unauthorized changes                                 │
│  ❌ Training - No security awareness for data handling                                          │
│                                                                                                 │
│  🚨 VIOLATION SEVERITY: HIGH - Quality system failure                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### RISK HEAT MAP

```
                                    🌡️ RISK ASSESSMENT MATRIX 🌡️

                    HIGH IMPACT ←─────────────────────────→ LOW IMPACT
                         │                                        │
    HIGH               │  ┌─────────────┐  ┌─────────────┐      │
  LIKELIHOOD           │  │   🔴 CRITICAL   │   🟡 HIGH      │      │
                       │  │             │  │             │      │
                       │  │• Auth Bypass│  │• Input Valid│      │
                       │  │• Data Theft │  │• Rate Limits│      │
                       │  │• Priv Escal │  │• Sec Headers│      │
                       │  │• XSS Storage│  │• CORS Config│      │
                       │  └─────────────┘  └─────────────┘      │
                       │                                        │
                       │  ┌─────────────┐  ┌─────────────┐      │
                       │  │   🟡 HIGH     │   🟢 MEDIUM   │      │
                       │  │             │  │             │      │
                       │  │• Template   │  │• XXE Attacks│      │
                       │  │  Injection  │  │• File Upload│      │
                       │  │• CSRF       │  │• Info Discl │      │
                       │  │• Session    │  │• Crypto Weak│      │
                       │  │  Fixation   │  │             │      │
                       │  └─────────────┘  └─────────────┘      │
                       │                                        │
    LOW                │  ┌─────────────┐  ┌─────────────┐      │
  LIKELIHOOD           │  │   🟡 MEDIUM   │   🟢 LOW      │      │
                       │  │             │  │             │      │
                       │  │• Advanced   │  │• Physical   │      │
                       │  │  Persistent │  │  Security   │      │
                       │  │• Zero Days  │  │• Social Eng │      │
                       │  │• Supply     │  │• Insider    │      │
                       │  │  Chain      │  │  Advanced   │      │
                       │  └─────────────┘  └─────────────┘      │
                       │                                        │
                                    Time to Exploit: Minutes to Hours
```

---

**CRITICAL FINDING**: The pharmaceutical application operates with **ZERO SECURITY CONTROLS**, enabling immediate exploitation by any threat actor with internet access. All pharmaceutical data, quality test results, and audit trails are completely exposed without authentication or authorization requirements.

**IMMEDIATE ACTION REQUIRED**: Complete production halt until fundamental security architecture is implemented and validated through penetration testing.
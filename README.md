# 💊 PharmaChain Supply Chain Tracker

A modern Web3-enabled pharmaceutical supply chain dashboard built with React, TypeScript, and Hardhat. Designed to showcase decentralized batch tracking, quality assurance, and transparent audit logging using blockchain smart contracts.

![Status](https://img.shields.io/badge/Demo-Live-brightgreen) ![React](https://img.shields.io/badge/React-18-blue) ![Hardhat](https://img.shields.io/badge/Hardhat-Local%20Blockchain-yellow) ![TailwindCSS](https://img.shields.io/badge/Tailwind-3.x-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue)

---

## 🚀 Live Demo

🌐 [Launch the App](https://blockchain-pharma-track-stefan259.replit.app/)

---

## ✨ Key Features

- 🧪 **Batch Lifecycle Management** — Create, update, and track pharmaceutical batches
- ✅ **Quality Testing Workflow** — Record pass/fail test results per batch
- 🔐 **MetaMask Integration** — Authenticate with wallet & track transaction hashes
- 📜 **Immutable Audit Trail** — All batch changes logged on-chain & off-chain
- 🌐 **Hardhat Blockchain** — Full smart contract integration with local Ethereum
- 🎨 **Glassmorphism UI** — Responsive, modern UI with dark/light mode support
- 📈 **Dashboard Analytics** — Live stats for batches, quality tests, and recalls
- 📦 **PostgreSQL + Drizzle ORM** — Hybrid persistence layer for structured data

---

## 🧱 Tech Stack

| Layer      | Tools & Libraries |
|------------|-------------------|
| Frontend   | React, TypeScript, Tailwind CSS, Shadcn/ui, React Query |
| Backend    | Node.js (Express), PostgreSQL (Neon), Drizzle ORM |
| Blockchain | Hardhat, Solidity, MetaMask, Ethers.js |
| Dev Tools  | Vite, Replit, ESLint, Prettier, Zod |

---

## 📸 Screenshots

> 📍 Clean UI with glassmorphism  
> 📦 Batch creation + audit trail  
> 🔒 MetaMask wallet-connected workflow  
> 📊 Quality test insights + compliance

![](https://github.com/stefanjames/secure-pharma-tracker/blob/main/pharma-chain-main-dashboard.png)

---

## 🛠 Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL instance (e.g., Neon)
- MetaMask wallet installed
- Hardhat (for smart contract testing)

### Setup Instructions

```bash
# Clone the repo
git clone https://github.com/stefanjames/pharma-chain-app.git
cd pharma-chain-app

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env
# Add your DATABASE_URL and blockchain RPC

# Start the local dev server
npm run dev

# PharmaChain - Blockchain Supply Chain Tracker

A cutting-edge pharmaceutical supply chain management platform leveraging Web3 technologies to enhance transparency, quality control, and operational efficiency.

![PharmaChain Dashboard](https://img.shields.io/badge/Status-Live%20Demo-brightgreen) ![React](https://img.shields.io/badge/React-18.x-blue) ![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue) ![Tailwind CSS](https://img.shields.io/badge/Tailwind%20CSS-3.x-blue) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15.x-blue)

## 🌟 Features

### Core Functionality
- **Batch Management** - Create, track, and manage pharmaceutical batches throughout the supply chain
- **Quality Testing** - Integrated quality assurance workflows with test result tracking
- **Audit Trail** - Complete immutable history of all batch operations and status changes
- **Real-time Tracking** - Live status updates and inventory monitoring
- **Role-Based Access** - Manufacturer, Distributor, Regulator, and Auditor permissions

### Web3 Integration
- **MetaMask Wallet** - Secure wallet connection for blockchain authentication
- **Smart Contracts** - Immutable batch records on Hardhat local network
- **Blockchain Verification** - Transaction hashes stored for audit compliance
- **Hybrid Mode** - Works with database-only or blockchain + database storage

### Modern UI/UX
- **Glassmorphism Design** - Professional glass-like UI with transparency effects
- **Dark/Light Mode** - Automatic theme switching with system preference detection
- **Responsive Layout** - Optimized for 13-15" laptops with mobile-first approach
- **Interactive Dashboard** - Real-time data visualization with React Query
- **Accessibility** - WCAG compliant with proper contrast ratios and keyboard navigation

## 🚀 Technology Stack

### Frontend
- **React 18** - Modern component-based architecture with TypeScript
- **Shadcn/ui** - Pre-built component library with Radix UI primitives
- **Tailwind CSS** - Utility-first CSS framework with custom glassmorphism theme
- **TanStack Query** - Powerful data fetching and state management
- **Wouter** - Lightweight client-side routing
- **React Hook Form** - Form handling with Zod validation
- **Ethers.js** - Web3 library for blockchain interactions

### Backend
- **Node.js** - Express.js server with TypeScript
- **PostgreSQL** - Production-ready database with Drizzle ORM
- **Neon Database** - Serverless PostgreSQL with connection pooling
- **RESTful API** - Clean API design with proper error handling
- **Vite** - Fast development and optimized production builds

### Blockchain
- **Hardhat** - Local Ethereum development network
- **MetaMask** - Browser wallet integration
- **Smart Contracts** - Solidity contracts for immutable batch records
- **Chain ID 31337** - Local development blockchain

## 📱 Screenshots

### Dashboard Overview
The main dashboard provides a comprehensive view of your pharmaceutical supply chain with real-time metrics, batch tracking, and quality insights.

### Batch Creation
Streamlined batch creation form with validation, auto-suggestions, and blockchain integration for immutable record keeping.

### Wallet Integration
Clean wallet status display with MetaMask connection, network information, and role-based permissions.

### Quality Testing
Integrated quality assurance workflows with test result tracking and compliance monitoring.

## 🛠️ Development Process

### Architecture Decisions
- **Monorepo Structure** - Clean separation of client, server, and shared code
- **Type Safety** - Full TypeScript implementation with Zod validation
- **Database-First** - PostgreSQL with Drizzle ORM for reliable data persistence
- **Hybrid Approach** - Optional blockchain integration with database fallback

### UI/UX Development
- **Glassmorphism Theme** - Custom Tailwind CSS implementation
- **Component Library** - Shadcn/ui with Radix UI for accessibility
- **Responsive Design** - Mobile-first approach with desktop optimization
- **Performance** - Optimized loading states and real-time updates

### Development Timeline
- **Phase 1** - Core architecture and database setup
- **Phase 2** - Web3 integration and smart contract development
- **Phase 3** - UI/UX implementation with glassmorphism design
- **Phase 4** - Quality assurance, testing, and deployment

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL database
- MetaMask browser extension (for Web3 features)

### Installation
1. Clone the repository
```bash
git clone https://github.com/yourusername/pharmachain.git
cd pharmachain
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables
```bash
cp .env.example .env
# Add your DATABASE_URL and other configuration
```

4. Start the development server
```bash
npm run dev
```

### Optional: Blockchain Setup
For full Web3 functionality, set up the local Hardhat network:
```bash
npx hardhat node --hostname 0.0.0.0 --port 8545
npx hardhat run scripts/deploy.mjs --network localhost
```

## 📊 Project Stats

- **Lines of Code** - ~15,000+ (TypeScript, React, CSS)
- **Components** - 25+ reusable UI components
- **API Endpoints** - 12 RESTful endpoints
- **Database Tables** - 4 normalized tables with relations
- **Test Coverage** - Integration tests with real database
- **Performance** - Optimized for 13-15" laptop screens

## 🔧 Configuration

### Database Schema
- **Batches** - Core pharmaceutical batch records
- **Quality Tests** - Test results and compliance data
- **Audit Logs** - Immutable operation history
- **Users** - Role-based access control

### Environment Variables
- `DATABASE_URL` - PostgreSQL connection string
- `VITE_CONTRACT_ADDRESS` - Smart contract deployment address
- `VITE_RPC_URL` - Blockchain network RPC endpoint
- `VITE_CHAIN_ID` - Target blockchain network ID

## 📈 Future Enhancements

- **Multi-chain Support** - Ethereum, Polygon, BSC integration
- **Advanced Analytics** - Supply chain insights and reporting
- **Mobile App** - React Native companion application
- **API Integration** - Third-party logistics and compliance systems
- **Machine Learning** - Predictive quality analysis

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Contact

**Project Developer** - [Stefan James]
- GitHub: [@stefanjames](https://github.com/stefanjames)
- LinkedIn: [Your LinkedIn](https://www.linkedin.com/in/stefan-james/)

**Project Link** - [https://github.com/stefanjames/secure-pharma-tracker](https://github.com/stefanjames/secure-pharma-tracker)

**Live Demo** - [https://pharmachain.replit.app](https://pharmachain.replit.app)

---

Built with ❤️ using React, TypeScript, and Web3 technologies

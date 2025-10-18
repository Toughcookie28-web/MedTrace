# MedTrace - Blockchain Pharmaceutical Supply Chain Tracking

> **Ensuring drug authenticity from manufacturer to patient using blockchain, NFTs, and verifiable credentials. With blockchain, every pill tells its story.**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.20-green.svg)](https://soliditylang.org/)
[![Hardhat](https://img.shields.io/badge/Hardhat-2.22.17-yellow.svg)](https://hardhat.org/)
[![React](https://img.shields.io/badge/React-18.3.1-61dafb.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5.3-blue.svg)](https://www.typescriptlang.org/)

---

## 🎯 Problem Statement

The global pharmaceutical industry faces a **$200 billion counterfeit drug crisis**. Current supply chains are:
- ❌ **Opaque** - No visibility from factory to pharmacy
- ❌ **Vulnerable** - Easy to introduce counterfeit drugs
- ❌ **Unverifiable** - Patients can't confirm authenticity
- ❌ **Fragmented** - No single source of truth

---

## 💡 Solution

**MedTrace** uses blockchain technology to create an **immutable chain of custody** for pharmaceutical products:

- ✅ **NFT-based Batch Tracking** - Each batch is a unique ERC-721 token (non-duplicable)
- ✅ **Verifiable Credentials** - Government-issued licenses stored on-chain
- ✅ **Recursive Trust Chain** - Partners vouch for partners, creating verifiable networks
- ✅ **IoT Integration** - Temperature, location, condition logs with cryptographic signatures
- ✅ **QR Code Verification** - Anyone can verify authenticity instantly (no wallet needed)
- ✅ **Real-time Tracking** - Complete custody history with timestamps

---

## 🏗️ Architecture

### **System Overview**

```
┌─────────────────────────────────────────────────────────────┐
│                      MedTrace System                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐ │
│  │  Frontend    │◄───┤   Backend    │◄───┤  Blockchain  │ │
│  │  (React)     │    │  (Node.js)   │    │  (Hardhat)   │ │
│  │  Port 5174   │    │  Port 3001   │    │  Port 8545   │ │
│  └──────────────┘    └──────────────┘    └──────────────┘ │
│         │                    │                    │         │
│         │                    │                    │         │
│         ▼                    ▼                    ▼         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │             5 Smart Contracts                        │  │
│  ├──────────────────────────────────────────────────────┤  │
│  │ 1. StakeholderRegistry   - Role & credential mgmt    │  │
│  │ 2. DigitalBatch (NFT)    - Unique batch identity     │  │
│  │ 3. PartnershipRegistry   - Recursive trust chain     │  │
│  │ 4. TrackAndTrace         - Custody transfers         │  │
│  │ 5. SupplyChainEvents     - IoT data logging          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### **Supply Chain Flow**

```
Manufacturer → Distributor → Pharmacist → Patient
     │              │             │            │
     ▼              ▼             ▼            ▼
  [Mint NFT]   [Receive &    [Receive &   [Scan QR]
  [Log IoT]     Acknowledge]  Acknowledge] [Verify]
  [Transfer]    [Log IoT]     [Log IoT]
                [Transfer]
```

---

## 🚀 Quick Start

### **Prerequisites**

- Node.js v20+ (LTS recommended)
- MetaMask browser extension
- Git

### **Installation**

```bash
# Clone the repository
git clone https://github.com/yourusername/medtrace.git
cd medtrace

# Install dependencies for all packages
cd packages/contracts && npm install
cd ../backend && npm install
cd ../frontend && npm install
```

### **Local Development**

**Terminal 1: Start Hardhat Blockchain**
```bash
cd packages/contracts
npx hardhat node
```

**Terminal 2: Deploy Smart Contracts**
```bash
cd packages/contracts
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/register-manufacturers.ts --network localhost
```

**Terminal 3: Start Backend API**
```bash
cd packages/backend
npm run dev
```

**Terminal 4: Start Frontend**
```bash
cd packages/frontend
npm run dev
```

**Access the application:** http://localhost:5174

📖 **Detailed setup guide:** [docs/SETUP & WORKFLOW.md](docs/SETUP%20&%20WORKFLOW.md)

---

## 🔑 Key Features

### **For Manufacturers**
- ✅ Mint pharmaceutical batches as NFTs
- ✅ Apply for verifiable credentials
- ✅ Vouch for trusted distributors
- ✅ Log IoT sensor data with cryptographic signatures
- ✅ Track all batches in real-time

### **For Distributors**
- ✅ Receive batches via QR code scanning
- ✅ Acknowledge receipt with IoT data logging
- ✅ Vouch for trusted pharmacists
- ✅ Transfer custody to downstream partners
- ✅ View shipment history and status

### **For Pharmacists**
- ✅ Receive and verify batch authenticity
- ✅ Log final storage conditions
- ✅ Dispense to patients with proof of authenticity

### **For Patients & Regulators**
- ✅ Scan QR code to verify authenticity (no wallet needed!)
- ✅ View complete custody history
- ✅ See all IoT logs with timestamps
- ✅ Verify cryptographic signatures

---

## 📚 Documentation

- **[docs/SETUP & WORKFLOW.md](docs/SETUP%20&%20WORKFLOW.md)** - Complete local setup and testing guide
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** - System architecture and workflow diagrams
- **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** - Testnet and production deployment
- **[docs/API.md](docs/API.md)** - Backend API reference
- **[docs/UX_UI_SPEC.md](docs/UX_UI_SPEC.md)** - UI/UX specifications and design guidelines

---

## 🛠️ Tech Stack

### **Smart Contracts**
- Solidity 0.8.20
- Hardhat 2.22.17
- OpenZeppelin Contracts 5.1.0
- ERC-721 NFT standard

### **Frontend**
- React 18.3.1
- TypeScript 5.5.3
- ethers.js v6
- Vite 7.1.9
- React Router v7

### **Backend**
- Node.js with Express
- TypeScript
- Server-Sent Events (SSE) for real-time updates
- Event indexing with polling

### **Development**
- Hardhat local blockchain
- MetaMask wallet integration
- QR code generation and scanning
- Real-time blockchain event streaming

---

## 🏢 Smart Contracts

### **1. StakeholderRegistry**
- **Purpose:** Role management and credential verification
- **Key Functions:**
  - `addStakeholder(address, role)` - Assign roles (Manufacturer/Distributor/Pharmacist)
  - `applyForCredential(licenseHash, regNumber, authority)` - Apply for government credential
  - `hasVerifiedCredential(address)` - Check if stakeholder is verified

### **2. DigitalBatch (ERC-721)**
- **Purpose:** Unique batch identity as NFT
- **Key Functions:**
  - `mintBatch(productName, batchNumber)` - Mint new pharmaceutical batch
  - `tokenURI(tokenId)` - Get batch metadata
  - `ownerOf(tokenId)` - Get current owner

### **3. PartnershipRegistry**
- **Purpose:** Recursive trust chain and partner vouching
- **Key Functions:**
  - `establishPartnership(partner, role)` - Vouch for downstream partner
  - `verifyTrustChain(address)` - Verify complete chain back to manufacturer
  - `getTrustChain(address)` - Get all vouchers in chain

### **4. TrackAndTrace**
- **Purpose:** Custody transfer and receipt acknowledgment
- **Key Functions:**
  - `transferCustody(tokenId, to)` - Transfer batch to next stakeholder
  - `acknowledgeReceipt(tokenId, receiptData)` - Acknowledge batch received
  - `getCustodyHistory(tokenId)` - Get complete transfer history

### **5. SupplyChainEvents**
- **Purpose:** IoT data logging with cryptographic signatures
- **Key Functions:**
  - `logEvent(tokenId, eventData, signature)` - Log temperature, location, notes
  - `getEvents(tokenId)` - Get all logged events for batch
  - `verifySignature(eventId)` - Verify who logged the event

---

## 🌐 API Reference

### **Backend API Endpoints**

```
GET  /api/health                           - Health check
GET  /api/batches                          - List all batches
GET  /api/batches/:tokenId                 - Get batch details
GET  /api/batches/:tokenId/events          - Get batch events
GET  /api/batches/:tokenId/custody         - Get custody history
GET  /api/stakeholders/:address/role       - Get stakeholder role
GET  /api/stakeholders/:address/batches    - Get batches owned by address
GET  /api/manufactured/:address            - Get batches manufactured by address
GET  /api/events/stream                    - SSE real-time event stream
```

---

## 🔐 Security Features

- ✅ **Role-based Access Control** - Only authorized stakeholders can perform actions
- ✅ **Verifiable Credentials** - Government-issued licenses verified on-chain
- ✅ **Cryptographic Signatures** - All IoT data cryptographically signed (EIP-191)
- ✅ **NFT Ownership** - Each batch is a unique, non-duplicable token
- ✅ **Immutable Audit Trail** - All events permanently recorded on blockchain
- ✅ **Recursive Trust Verification** - Complete chain of trust back to verified manufacturer

---

## 📊 Use Cases

### **1. Hospital Verification**
- Hospital receives medication shipment
- Scans QR code on package
- Instantly verifies:
  - ✅ Authentic manufacturer
  - ✅ Proper cold chain maintained
  - ✅ Complete custody history
  - ✅ No tampering or counterfeits

### **2. Patient Confidence**
- Patient receives prescription
- Scans QR code on medication bottle
- Sees complete journey from factory to pharmacy
- Confirms medication is genuine

### **3. Regulatory Audit**
- FDA needs to audit pharmaceutical supply chain
- Scans batch QR code or enters Token ID
- Reviews complete history:
  - Every stakeholder who handled the batch
  - All temperature logs during storage/transit
  - Timestamps proving proper handling
  - Cryptographic signatures proving authenticity

### **4. Counterfeit Prevention**
- Counterfeit drug appears in market
- Lacks valid NFT on blockchain
- QR code verification fails
- Immediately identified as fake

---

## 🤝 Contributing

Contributions are welcome! Here are some ways you can help improve MedTrace:

### **Getting Started**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Make your changes
4. Test thoroughly
5. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
6. Push to the branch (`git push origin feature/AmazingFeature`)
7. Open a Pull Request

### **Areas for Contribution**

#### **Testnet Deployment** (High Priority)
- Deploy contracts to Ethereum Sepolia testnet
- Deploy contracts to Polygon Mumbai testnet
- Document testnet deployment process
- Test with public blockchain explorers
- Get test ETH from faucets and document the process

#### **Frontend Improvements**
- Mobile app for QR scanning (React Native)
- Improved UI/UX design
- Multi-language support
- Advanced analytics dashboard
- Accessibility improvements

#### **Backend Enhancements**
- Real IoT device integration
- Event indexing optimization
- API rate limiting
- Caching strategies
- Database integration

#### **Smart Contract Improvements**
- Gas optimization
- Additional features
- Batch operations
- Multi-signature support
- Emergency pause mechanisms

#### **Security & Testing**
- Additional unit tests
- Integration tests
- Security audits
- Penetration testing
- Gas usage analysis

#### **Documentation**
- Tutorial videos
- API documentation improvements
- Architecture diagrams
- Use case examples
- Translation to other languages

### **Code Guidelines**
- Follow existing code style
- Write clear commit messages
- Add tests for new features
- Update documentation as needed
- Keep PRs focused and atomic

**Questions?** Open an issue or start a discussion!

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Built With

- [Hardhat](https://hardhat.org/) - Ethereum development environment
- [React](https://reactjs.org/) - Frontend framework
- [OpenZeppelin](https://openzeppelin.com/) - Smart contract library
- [ethers.js](https://docs.ethers.org/) - Blockchain interaction library

---

## 📞 Contact & Support

- **Bug Reports:** [GitHub Issues](https://github.com/yourusername/medtrace/issues)
- **Questions:** [GitHub Discussions](https://github.com/yourusername/medtrace/discussions)

**Developed by:** ZHANG Jiachen | [LinkedIn][https://www.linkedin.com/in/carsonzhangjc/] | [Email][e1520372@u.nus.edu]

---

## ⭐ Star this repository if you find it helpful!

**Combat counterfeit drugs. Save lives. Use MedTrace.**

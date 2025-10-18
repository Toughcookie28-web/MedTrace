# MedTrace System Architecture

Complete technical architecture and workflow diagrams for the MedTrace pharmaceutical supply chain tracking system.

---

## 🏗️ High-Level Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Frontend (React)                          │
│  - Role-based dashboards (Manufacturer/Distributor/Pharmacist)  │
│  - QR code generation and scanning                              │
│  - Public verification page (no wallet required)                │
│  - Web3 wallet integration (MetaMask)                           │
│                                                                  │
│  Port: 5174                                                      │
└─────────────────┬────────────────────────────────────────────────┘
                  │ HTTP/REST API
┌─────────────────▼────────────────────────────────────────────────┐
│                    Backend API (Express)                         │
│  - RESTful API (8 endpoints)                                    │
│  - Real-time blockchain event indexer                           │
│  - Server-Sent Events (SSE) stream                              │
│  - Pagination support                                           │
│  - Multi-network support (localhost/testnet/mainnet)           │
│                                                                  │
│  Port: 3001                                                      │
└─────────────────┬────────────────────────────────────────────────┘
                  │ ethers.js v6
┌─────────────────▼────────────────────────────────────────────────┐
│              Smart Contracts (Solidity 0.8.20)                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 1. StakeholderRegistry                                   │   │
│  │    - Role management (Manufacturer/Distributor/Pharmacist)  │
│  │    - Verifiable credential storage                       │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 2. DigitalBatch (ERC-721 NFT)                            │   │
│  │    - Unique batch identity                               │   │
│  │    - Immutable token URIs                                │   │
│  │    - Enumerable for discovery                            │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 3. PartnershipRegistry                                   │   │
│  │    - Recursive trust chain                               │   │
│  │    - Partner vouching                                    │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 4. TrackAndTrace                                         │   │
│  │    - Custody transfer orchestration                      │   │
│  │    - Receipt acknowledgment                              │   │
│  │    - Custody history tracking                            │   │
│  │──────────────────────────────────────────────────────────│   │
│  │ 5. SupplyChainEvents                                     │   │
│  │    - IoT data logging                                    │   │
│  │    - Cryptographic signatures                            │   │
│  │    - Event history retrieval                             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Blockchain: Ethereum-compatible (Hardhat/Testnet/Mainnet)      │
│  Port: 8545 (local)                                              │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Supply Chain Workflow

### **Complete Batch Journey**

```
┌──────────────┐      ┌──────────────┐      ┌──────────────┐
│ Manufacturer │─────▶│ Distributor  │─────▶│  Pharmacist  │
└──────────────┘      └──────────────┘      └──────────────┘
       │                     │                      │
       ▼                     ▼                      ▼
  [Mint NFT]           [Receive &            [Receive &
  [Log IoT Data]        Acknowledge]          Acknowledge]
  [Transfer]           [Log IoT Data]        [Log IoT Data]
                       [Transfer]
```

### **Detailed Workflow Steps**

```
1. MANUFACTURER
   ├─ Apply for credential (government verification)
   ├─ Vouch for distributor partner
   ├─ Mint batch as NFT (ERC-721)
   ├─ Log IoT sensor data (temperature, location)
   └─ Transfer custody to distributor

2. DISTRIBUTOR
   ├─ Scan QR code to verify batch
   ├─ Acknowledge receipt on-chain
   ├─ Log delivery conditions
   ├─ Vouch for pharmacist partner
   └─ Transfer custody to pharmacist

3. PHARMACIST
   ├─ Scan QR code to verify batch
   ├─ Acknowledge receipt on-chain
   ├─ Log final storage conditions
   └─ Ready for patient dispensing

4. PUBLIC VERIFICATION (Anyone)
   ├─ Scan QR code (no wallet needed)
   ├─ View complete custody history
   ├─ See all IoT logs with timestamps
   └─ Verify cryptographic signatures
```

---

## 📊 Smart Contract Interactions

```
┌─────────────────────────────────────────────────────────────┐
│                    Contract Dependencies                    │
└─────────────────────────────────────────────────────────────┘

StakeholderRegistry
   │
   ├──► Provides role verification to:
   │       • PartnershipRegistry (check if voucher has credential)
   │       • DigitalBatch (check if minter is manufacturer)
   │       • TrackAndTrace (check stakeholder roles)
   │
   └──► Stores verifiable credentials

DigitalBatch (ERC-721)
   │
   ├──► Managed by TrackAndTrace as custody manager
   ├──► Provides token ownership data
   └──► Enforces mint restrictions (only manufacturers)

PartnershipRegistry
   │
   ├──► Verifies trust chains
   ├──► Auto-assigns roles to vouched partners
   └──► Tracks vouching relationships

TrackAndTrace
   │
   ├──► Orchestrates NFT transfers (calls DigitalBatch)
   ├──► Tracks custody history
   ├──► Requires acknowledgment before completion
   └──► Emits custody transfer events

SupplyChainEvents
   │
   ├──► Stores IoT sensor data
   ├──► Verifies cryptographic signatures
   └──► Provides event history per batch
```

---

## 📁 Project Structure

```
medtrace/
├── packages/
│   ├── contracts/                    # Smart contracts
│   │   ├── contracts/
│   │   │   ├── StakeholderRegistry.sol
│   │   │   ├── DigitalBatch.sol
│   │   │   ├── PartnershipRegistry.sol
│   │   │   ├── TrackAndTrace.sol
│   │   │   └── SupplyChainEvents.sol
│   │   ├── scripts/
│   │   │   ├── deploy.ts
│   │   │   └── register-manufacturers.ts
│   │   ├── test/
│   │   └── hardhat.config.ts
│   │
│   ├── backend/                      # Backend API
│   │   ├── src/
│   │   │   ├── index.ts             # Express server
│   │   │   ├── config.ts            # Multi-network config
│   │   │   ├── contracts/           # Contract manager
│   │   │   ├── services/
│   │   │   │   └── eventIndexer.ts  # Real-time indexer
│   │   │   └── routes/
│   │   │       └── api.ts           # REST endpoints
│   │   └── package.json
│   │
│   └── frontend/                     # React frontend
│       ├── src/
│       │   ├── App.tsx
│       │   ├── contexts/
│       │   │   ├── Web3Context.tsx
│       │   │   └── AuthContext.tsx
│       │   ├── pages/
│       │   │   ├── Dashboard.tsx
│       │   │   └── VerifyBatch.tsx
│       │   ├── components/
│       │   │   ├── Manufacturer/
│       │   │   ├── Distributor/
│       │   │   ├── Pharmacist/
│       │   │   └── common/
│       │   │       ├── QRCodeGenerator.tsx
│       │   │       └── QRCodeScanner.tsx
│       │   ├── utils/
│       │   │   └── api.ts           # Backend API client
│       │   └── contracts/           # Contract ABIs
│       └── package.json
│
├── docs/
│   ├── SETUP.md
│   ├── ARCHITECTURE.md (this file)
│   ├── DEPLOYMENT.md
│   ├── DEMO.md
│   └── API.md
│
├── scripts/
│   └── kill-all.sh
│
├── README.md
└── LICENSE
```

---

## 🔐 Security Architecture

### **Role-Based Access Control**

```
┌──────────────────────────────────────────────────────────┐
│                    Role Hierarchy                        │
└──────────────────────────────────────────────────────────┘

Admin (Contract Owner)
  │
  └──► Can pause contracts in emergency

Manufacturer (Role = 1)
  │
  ├──► Must have verified credential
  ├──► Can mint batches (NFTs)
  ├──► Can vouch for distributors
  └──► Can log IoT events

Distributor (Role = 2)
  │
  ├──► Vouched by manufacturer
  ├──► Can acknowledge receipt
  ├──► Can vouch for pharmacists
  ├──► Can transfer to pharmacists
  └──► Can log IoT events

Pharmacist (Role = 3)
  │
  ├──► Vouched by distributor
  ├──► Can acknowledge receipt
  ├──► Can log IoT events
  └──► Final custody holder

None (Role = 0)
  │
  └──► No permissions (must be vouched to get role)
```

### **Trust Chain Verification**

```
Patient scans QR code
       │
       ▼
Verify trust chain:
       │
       ├──► Pharmacist vouched by Distributor?
       │           │
       │           ▼
       │      Distributor vouched by Manufacturer?
       │           │
       │           ▼
       │      Manufacturer has verified credential?
       │           │
       │           ▼
       └──────► ✅ Valid trust chain!
```

---

## 🌐 Network Architecture

### **Local Development**

```
Hardhat Node (localhost:8545)
   │
   ├──► Backend API (localhost:3001)
   │       │
   │       └──► Event Indexer (polls every 2s)
   │
   └──► Frontend (localhost:5174)
           │
           └──► MetaMask (localhost network)
```

### **Testnet Deployment**

```
Sepolia Testnet / Polygon Mumbai
   │
   ├──► Backend API (deployed on cloud)
   │       │
   │       └──► Event Indexer (WebSocket/polling)
   │
   └──► Frontend (deployed on Vercel/Netlify)
           │
           └──► MetaMask (testnet network)
```

### **Mainnet Deployment**

```
Ethereum Mainnet / Polygon
   │
   ├──► Backend API (production server)
   │       │
   │       └──► Event Indexer (Alchemy/Infura WebSocket)
   │
   └──► Frontend (CDN)
           │
           └──► MetaMask (mainnet)
```

---

## 📡 Real-Time Event Streaming

### **Backend Event Indexer**

```
┌─────────────────────────────────────────────────────────┐
│              Event Indexer Architecture                 │
└─────────────────────────────────────────────────────────┘

Blockchain Events
   │
   ├──► BatchMinted
   ├──► CustodyTransferred
   ├──► ReceiptAcknowledged
   ├──► EventLogged
   └──► PartnershipEstablished
       │
       ▼
   Event Indexer
   (polls every 2s)
       │
       ▼
   In-Memory Storage
   (Map<tokenId, Batch>)
       │
       ▼
   SSE Stream
       │
       ▼
   Frontend (real-time updates)
```

### **Frontend Real-Time Updates**

```
Component loads
   │
   ▼
Connect to SSE endpoint (/api/events/stream)
   │
   ▼
Listen for events:
   │
   ├──► BatchMinted → Reload batches
   ├──► CustodyTransferred → Update inventory
   ├──► ReceiptAcknowledged → Move to current inventory
   └──► EventLogged → Refresh event logs
       │
       ▼
   UI updates instantly (no page refresh!)
```

---

## 🎯 Data Flow Examples

### **Example 1: Minting a Batch**

```
1. User clicks "Mint Batch" (Frontend)
2. Frontend calls stakeholderRegistry.getRole(account)
3. If role === 1 (Manufacturer):
   a. Frontend calls digitalBatch.mintBatch()
   b. Transaction sent to blockchain
   c. BatchMinted event emitted
   d. Backend event indexer catches event
   e. Backend stores batch in memory
   f. Backend pushes event via SSE
   g. Frontend receives SSE event
   h. Frontend reloads batches
   i. UI shows new batch instantly
```

### **Example 2: Transferring Custody**

```
1. Manufacturer selects batch + distributor
2. Frontend calls trackAndTrace.transferCustody()
3. TrackAndTrace calls digitalBatch.transferFrom()
4. CustodyTransferred event emitted
5. Backend indexes event
6. Manufacturer's UI: batch removed from inventory
7. Distributor's UI: batch appears in "Incoming Shipments"
8. Shipment History shows "In Transit"
```

### **Example 3: Public Verification**

```
1. Patient scans QR code
2. QR code contains: /verify?tokenId=1
3. Frontend calls backend API (no wallet!)
4. Backend calls blockchain contracts:
   a. getBatch(tokenId) → batch details
   b. getCustodyHistory(tokenId) → all transfers
   c. getEvents(tokenId) → all IoT logs
5. Backend returns combined data
6. Frontend displays complete history
7. Patient sees full journey + authenticity proof
```

---

## 🔧 Technology Stack Details

### **Smart Contracts**
- Language: Solidity 0.8.20
- Framework: Hardhat 2.22.17
- Standards: OpenZeppelin Contracts 5.1.0
- Testing: Hardhat (203 tests total)

### **Backend**
- Runtime: Node.js
- Framework: Express.js
- Language: TypeScript 5.x
- Blockchain: ethers.js v6.15.0
- Real-time: Server-Sent Events (SSE)

### **Frontend**
- Framework: React 18.3.1
- Language: TypeScript 5.5.3
- Build Tool: Vite 7.1.9
- Routing: React Router v7
- Blockchain: ethers.js v6.15.0
- Wallet: MetaMask integration

---

## 📈 Scalability Considerations

### **Current Limitations (Local Development)**
- In-memory storage (backend restarts = data loss)
- Polling-based indexing (2-second latency)
- Single backend instance

### **Production Improvements**
- Database for persistent storage (PostgreSQL)
- WebSocket-based event listening (instant updates)
- Horizontal scaling with load balancers
- Caching layer (Redis)
- CDN for frontend assets

---

## 🛡️ Security Best Practices

- ✅ Role-based access control on all functions
- ✅ Cryptographic signatures for IoT data (EIP-191)
- ✅ Immutable token URIs prevent metadata tampering
- ✅ Pausable contracts for emergency stops
- ✅ No private keys in code (environment variables only)
- ✅ Input validation on all contract functions
- ✅ Reentrancy guards on state-changing functions

---

**For detailed setup instructions, see [SETUP.md](SETUP.md)**
**For API reference, see [API.md](API.md)**
**For deployment guide, see [DEPLOYMENT.md](DEPLOYMENT.md)**

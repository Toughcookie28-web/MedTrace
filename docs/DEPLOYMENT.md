# MedTrace Deployment & API Guide

Complete guide for deploying MedTrace smart contracts and setting up the backend API infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Local Development Setup](#local-development-setup)
4. [Contract Deployment](#contract-deployment)
5. [Backend API Setup](#backend-api-setup)
6. [API Documentation](#api-documentation)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

- **Node.js**: v18+ (with npm)
- **Git**: Latest version
- **MetaMask**: Browser extension (for testing)

### Dependencies Installation

```bash
# Navigate to project root
cd /home/tough/Blockchain_Project

# Install contract dependencies
cd packages/contracts
npm install

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies (if needed)
cd ../frontend
npm install
```

---

## Project Structure

```
Blockchain_Project/
├── packages/
│   ├── contracts/               # Smart contracts
│   │   ├── contracts/           # Solidity source files
│   │   │   ├── StakeholderRegistry.sol
│   │   │   ├── DigitalBatch.sol
│   │   │   └── TrackAndTrace.sol
│   │   ├── scripts/             # Deployment scripts
│   │   │   ├── deploy.ts        # Main deployment
│   │   │   ├── setup-local.ts   # Local dev setup
│   │   │   └── verify-deployment.ts
│   │   ├── deployments/         # Deployment artifacts (generated)
│   │   └── package.json
│   │
│   ├── backend/                 # Node.js API backend
│   │   ├── src/
│   │   │   ├── index.ts         # Express server
│   │   │   ├── config.ts        # Configuration
│   │   │   ├── contracts/       # Contract interaction
│   │   │   ├── routes/          # API endpoints
│   │   │   ├── services/        # Event indexer
│   │   │   └── types/           # TypeScript types
│   │   ├── .env                 # Environment config
│   │   └── package.json
│   │
│   └── frontend/                # React frontend
│       └── ...
│
└── .claude/
    └── CLAUDE.md                # Project constitution
```

---

## Local Development Setup

### Step 1: Start Hardhat Local Network

In one terminal:

```bash
cd packages/contracts
npm run node
```

This starts a local Hardhat network on `http://127.0.0.1:8545` with 20 pre-funded accounts.

**Keep this terminal running!**

### Step 2: Deploy and Setup Contracts

In a **new terminal**:

```bash
cd packages/contracts
npm run setup-local
```

This script will:
- Deploy StakeholderRegistry, DigitalBatch, and TrackAndTrace contracts
- Set TrackAndTrace as custody manager
- Register 6 test stakeholders (2 manufacturers, 2 distributors, 2 pharmacists)
- Mint 3 sample pharmaceutical batches
- Create sample custody transfers
- Log sample supply chain events
- Save configuration to `deployments/localhost.json`

**Expected Output:**

```
========================================
  MedTrace Local Setup
========================================

Network: localhost
Chain ID: 31337
Available accounts: 20

Step 1: Deploying contracts...
  ✓ StakeholderRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  ✓ DigitalBatch:        0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  ✓ TrackAndTrace:       0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
  ✓ Custody manager configured

...

========================================
     LOCAL SETUP COMPLETE!
========================================
```

### Step 3: Configure Backend Environment

```bash
cd packages/backend

# Copy environment template
cp .env.example .env

# Edit .env with deployed addresses
nano .env  # or use your preferred editor
```

Update the `.env` file with the contract addresses from Step 2:

```env
# Network Selection
NETWORK=localhost

# Localhost Network
LOCALHOST_RPC_URL=http://127.0.0.1:8545
LOCALHOST_STAKEHOLDER_REGISTRY=0x5FbDB2315678afecb367f032d93F642f64180aa3
LOCALHOST_DIGITAL_BATCH=0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
LOCALHOST_TRACK_AND_TRACE=0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0
```

### Step 4: Start Backend API

```bash
cd packages/backend
npm run dev
```

**Expected Output:**

```
========================================
  MedTrace Backend API
========================================

Step 1: Validating configuration...
✓ Configuration valid

Backend Configuration
Server:
  Host:          localhost
  Port:          3001
  Environment:   development

Network:
  Name:          localhost
  Chain ID:      31337

Contracts:
  StakeholderRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  DigitalBatch:        0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  TrackAndTrace:       0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

========================================
     SERVER RUNNING
========================================

Server listening on: http://localhost:3001
```

### Step 5: Test API

```bash
# Health check
curl http://localhost:3001/api/health

# Get all batches
curl http://localhost:3001/api/batches

# Get specific batch
curl http://localhost:3001/api/batches/1

# Get batch custody history
curl http://localhost:3001/api/batches/1/custody

# Get batch events
curl http://localhost:3001/api/batches/1/events
```

---

## Contract Deployment

### Deployment to Localhost

For local testing (after running `npm run node`):

```bash
cd packages/contracts
npm run deploy:localhost
```

### Deployment to Sepolia Testnet

1. **Configure Hardhat**

Edit `packages/contracts/hardhat.config.ts`:

```typescript
sepolia: {
  type: "http",
  chainType: "l1",
  url: configVariable("SEPOLIA_RPC_URL"),
  accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
},
```

2. **Set Environment Variables**

Create `.env` in `packages/contracts`:

```env
SEPOLIA_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/YOUR_ALCHEMY_KEY
SEPOLIA_PRIVATE_KEY=your_private_key_here
```

3. **Deploy**

```bash
npm run deploy:sepolia
```

4. **Verify Deployment**

```bash
npm run verify:sepolia
```

### Deployment Output

The deployment script creates a JSON file in `packages/contracts/deployments/`:

```json
{
  "network": "localhost",
  "chainId": 31337,
  "deployer": "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  "timestamp": "2025-10-11T03:15:00.000Z",
  "contracts": {
    "StakeholderRegistry": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    "DigitalBatch": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
    "TrackAndTrace": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  },
  "initialStakeholders": [...]
}
```

---

## Backend API Setup

### Configuration

The backend uses environment variables for configuration. All settings are in `.env`:

```env
# Server
PORT=3001
HOST=localhost
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# Network
NETWORK=localhost

# Contract Addresses
LOCALHOST_RPC_URL=http://127.0.0.1:8545
LOCALHOST_STAKEHOLDER_REGISTRY=0x...
LOCALHOST_DIGITAL_BATCH=0x...
LOCALHOST_TRACK_AND_TRACE=0x...

# Event Indexer
INDEXER_ENABLED=true
INDEXER_POLLING_INTERVAL=5000
INDEXER_START_BLOCK=0

# API Settings
MAX_PAGE_SIZE=100
DEFAULT_PAGE_SIZE=20
```

### Event Indexer

The backend includes an event indexer that:
- Listens to `BatchMinted`, `CustodyTransferred`, and `EventLogged` events
- Stores events in memory (MVP - can be replaced with database)
- Provides efficient querying with pagination
- Polls for new events every 5 seconds (configurable)

To disable indexing:

```env
INDEXER_ENABLED=false
```

### Running in Production

```bash
cd packages/backend

# Build TypeScript
npm run build

# Run compiled code
npm run start:prod
```

---

## API Documentation

### Base URL

```
http://localhost:3001/api
```

### Response Envelope

All collection endpoints (batches, events, custody, stakeholder queries) return a standard success envelope:

```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "total": 3,
    "offset": 0,
    "limit": 20,
    "hasMore": false
  },
  "timestamp": 1728615900000
}
```

Error responses follow the same structure with `success: false` and an `error` object containing `message`, optional `code`, and optional `details`.

### Endpoints

#### Health Check

**GET** `/api/health`

Returns server health status and contract deployment information.

**Response:**

```json
{
  "status": "healthy",
  "version": "1.0.0",
  "network": {
    "name": "localhost",
    "chainId": 31337,
    "connected": true
  },
  "contracts": {
    "stakeholderRegistry": {
      "address": "0x5FbDB2315678afecb367f032d93F642f64180aa3",
      "deployed": true
    },
    "digitalBatch": {
      "address": "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
      "deployed": true
    },
    "trackAndTrace": {
      "address": "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
      "deployed": true
    }
  },
  "timestamp": 1728615900000
}
```

---

#### Get All Batches

**GET** `/api/batches?offset=0&limit=20`

Returns paginated list of all pharmaceutical batches.

**Query Parameters:**
- `offset` (number, optional): Starting index (default: 0)
- `limit` (number, optional): Number of results (default: 20, max: 100)

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "tokenId": 1,
      "owner": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "tokenURI": "https://pharmaledger-api.example.com/metadata/ASP-2025-001",
      "manufacturer": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "mintedAt": 1728615600,
      "mintedAtBlock": 12,
      "custodyHistory": [...],
      "events": [...]
    }
  ],
  "pagination": {
    "total": 3,
    "offset": 0,
    "limit": 20,
    "hasMore": false
  },
  "timestamp": 1728615900000
}
```

---

#### Get Batch Details

**GET** `/api/batches/:tokenId`

Returns detailed information about a specific batch.

**Parameters:**
- `tokenId` (number): The batch token ID

**Response:**

```json
{
  "success": true,
  "data": {
    "tokenId": 1,
    "owner": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "tokenURI": "https://pharmaledger-api.example.com/metadata/ASP-2025-001",
    "manufacturer": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "mintedAt": 1728615600,
    "mintedAtBlock": 12,
    "custodyHistory": [
      {
        "from": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
        "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
        "timestamp": 1728615650,
        "blockNumber": 15,
        "transactionHash": "0x..."
      }
    ],
    "events": [...]
  },
  "timestamp": 1728615900000
}
```

---

#### Get Batch Events

**GET** `/api/batches/:tokenId/events?offset=0&limit=20`

Returns paginated supply chain events for a batch.

**Parameters:**
- `tokenId` (number): The batch token ID

**Query Parameters:**
- `offset` (number, optional): Starting index
- `limit` (number, optional): Number of results

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "logger": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "timestamp": 1728615700,
      "eventData": "{\"eventType\":\"temperature_check\",\"temperature\":{\"value\":4.2,\"unit\":\"celsius\",\"inRange\":true}}",
      "blockNumber": 18,
      "transactionHash": "0x..."
    }
  ],
  "pagination": {
    "total": 1,
    "offset": 0,
    "limit": 20,
    "hasMore": false
  },
  "timestamp": 1728615900000
}
```

---

#### Get Custody History

**GET** `/api/batches/:tokenId/custody?offset=0&limit=20`

Returns paginated custody transfer history for a batch.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "from": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "to": "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
      "timestamp": 1728615650,
      "blockNumber": 15,
      "transactionHash": "0x..."
    }
  ],
  "pagination": {
    "total": 2,
    "offset": 0,
    "limit": 20,
    "hasMore": false
  },
  "timestamp": 1728615900000
}
```

---

#### Get Stakeholder Role

**GET** `/api/stakeholders/:address/role`

Returns the role of a stakeholder address.

**Parameters:**
- `address` (string): Ethereum address (0x...)

**Response:**

```json
{
  "success": true,
  "data": {
    "address": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
    "role": 1,
    "roleName": "Manufacturer"
  },
  "timestamp": 1728615900000
}
```

**Roles:**
- `0`: None
- `1`: Manufacturer
- `2`: Distributor
- `3`: Pharmacist

---

#### Get Stakeholder Batches

**GET** `/api/stakeholders/:address/batches`

Returns all batches owned by a stakeholder.

**Response:**

```json
{
  "success": true,
  "data": [
    {
      "tokenId": 3,
      "owner": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "tokenURI": "https://pharmaledger-api.example.com/metadata/LIS-2025-003",
      "manufacturer": "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC",
      "mintedAt": 1728615600,
      "mintedAtBlock": 14,
      "custodyHistory": [],
      "events": []
    }
  ],
  "timestamp": 1728615900000
}
```

---

#### Get Indexer Status

**GET** `/api/indexer/status`

Returns event indexer status and statistics.

**Response:**

```json
{
  "success": true,
  "data": {
    "isIndexing": true,
    "lastIndexedBlock": 25,
    "totalBatches": 3,
    "totalEvents": 2,
    "totalTransfers": 3
  },
  "timestamp": 1728615900000
}
```

---

### Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": {
    "message": "Batch not found",
    "code": "BATCH_NOT_FOUND",
    "details": null
  },
  "timestamp": 1728615900000
}
```

**Common Error Codes:**
- `INVALID_TOKEN_ID`: Invalid batch tokenId parameter
- `BATCH_NOT_FOUND`: Batch does not exist
- `INVALID_ADDRESS`: Invalid Ethereum address format
- `FETCH_ERROR`: Error fetching data from contract
- `SERVER_ERROR`: Internal server error

---

## Troubleshooting

### Issue: "Contract addresses not configured"

**Solution:** Ensure your `.env` file in `packages/backend` has the correct contract addresses from deployment.

```bash
# Check deployment addresses
cat packages/contracts/deployments/localhost.json

# Update backend .env
nano packages/backend/.env
```

---

### Issue: "Cannot connect to network"

**Solution:** Ensure Hardhat node is running:

```bash
# Terminal 1
cd packages/contracts
npm run node

# Should see: Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/
```

---

### Issue: "Event indexer not indexing"

**Solution:** Check indexer is enabled in `.env`:

```env
INDEXER_ENABLED=true
```

Restart backend:

```bash
cd packages/backend
npm run dev
```

---

### Issue: Port already in use

**Solution:** Change port in `.env`:

```env
PORT=3002  # or any available port
```

Or kill existing process:

```bash
# Find process using port 3001
lsof -i :3001

# Kill process
kill -9 <PID>
```

---

### Issue: CORS errors in frontend

**Solution:** Update CORS origin in backend `.env`:

```env
CORS_ORIGIN=http://localhost:5173
```

Ensure frontend is running on the specified port.

---

## Next Steps

1. **Frontend Integration**
   - Update frontend `.env` with contract addresses
   - Configure ethers.js provider with backend API URL
   - Implement role-based UI rendering

2. **Production Deployment**
   - Deploy contracts to Polygon Amoy testnet
   - Configure backend for production network
   - Set up database for event storage (replace in-memory)
   - Configure SSL/TLS for API
   - Set up monitoring and logging

3. **Testing**
   - Run contract tests: `cd packages/contracts && npm test`
   - Test API endpoints with sample data
   - Test frontend workflows end-to-end

---

## Support

For issues or questions:
- Check `.claude/CLAUDE.md` for project constitution
- Review contract documentation in Solidity files
- Check backend logs for error messages

---

## Files Created

### Deployment Scripts (`packages/contracts/scripts/`)
- `deploy.ts` - Main deployment script
- `setup-local.ts` - Local development setup with test data
- `verify-deployment.ts` - Post-deployment verification

### Backend Infrastructure (`packages/backend/src/`)
- `index.ts` - Express server with middleware and routes
- `config.ts` - Configuration management
- `contracts/index.ts` - Contract interaction layer
- `routes/api.ts` - REST API endpoints
- `services/eventIndexer.ts` - Event indexing service
- `types/index.ts` - TypeScript type definitions

### Configuration Files
- `packages/backend/.env.example` - Environment template
- `packages/backend/tsconfig.json` - TypeScript configuration
- Updated `package.json` scripts in both packages

---

**Deployment workflow complete!** Your MedTrace blockchain infrastructure is ready for development and testing.

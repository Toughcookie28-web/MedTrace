# MedTrace Local Testing Guide

Complete guide for testing the MedTrace pharmaceutical supply chain application locally.

---

## 📋 Table of Contents

1. [Quick Start](#-quick-start-tldr)
2. [System Overview](#-system-overview)
3. [Prerequisites](#-prerequisites)
4. [Setup Instructions](#-setup-instructions)
5. [Testing Workflows](#-testing-workflows)
6. [Troubleshooting](#-troubleshooting)
7. [Clean Restart & System Reset](#-clean-restart--system-reset)
8. [API Reference](#-api-reference)

---

## 🚀 Quick Start (TL;DR)

**For experienced developers:**

```bash
# Terminal 1: Start Hardhat blockchain
cd /home/tough/Blockchain_Project/packages/contracts
npx hardhat node

# Terminal 2: Deploy contracts (in a new terminal)
cd /home/tough/Blockchain_Project/packages/contracts
npx hardhat run scripts/deploy.ts --network localhost

# Pre-register manufacturer roles (for UI to show credential button)
npx hardhat run scripts/register-manufacturers.ts --network localhost

# Terminal 3: Start backend
cd /home/tough/Blockchain_Project/packages/backend
npm run dev

# Terminal 4: Start frontend
cd /home/tough/Blockchain_Project/packages/frontend
npm run dev
```

**Then:**
1. Import test accounts into MetaMask (see accounts below)
2. Open http://localhost:5174
3. Start testing!

---

## 👥 Test Accounts Reference

Hardhat provides 20 test accounts with 10,000 ETH each. Here are the accounts you'll use for testing:

### Primary Test Accounts (Import These First)

| Account # | Initial Role | Intended Use | Company Name | Address | Private Key |
|-----------|--------------|--------------|--------------|---------|-------------|
| **0** | 🔑 **Admin** | Deployer & System Admin | System Admin | `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266` | `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80` |
| **1** | 🏭 **Manufacturer*** | Pre-registered Manufacturer | PharmaCorp | `0x70997970C51812dc3A010C7d01b50e0d17dc79C8` | `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d` |
| **2** | 🏭 **Manufacturer*** | Pre-registered Manufacturer | MediTech Labs | `0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC` | `0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a` |
| **3** | 🏭 **Manufacturer*** | Pre-registered Manufacturer | Global Pharma Inc | `0x90F79bf6EB2c4f870365E785982E1f101E93b906` | `0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6` |
| **4** | **None** | Future Distributor** | (Not yet assigned) | `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` | `0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a` |
| **5** | **None** | Future Pharmacist** | (Not yet assigned) | `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` | `0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba` |

**Legend:**
- \* = Pre-registered role (via `register-manufacturers.ts` script), still needs to apply for credentials via UI
- \*\* = **Starts with Role: None**. Gets role **automatically assigned** when vouched for by an upstream stakeholder (see [PartnershipRegistry.sol:100](packages/contracts/contracts/PartnershipRegistry.sol#L100))

### Additional Accounts (Optional)

These accounts can be used for advanced testing scenarios:

| Account # | Address | Private Key |
|-----------|---------|-------------|
| **6** | `0x976EA74026E726554db657fA54763abd0C3a0aa9` | `0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e` |
| **7** | `0x14dC79964da2C08b23698B3D3cc7Ca32193d9955` | `0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356` |
| **8** | `0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f` | `0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97` |
| **9** | `0xa0Ee7A142d267C1f36714E4a8F75612F20a79720` | `0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6` |
| **10** | `0xBcd4042DE499D14e55001CcbB24a551F3b954096` | `0xf214f2b2cd398c806f84e317254e0f0b801d0643303237d97a22a48e01628897` |
| **11** | `0x71bE63f3384f5fb98995898A86b02Fb2426c5788` | `0x701b615bbdfb9de65240bc28bd21bbc0d996645a3dd57e7b12bc2bdf6f192c82` |
| **12** | `0xFABB0ac9d68B0B445fB7357272Ff202C5651694a` | `0xa267530f49f8280200edf313ee7af6b827f2a8bce2897751d06a843f644967b1` |
| **13** | `0x1CBd3b2770909D4E10f157caBC84C7264073C9Ec` | `0x47c99abed3324a2707c28affff1267e45918ec8c3f20b8aa892e8b065d2942dd` |
| **14** | `0xdF3e18d64BC6A983f673Ab319CCaE4f1a57C7097` | `0xc526ee95bf44d8fc405a158bb884d9d1238d99f0612e9f33d006bb0789009aaa` |
| **15** | `0xcd3B766CCDd6AE721141F452C550Ca635964ce71` | `0x8166f546bab6da521a8369cab06c5d2b9e46670292d85c875ee9ec20e84ffb61` |
| **16** | `0x2546BcD3c84621e976D8185a91A922aE77ECEc30` | `0xea6c44ac03bff858b476bba40716402b03e41b8e97e276d1baec7c37d42484a0` |
| **17** | `0xbDA5747bFD65F08deb54cb465eB87D40e51B197E` | `0x689af8efa8c651a91ad287602527f3af2fe9f6501a7ac4b061667b5a93e037fd` |
| **18** | `0xdD2FD4581271e230360230F9337D5c0430Bf44C0` | `0xde9be858da4a475276426320d5e9262ecfc3ba460bfac56360bfa6c4c28b4ee0` |
| **19** | `0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199` | `0xdf57089febbacf7ba0bc227dafbffa9fc08a93fdc68e1e42411a14efcf23656e` |

### Quick Import to MetaMask

**To import an account:**
1. Open MetaMask → Click account icon (top right)
2. Select **"Import Account"**
3. Choose **"Private Key"**
4. Paste private key (e.g., for Account 1: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`)
5. Click **"Import"**
6. **Optional but recommended:** Rename the account:
   - Click the three dots next to account name
   - Select "Account details"
   - Click pencil icon to edit name (e.g., "Manufacturer - PharmaCorp")

### Role Assignment Flow

Understanding how roles are assigned:

```
┌─────────────────────────────────────────────────────────────────┐
│  MANUFACTURER REGISTRATION FLOW                                 │
├─────────────────────────────────────────────────────────────────┤
│  1. Pre-register role via script (Step 3)                       │
│     → Assigns "Manufacturer" role to account                    │
│     → UI shows "Apply for Credential" button                    │
│                                                                  │
│  2. Apply for credential via UI                                 │
│     → Upload license document                                   │
│     → Auto-approved (in production: admin reviews)              │
│     → Can now vouch for distributors                            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  DISTRIBUTOR REGISTRATION FLOW (AUTOMATIC)                      │
├─────────────────────────────────────────────────────────────────┤
│  1. Manufacturer vouches for distributor                        │
│     → Distributor role AUTOMATICALLY assigned                   │
│     → No manual acceptance needed                               │
│     → Distributor can immediately start operations              │
│                                                                  │
│  2. Distributor can now vouch for pharmacists                   │
│     → Creates recursive trust chain                             │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│  PHARMACIST REGISTRATION FLOW (AUTOMATIC)                       │
├─────────────────────────────────────────────────────────────────┤
│  1. Distributor vouches for pharmacist                          │
│     → Pharmacist role AUTOMATICALLY assigned                    │
│     → Trust chain: Pharmacist → Distributor → Manufacturer     │
└─────────────────────────────────────────────────────────────────┘
```

### Recommended Testing Setup

For a complete testing workflow, import these 6 accounts in this order:

1. **Account 0** (Admin) - For debugging and emergency operations
2. **Account 1** (Manufacturer - PharmaCorp) - Primary manufacturer
3. **Account 2** (Manufacturer - MediTech Labs) - Secondary manufacturer for multi-manufacturer testing
4. **Account 3** (Manufacturer - Global Pharma) - Third manufacturer
5. **Account 4** (Distributor - TBD) - Gets role when vouched by Account 1
6. **Account 5** (Pharmacist - TBD) - Gets role when vouched by Account 4

**Each account has 10,000 ETH** - more than enough for unlimited testing!

### Important Notes

- **Account 0 (Admin)**: Deploys contracts and has special permissions. Don't use for regular operations.
- **Accounts 1-3 (Manufacturers)**: Pre-registered but need to apply for credentials via UI before vouching.
- **Accounts 4-5 (Distributor/Pharmacist)**: Start unregistered, get roles when vouched for.
- **Accounts 6-19**: Available for testing multiple supply chain scenarios, additional manufacturers, or stress testing.

### Security Note

⚠️ **WARNING**: These are PUBLIC test keys from Hardhat. **NEVER** use these accounts on mainnet or with real funds. They are well-known and anyone can access them!

---

## 🏗 System Overview

### Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Hardhat Node   │────▶│  Smart Contracts │◀────│   Frontend      │
│  (Blockchain)   │     │  (5 Contracts)   │     │   (React)       │
│   Port 8545     │     └─────────────────┘     │  Port 5174      │
└─────────────────┘              │               └─────────────────┘
                                 │                        │
                                 ▼                        ▼
                        ┌─────────────────┐
                        │  Backend API    │
                        │  + Event Indexer│
                        │   Port 3001     │
                        └─────────────────┘
```

### Smart Contracts (No Shippers!)

The system has been simplified - **shipper functionality has been completely removed**:

1. **StakeholderRegistry** - Role management (Manufacturer, Distributor, Pharmacist)
2. **DigitalBatch** - ERC-721 NFTs representing pharmaceutical batches
3. **TrackAndTrace** - Direct custody transfers (sender initiates, receiver acknowledges)
4. **SupplyChainEvents** - Event logging for temperature, location, etc.
5. **PartnershipRegistry** - Verifiable credentials and recursive trust chain

**Key Change:** Transfers are now **direct** (Manufacturer → Distributor → Pharmacist) without multi-signature shippers.

### Real-Time Updates Architecture

The system provides instant UI updates without page refreshes using a **dual-layer approach**:

1. **Backend Event Indexer (Polling):**
   - Polls Hardhat blockchain every **1 second** for new events
   - Uses `queryFilter()` to avoid Hardhat/ethers v6 filter bugs
   - Indexes BatchMinted, CustodyTransferred, EventLogged, and ReceiptAcknowledged events
   - Stores indexed data in memory for fast API queries

2. **Frontend Real-Time Updates (Server-Sent Events):**
   - Frontend connects to `/api/events/stream` SSE endpoint
   - Backend **pushes** new events instantly to all connected clients
   - No frontend polling needed - events arrive within **1 second** of blockchain confirmation
   - Works even when browser tab is in background

**Why This Approach?**
- Avoids the `TypeError: results is not iterable` error from ethers.js filter-based listeners
- Provides near-instant updates (1-second latency)
- Minimal resource usage compared to direct filter subscriptions
- Compatible with Hardhat local development environment

---

## 📦 Prerequisites

- **Node.js**: v22.20.0 or compatible
- **npm**: Latest version
- **MetaMask**: Browser extension installed
- **4 Terminal Windows**
- **Operating System**: Linux, macOS, or WSL2 on Windows

---

## 🛠 Setup Instructions

### Step 1: Start Hardhat Node

**Terminal 1:**

```bash
cd /home/tough/Blockchain_Project/packages/contracts
npx hardhat node
```

**Expected Output:**
```
Started HTTP and WebSocket JSON-RPC server at http://127.0.0.1:8545/

Accounts
========
Account #0: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 (10000 ETH)
Private Key: 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

Account #1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 (10000 ETH)
Private Key: 0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d
...
```

**✅ Keep this terminal running!** This is your local blockchain.

---

### Step 2: Deploy Contracts

**Terminal 2:**

Wait for Terminal 1 to fully start, then:

```bash
cd /home/tough/Blockchain_Project/packages/contracts
npx hardhat run scripts/deploy.ts --network localhost
```

**Expected Output:**
```
========================================
   PharmaLedger Contract Deployment
========================================

Step 1: Deploying StakeholderRegistry...
✓ StakeholderRegistry deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3

Step 2: Deploying DigitalBatch...
✓ DigitalBatch deployed to: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

Step 3: Deploying PartnershipRegistry...
✓ PartnershipRegistry deployed to: 0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0

Step 4: Deploying TrackAndTrace...
✓ TrackAndTrace deployed to: 0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

Step 5: Deploying SupplyChainEvents...
✓ SupplyChainEvents deployed to: 0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9

========================================
     DEPLOYMENT SUCCESSFUL!
========================================
```

**Note:** Contract addresses are automatically saved to `.env` files.

---

### Step 3: Pre-Register Manufacturer Roles

**Still in Terminal 2:**

This step assigns the Manufacturer role to 3 test accounts so the UI knows to show them the "Apply for Credential" button.

```bash
npx hardhat run scripts/register-manufacturers.ts --network localhost
```

**Expected Output:**
```
========================================
  Pre-Registering Manufacturer Roles
========================================

Accounts to pre-register as Manufacturers:
  Account 1: 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  Account 2: 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC
  Account 3: 0x90F79bf6EB2c4f870365E785982E1f101E93b906

✓ Pre-registered: PharmaCorp
✓ Pre-registered: MediTech Labs
✓ Pre-registered: Global Pharma Inc

📝 Important Notes:
  - These accounts now have the Manufacturer ROLE assigned
  - They still need to APPLY FOR CREDENTIALS via the frontend
  - The "Apply for Credential" button will now appear for these accounts
```

**Important Clarification:**
- **Role Assignment** (this script): Tells the system "this account is a Manufacturer"
- **Credential Application** (via UI): Manufacturers prove they're licensed by uploading documents
- **Vouching** (via UI): Once credentialed, manufacturers vouch for distributors → automatically registers Distributor role
- **No manual distributor/pharmacist registration needed!** They get roles when vouched for.

**You can close Terminal 2** after this step.

---

### Step 4: Start Backend API

**Terminal 3:**

The backend `.env` file should already be configured. Verify it contains the correct contract addresses:

```bash
cd /home/tough/Blockchain_Project/packages/backend
cat .env | grep LOCALHOST
```

Start the backend:

```bash
npm run dev
```

**Expected Output:**
```
========================================
  MedTrace Backend API
========================================

Server:
  Host:          localhost
  Port:          3001
  Environment:   development

Network:
  Name:          localhost
  Chain ID:      31337
  RPC URL:       http://127.0.0.1:8545

Contracts:
  StakeholderRegistry: 0x5FbDB2315678afecb367f032d93F642f64180aa3
  DigitalBatch:        0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512
  TrackAndTrace:       0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9

✓ Connected to localhost (Chain ID: 31337)
✓ All contracts verified
✓ Real-time listeners active
✓ Server started successfully

========================================
     SERVER RUNNING
========================================

Server listening on: http://localhost:3001
```

**✅ Keep this terminal running!**

---

### Step 5: Start Frontend

**Terminal 4:**

The frontend `.env` file should already be configured:

```bash
cd /home/tough/Blockchain_Project/packages/frontend
cat .env | grep VITE_
```

Start the frontend:

```bash
npm run dev
```

**Expected Output:**
```
  VITE v7.1.9  ready in 407 ms

  ➜  Local:   http://localhost:5174/
  ➜  Network: use --host to expose
```

**✅ Keep this terminal running!**

---

## 🦊 MetaMask Configuration

### 1. Add Hardhat Network

1. Open MetaMask extension
2. Click network dropdown → **Add Network** → **Add a network manually**
3. Enter:
   - **Network Name:** Hardhat Local
   - **RPC URL:** `http://127.0.0.1:8545`
   - **Chain ID:** `31337`
   - **Currency Symbol:** ETH
4. Click **Save**

### 2. Import Test Accounts

**See the comprehensive [Test Accounts Reference](#-test-accounts-reference) section above** for all 20 accounts with addresses and private keys.

**Quick start - import these 6 accounts:**
- Account 0 (Admin)
- Account 1 (Manufacturer - PharmaCorp)
- Account 2 (Manufacturer - MediTech Labs)
- Account 3 (Manufacturer - Global Pharma Inc)
- Account 4 (Future Distributor)
- Account 5 (Future Pharmacist)

**Import steps:**
1. MetaMask → Account icon → **Import Account**
2. Select **Private Key**
3. Paste private key from the [accounts table](#primary-test-accounts-import-these-first)
4. Click **Import**
5. Optional: Rename account (e.g., "Manufacturer - PharmaCorp")

---

## 🧪 Testing Workflows

### Test Workflow 1: Manufacturer Credentials & Vouching

This tests the **verifiable credentials** and **recursive trust chain** features.

#### 1.1: Manufacturer Applies for Credential

1. **Open Frontend:** http://localhost:5174
2. **Connect MetaMask** with Account 1 (Manufacturer)
3. **You should see:** "Role: Manufacturer" on dashboard
4. **Click:** "📜 Apply for Credential" button
5. **Fill out form:**
   - Upload any file (PDF, JPG, etc.) - simulates license document
   - Business Registration Number: `MFG-12345`
   - Issuing Authority: `FDA`
6. **Click:** "Apply for Credential"
7. **Approve transaction** in MetaMask
8. **Expected Result:**
   - ✅ Success message: "Credential applied successfully!"
   - ✅ Auto-approved (in real deployment, admin would approve)
   - ✅ You can now vouch for partners

**Backend Terminal (Terminal 3) should show:**
```
📝 Event: CredentialApplied - Applicant: 0x7099...
```

---

#### 1.2: Manufacturer Vouches for Distributor

1. **Stay logged in as Manufacturer** (Account 1)
2. **Click:** "🤝 Vouch for Partner" button
3. **Verify modal shows:**
   - ✅ Your Status: Verified
   - ✅ Your Role: Manufacturer
4. **Enter Partner Details:**
   - Partner Address: `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` (Account 4)
   - Partner Role: Select **Distributor**
5. **Click:** "Vouch for Partner"
6. **Approve transaction** in MetaMask
7. **Expected Result:**
   - ✅ Success message: "Partnership Established!"
   - ✅ Distributor now has active partnership
   - ✅ Trust chain: Distributor → Manufacturer (1 level)

**Backend should show:**
```
📝 Event: PartnershipEstablished - Voucher: 0x7099..., Partner: 0x15d3...
```

---

#### 1.3: Distributor Vouches for Pharmacist (Recursive Trust)

1. **Switch MetaMask** to Account 4 (Distributor you just vouched for)
2. **Refresh page**
3. **Dashboard should show:** "Role: Distributor" (vouched, not registered)
4. **Click:** "🤝 Vouch for Partner"
5. **Verify modal shows:**
   - ✅ Your Status: Verified (via trust chain)
   - ✅ Your Role: Distributor
   - ✅ Trust Chain: 2 levels
6. **Enter Partner Details:**
   - Partner Address: `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` (Account 5)
   - Partner Role: Select **Pharmacist**
7. **Click:** "Vouch for Partner"
8. **Approve transaction**
9. **Expected Result:**
   - ✅ Success message: "Partnership Established!"
   - ✅ Complete trust chain: Pharmacist → Distributor → Manufacturer (2 levels)

---

#### 1.4: Verify Complete Trust Chain

1. **Switch MetaMask** to Account 5 (Pharmacist)
2. **Refresh page**
3. **Dashboard should show:** "Role: Pharmacist"
4. **Click:** "🤝 Vouch for Partner"
5. **Verify modal shows:**
   - ✅ Your Status: Verified
   - ✅ Your Role: Pharmacist
   - ✅ Trust Chain: 3 levels (Pharmacist → Distributor → Manufacturer)

**✅ Recursive Trust Test Complete!** The pharmacist was never directly registered or vouched by the manufacturer, but is verified through the distributor intermediary.

---

### Test Workflow 2: Batch Lifecycle (Simplified - No Shippers)

This tests the **direct custody transfer** workflow.

#### 2.1: Manufacturer Mints a Batch

1. **Connect as Account 1** (Manufacturer - PharmaCorp)
2. **Navigate to:** "Mint Batch" tab
3. **Fill out form:**
   - Product Name: `Aspirin 100mg`
   - Batch Number: `LOT-2025-001` (optional - auto-generated if blank)
4. **Click:** "Mint Batch"
5. **Approve transaction** in MetaMask
6. **Expected Result:**
   - ✅ Success message with Token ID
   - ✅ QR code displayed
   - ✅ Batch appears in "Batch Inventory" tab

**Backend should show:**
```
📝 Event: BatchMinted - Token ID: 1, Manufacturer: 0x7099...
```

---

#### 2.2: Manufacturer Logs IoT Sensor Data

1. **Stay on "Batch Inventory" tab**
2. **Find your batch** in the table
3. **Click:** "📡 Log Data" button
4. **Fill out IoT modal:**
   - Temperature: `2-8°C`
   - Location: `Warehouse A, Shelf 3`
   - Notes: `Temperature stable during storage`
5. **Click:** "Sign & Log Data"
6. **MetaMask signature prompt appears** → Click "Sign"
7. **Expected Result:**
   - ✅ Success message
   - ✅ Data logged with cryptographic proof
   - ✅ Logged by: Manufacturer address + timestamp

**Backend should show:**
```
📝 Event: EventLogged - Token ID: 1, Logger: 0x7099...
```

**Note:** The signature proves the manufacturer logged this data at this time. It cannot be forged or backdated.

---

#### 2.3: Transfer Custody to Distributor (Direct Transfer)

**Important:** This is a **direct transfer** - no shipper involved!

1. **Stay as Manufacturer** (Account 1)
2. **Navigate to:** "Transfer Custody" tab
3. **Select batch** from dropdown (shows as "Aspirin 100mg (LOT-2025-001)")
4. **Enter Distributor Address:** `0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65` (Account 4)
   - This is the distributor you vouched for earlier
5. **Click:** "📤 Transfer Custody"
6. **Approve 2 transactions** in MetaMask:
   - Transaction 1: Approve TrackAndTrace contract to manage NFT
   - Transaction 2: Transfer custody to distributor
7. **Expected Result:**
   - ✅ Success message: "Custody transferred successfully!"
   - ✅ Batch disappears from your inventory (real-time update)
   - ✅ Batch now owned by distributor

**Backend should show:**
```
📝 Event: CustodyTransferred - Token ID: 1, From: 0x7099..., To: 0x15d3...
```

---

#### 2.4: Distributor Acknowledges Receipt

1. **Switch MetaMask** to Account 4 (Distributor)
2. **Refresh page**
3. **Navigate to:** "Incoming Shipments" tab
4. **You should see:** The batch in the incoming shipments list
5. **Click:** "📸 Scan & Acknowledge" button
6. **QR Scanner modal opens** - Scan the QR code (or it auto-validates if expectedTokenId matches)
7. **Expected:** QR scanner validates token ID and displays ✅ success checkmark
8. **IoT Sensor Log modal opens automatically** with:
   - ✅ **"QR Code Scanned Successfully!" banner** embedded at the top of the modal
   - Shows batch details (product name, batch number, token ID)
   - Instructions to fill the form below
9. **Fill out IoT form:**
   - Temperature on Arrival: `5°C`
   - Location: `Distribution Center A`
   - Notes: `Package intact, no damage`
10. **Click:** "Sign & Log Data"
11. **Sign the message** in MetaMask (cryptographic proof)
12. **Approve acknowledgment transaction** in MetaMask
13. **Expected Result:**
    - ✅ Success banner appears on page
    - ✅ Modal closes automatically
    - ✅ After ~1 second delay, batch automatically moves from "Incoming Shipments" to "Current Inventory" tab
    - ✅ Tab counters update in real-time (Incoming count decreases, Current count increases)
    - ✅ "Shipment History" tab shows status as "📦 With Me"
    - ✅ Receipt logged on blockchain with cryptographic signature

**Browser Console Debug Output:**
```
✅ IoT data logged successfully!
📝 Marking Token #1 as acknowledged...
⏳ Waiting for transaction confirmation...
✅ Receipt acknowledged on-chain!
⏳ Waiting for blockchain state to update...
🔄 Reloading batches after acknowledgment...
📦 Batch #1 - Acknowledged by me: true
📥 Incoming batches: 0 []
📦 Current batches: 1 [1]
✅ Batches reloaded!
```

**Backend should show:**
```
📝 Event: ReceiptAcknowledged - Token ID: 1, Acknowledger: 0x15d3...
```

**Important Notes:**
- The 1-second delay after acknowledgment ensures blockchain state is fully propagated before reloading batches
- The "Successfully scanned" banner is now **inside** the IoT modal, not hidden on the page
- Real-time batch recategorization happens automatically - no manual page refresh needed

---

#### 2.5: Distributor Transfers to Pharmacist

1. **Stay as Distributor** (Account 4)
2. **Navigate to:** "Current Inventory" tab
3. **Scroll down to "Direct Transfer" section**
4. **Select batch** from dropdown
5. **Transfer to Pharmacist** - You have two options:
   - **Option A (Quick Select):** Use the **"🤝 Quick Select: Your Vouched Partners"** dropdown to auto-fill the pharmacist address you vouched for earlier
     - Select: `0x9965507D...0A4dc (Pharmacist)` from the dropdown
     - The address will auto-populate in the input field below
   - **Option B (Manual Entry):** Enter pharmacist address directly: `0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc` (Account 5)
6. **Click:** "📤 Transfer Custody"
7. **Approve 2 transactions** in MetaMask:
   - Transaction 1: Approve TrackAndTrace contract
   - Transaction 2: Transfer custody
8. **Expected Result:**
   - ✅ Batch transfers to pharmacist
   - ✅ Batch disappears from your current inventory
   - ✅ Tab counters update automatically

**Important Notes:**
- The vouched partners dropdown only shows partners **you've personally vouched for**
- You can still transfer to **any** registered pharmacist by entering their address manually
- The dropdown is a convenience feature for quick transfers to trusted partners

---

#### 2.6: Pharmacist Acknowledges and Logs Final Event

1. **Switch MetaMask** to Account 5 (Pharmacist)
2. **Refresh page**
3. **Navigate to:** "Incoming Shipments" tab
4. **Acknowledge receipt** (same process as distributor)
5. **Batch moves to "Current Inventory"**
6. **Click:** "📡 Log Data"
7. **Log final event:**
   - Temperature: `4°C`
   - Location: `Pharmacy Storage Room 2`
   - Notes: `Ready for dispensing to patients`
8. **Expected Result:**
   - ✅ Complete supply chain recorded
   - ✅ Full custody history available

---

#### 2.7: Public Verification (No Wallet Required)

1. **Open new incognito/private browser window** (or disconnect MetaMask)
2. **Navigate to:** `http://localhost:5174/verify?tokenId=1`
3. **Expected Display:**
   - ✅ Product Name: Aspirin 100mg
   - ✅ Batch Number: LOT-2025-001
   - ✅ Manufacturer: PharmaCorp (0x7099...)
   - ✅ Current Owner: Pharmacist (0x9965...)
   - ✅ **Custody History Table:**
     - Manufacturer → Distributor (timestamp)
     - Distributor → Pharmacist (timestamp)
   - ✅ **Supply Chain Events:**
     - Manufacturer logged: Temperature 2-8°C... (signed)
     - Distributor logged: Temperature on arrival 5°C... (signed)
     - Pharmacist logged: Ready for dispensing... (signed)
   - ✅ QR code for sharing

**✅ Complete Batch Lifecycle Test Passed!** The entire journey from manufacturer to patient is now traceable and verifiable.

---

### Test Workflow 3: Shipment History Tracking

This tests the **shipment history** feature for manufacturers and distributors.

#### 3.1: Manufacturer Views Shipment History

1. **Connect as Account 1** (Manufacturer)
2. **Navigate to:** "Shipment History" tab
3. **Expected Display:**
   - Table showing all batches you've manufactured
   - Columns: Token ID, Product Name, Batch Number, Current Owner, Status
   - **Status indicators:**
     - 📦 **With Me** (green) - Still in your inventory
     - 🚚 **In Transit** (yellow) - Transferred but not acknowledged by receiver
     - ✅ **Acknowledged** (green) - Receiver has acknowledged receipt

**Real-Time Updates:**
- When distributor acknowledges receipt, status automatically changes from "In Transit" to "Acknowledged"
- No page refresh needed (uses Server-Sent Events)

---

#### 3.2: Distributor Views Shipment History

1. **Connect as Account 4** (Distributor)
2. **Navigate to:** "Shipment History" tab
3. **Expected Display:**
   - All batches that have passed through your custody
   - Same status indicators
   - Shows whether current owner (pharmacist) has acknowledged

**Use Case:** Track which batches have been successfully delivered and acknowledged vs. still in transit.

---

## 🔍 API Testing

Test the backend API directly using curl:

```bash
# Health check
curl http://localhost:3001/api/health

# List all batches
curl http://localhost:3001/api/batches

# Get batch details (Token ID 1)
curl http://localhost:3001/api/batches/1

# Get batch events
curl http://localhost:3001/api/batches/1/events

# Get custody history
curl http://localhost:3001/api/batches/1/custody

# Get stakeholder role (Manufacturer Account 1)
curl http://localhost:3001/api/stakeholders/0x70997970C51812dc3A010C7d01b50e0d17dc79C8/role

# Get stakeholder batches (Pharmacist Account 5)
curl http://localhost:3001/api/stakeholders/0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc/batches

# Get batches manufactured by address
curl http://localhost:3001/api/manufactured/0x70997970C51812dc3A010C7d01b50e0d17dc79C8
```

**Expected API Response Format:**
```json
{
  "success": true,
  "data": {
    "batches": [...]
  }
}
```

---

## ❓ Troubleshooting

### Frontend: "MetaMask not installed"

**Solution:**
- Install MetaMask browser extension
- Refresh page

---

### Frontend: "Wrong network" or red network banner

**Solution:**
- Switch MetaMask to "Hardhat Local" network
- Verify Chain ID is 31337
- Check RPC URL is `http://127.0.0.1:8545`

---

### Frontend: "No role assigned" or "Connect as Manufacturer/Distributor/Pharmacist"

**Solution:**
- Verify you're using one of the pre-registered manufacturer accounts (1-3)
- Or check that vouching was successful for distributors/pharmacists
- Run the manufacturer registration script if you skipped Step 3:
  ```bash
  cd packages/contracts
  npx hardhat run scripts/register-manufacturers.ts --network localhost
  ```
- Query role manually:
  ```bash
  cd packages/contracts
  npx hardhat console --network localhost
  ```
  ```javascript
  const registry = await ethers.getContractAt("StakeholderRegistry", "0x5FbDB...")
  await registry.getRole("0x70997970C51812dc3A010C7d01b50e0d17dc79C8") // Should return 1 for Manufacturer
  ```

---

### Backend: "Cannot connect to contracts"

**Solution:**
- Verify `.env` file has correct contract addresses
- Ensure Hardhat node (Terminal 1) is running: `lsof -ti:8545`
- Check RPC URL is `http://127.0.0.1:8545`
- Restart backend after updating `.env`

---

### Backend: "Event indexer not listening"

**Solution:**
- Check `INDEXER_ENABLED=true` in `.env`
- Restart backend server
- Look for "✓ Polling-based indexing active (every 1s)" in logs

---

### Backend: "TypeError: results is not iterable" (Fixed)

**Issue:** This error appeared in older versions when using filter-based event listeners with Hardhat.

**Solution Applied:**
- ✅ **Fixed in current version** - Backend now uses polling-based indexing instead of filters
- The error has been eliminated by switching from `contract.on()` to `queryFilter()` polling
- If you see this error, ensure you have the latest version of `/packages/backend/src/services/eventIndexer.ts`

**Technical Details:**
- Old approach: Used `eth_getFilterChanges` which returned non-iterable values in Hardhat
- New approach: Polls every 1 second using `queryFilter()` for reliable event detection
- This provides the same real-time experience without the crashes

---

### Transactions Failing / MetaMask Errors

**Solution:**
- **Reset MetaMask nonce:**
  1. MetaMask → Settings → Advanced → Clear activity tab data
  2. This resets transaction history for localhost
- **Check account balance:**
  - All test accounts have 10,000 ETH
  - If you see 0 ETH, you're on the wrong network
- **Verify correct role:**
  - Manufacturers can mint and transfer
  - Only current owner can transfer custody
  - Only receiver can acknowledge receipt

---

### Real-time updates not working

**Solution:**
- **Check browser console** for SSE connection errors
- **Verify backend is running** and shows "Real-time listeners active"
- **Check CORS settings** in backend `.env`: `CORS_ORIGIN=http://localhost:5174`
- **Try hard refresh:** Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)

---

### QR Scanner not working

**Solution:**
- Grant camera permissions in browser
- Use HTTPS in production (localhost HTTP is okay for testing)
- Try a different browser if issues persist
- Alternative: Manually enter token ID in verification page URL

---

## 🔄 Clean Restart & System Reset

### Quick Clean Restart

If you need to restart the system with a **fresh blockchain** (no old data):

**⚠️ CRITICAL:** When you restart Hardhat, you **MUST** restart the backend too! The backend caches data in memory, and it will serve stale data from the old blockchain session if not restarted.

1. **Stop all terminals** (Ctrl+C in each terminal)

2. **Restart Hardhat node** (Terminal 1)
   ```bash
   cd /home/tough/Blockchain_Project/packages/contracts
   npx hardhat node
   ```

3. **Re-deploy contracts** (Terminal 2)
   ```bash
   cd /home/tough/Blockchain_Project/packages/contracts
   npx hardhat run scripts/deploy.ts --network localhost
   npx hardhat run scripts/register-manufacturers.ts --network localhost
   ```

   **Note:** Contract addresses will be the same every time you restart Hardhat (deterministic deployment). The `.env` files don't need updating.

4. **⚠️ MUST RESTART BACKEND** (Terminal 3)
   ```bash
   cd /home/tough/Blockchain_Project/packages/backend
   npm run dev
   ```

   **Why this is critical:**
   - Backend stores indexed data in memory (batches, events, partnerships)
   - If you don't restart backend, it serves **stale cached data** from the old blockchain
   - This makes it look like vouched partners and batches still exist, but they don't!
   - **Always restart backend after restarting Hardhat**

5. **Restart frontend** (Terminal 4)
   ```bash
   cd /home/tough/Blockchain_Project/packages/frontend
   npm run dev
   ```

6. **Reset MetaMask:**
   - Settings → Advanced → Clear activity tab data
   - This clears transaction history and nonces for localhost

**After Reset, You Should See:**
- ✅ Account 1-3 show "Role: Manufacturer" (pre-registered)
- ✅ Account 4-19 show "No role assigned"
- ✅ No batches in inventory
- ✅ No vouched partners
- ✅ No shipment history
- ✅ Fresh blockchain with block #0

**If you still see old data (vouched partners, batches), you forgot to restart the backend!**

---

### Complete System Reset (Nuclear Option)

If you need to **completely reset everything** (blockchain, processes, MetaMask state):

#### Step 1: Kill All Running Processes

**Option A - Kill Specific Processes (Recommended):**

```bash
# Kill Hardhat node
lsof -ti:8545 | xargs kill -9

# Kill backend API
lsof -ti:3001 | xargs kill -9

# Kill frontend dev server
lsof -ti:5174 | xargs kill -9

# Verify all processes are stopped
lsof -i:8545,3001,5174
# Should return nothing if all processes stopped successfully
```

**Option B - Kill All Node Processes (Nuclear):**

⚠️ **WARNING**: This will kill ALL Node.js processes, including VS Code extensions and other Node apps!

```bash
# Kill all node processes (use with caution!)
pkill -9 node

# Or more specifically:
pkill -9 -f "hardhat node"
pkill -9 -f "npm run dev"
pkill -9 -f "vite"
pkill -9 -f "ts-node"
pkill -9 -f "nodemon"
```

**Verify All Killed:**
```bash
ps aux | grep -E "(hardhat|vite|ts-node|nodemon)" | grep -v grep
# Should return nothing
```

---

#### Step 2: Clean Hardhat Blockchain State

```bash
cd /home/tough/Blockchain_Project/packages/contracts

# Remove cached blockchain data
rm -rf cache/
rm -rf artifacts/
rm -rf deployments/

# Remove node_modules lock files (optional, if having dependency issues)
# rm -rf node_modules/
# rm package-lock.json
# npm install
```

---

#### Step 3: Clean Backend State

```bash
cd /home/tough/Blockchain_Project/packages/backend

# Backend uses in-memory storage, so just verify .env is correct
cat .env | grep LOCALHOST

# If you want to clear logs/temp files:
rm -rf dist/
rm -rf node_modules/.cache/

# Remove node_modules (optional, if having dependency issues)
# rm -rf node_modules/
# rm package-lock.json
# npm install
```

---

#### Step 4: Clean Frontend State

```bash
cd /home/tough/Blockchain_Project/packages/frontend

# Clear Vite cache
rm -rf node_modules/.vite/
rm -rf dist/

# Clear browser storage (run in browser console)
# localStorage.clear()
# sessionStorage.clear()

# Remove node_modules (optional, if having dependency issues)
# rm -rf node_modules/
# rm package-lock.json
# npm install
```

---

#### Step 5: Reset MetaMask

MetaMask stores nonce and transaction data for localhost that can cause issues after blockchain restart.

**Method 1 - Clear Activity Data (Quick):**
1. Open MetaMask
2. Click Settings → Advanced
3. Scroll down to "Clear activity tab data"
4. Click "Clear" button
5. Confirm the action

**Method 2 - Reset Account (Nuclear):**
1. Open MetaMask
2. Click Settings → Advanced
3. Scroll down to "Reset Account"
4. Click "Reset" button
5. Confirm the action
6. **Note**: This clears ALL transaction history and nonce for the active account

**Method 3 - Remove and Re-add Network (Most Thorough):**
1. Open MetaMask
2. Click Networks → Hardhat Local → Delete
3. Re-add network:
   - Network Name: `Hardhat Local`
   - RPC URL: `http://127.0.0.1:8545`
   - Chain ID: `31337`
   - Currency Symbol: `ETH`
4. Re-import test accounts (Accounts 0-5)

---

#### Step 6: Restart System from Scratch

Now follow the normal startup procedure:

**Terminal 1 - Start Hardhat:**
```bash
cd /home/tough/Blockchain_Project/packages/contracts
npx hardhat node
```

**Terminal 2 - Deploy Contracts:**
```bash
cd /home/tough/Blockchain_Project/packages/contracts
npx hardhat run scripts/deploy.ts --network localhost
npx hardhat run scripts/register-manufacturers.ts --network localhost
```

**Terminal 3 - Start Backend:**
```bash
cd /home/tough/Blockchain_Project/packages/backend
npm run dev
```

**Terminal 4 - Start Frontend:**
```bash
cd /home/tough/Blockchain_Project/packages/frontend
npm run dev
```

**Browser:**
- Open http://localhost:5174
- Connect MetaMask
- Switch to Hardhat Local network (Chain ID 31337)
- Test with Account 1 (Manufacturer)

---

### Common Issues After Reset

**Issue**: "Nonce too high" error in MetaMask
- **Solution**: Clear activity data in MetaMask (Method 1 above)

**Issue**: "Insufficient funds" despite having 10,000 ETH
- **Solution**: You're on the wrong network. Switch to "Hardhat Local" (Chain ID 31337)

**Issue**: Still see old vouched partners, batches, or shipment history after restart
- **Root Cause**: Backend was not restarted and is serving stale cached data
- **Solution**:
  1. Stop backend (Ctrl+C in Terminal 3)
  2. Restart backend: `cd /home/tough/Blockchain_Project/packages/backend && npm run dev`
  3. Refresh frontend
  4. You should now see fresh state (no partners, no batches)

**Issue**: Contract addresses don't match
- **Solution**: This shouldn't happen - Hardhat uses deterministic addresses. If it does, re-run deploy script and restart backend.

**Issue**: Frontend shows "No role assigned" for Manufacturer accounts
- **Solution**: Run manufacturer registration script:
  ```bash
  cd /home/tough/Blockchain_Project/packages/contracts
  npx hardhat run scripts/register-manufacturers.ts --network localhost
  ```

**Issue**: Backend can't connect to contracts or shows connection errors
- **Solution**:
  1. Verify Hardhat is running: `lsof -ti:8545` (should return a process ID)
  2. Verify `.env` has correct contract addresses from latest deployment
  3. Restart backend

**Issue**: Ports still in use after killing processes
- **Solution**:
  ```bash
  # Force kill any lingering processes
  lsof -ti:8545 | xargs kill -9
  lsof -ti:3001 | xargs kill -9
  lsof -ti:5174 | xargs kill -9
  ```

---

### Reset Verification Checklist

After a complete reset, verify:

- ✅ Hardhat node running on port 8545
- ✅ Backend API responding at http://localhost:3001/api/health
- ✅ Frontend loading at http://localhost:5174
- ✅ MetaMask connected to Chain ID 31337
- ✅ Account 1 shows "Role: Manufacturer"
- ✅ Account 1 can see "Apply for Credential" button
- ✅ Accounts 4-5 show "No role assigned" (until vouched)
- ✅ No "nonce too high" errors when submitting transactions
- ✅ All 4 terminals running without errors

---

### Troubleshooting: Can't Vouch for Account 6+ as Distributor/Pharmacist

**Problem**: When a manufacturer tries to vouch for Account 6 or higher as a distributor or pharmacist, the transaction fails or shows an error.

**Common Causes & Solutions:**

#### Cause 1: Manufacturer Doesn't Have Verified Credential

**Symptoms**:
- Error: "Manufacturer lacks verified credential"
- Vouching modal shows "Not Verified"

**Solution**:
1. Make sure you've applied for credentials as manufacturer
2. Check that your credential was approved (auto-approved in local testing)
3. Verify in the vouching modal that it shows "Verified"

#### Cause 2: Account Already Has a Role Assigned

**Symptoms**:
- Error: "This address is already registered as a [Role]"
- Can't proceed with vouching

**Why this happens**:
- You may have accidentally registered Account 6+ manually
- Someone else already vouched for this account

**Solution - Check Account Role:**

```bash
cd /home/tough/Blockchain_Project/packages/contracts
npx hardhat console --network localhost
```

```javascript
const StakeholderRegistry = await ethers.getContractFactory("StakeholderRegistry");
const registry = await StakeholderRegistry.attach("YOUR_REGISTRY_ADDRESS");

// Check Account 6 role
const account6 = "0x976EA74026E726554db657fA54763abd0C3a0aa9";
const role = await registry.getRole(account6);
console.log("Account 6 role:", Number(role)); // Should be 0 (None) if never vouched
```

**If role is NOT 0**, the account was already registered. Use a different account (Account 7, 8, 9, etc.)

#### Cause 3: Account Already Has Active Partnership

**Symptoms**:
- Error: "This address already has an active partnership"

**Solution**:
- This account was already vouched for by someone else
- Use a fresh account that hasn't been vouched yet (Account 7, 8, 9, etc.)

#### Cause 4: Invalid Address Format

**Symptoms**:
- Error: "Invalid partner address"
- Vouching button is disabled

**Solution**:
- Make sure the address starts with `0x`
- Address must be 42 characters long (0x + 40 hex characters)
- Copy address exactly from the test accounts table

#### Cause 5: Trying to Vouch for Wrong Role

**Symptoms**:
- Error: "Invalid partnership hierarchy"

**Valid Hierarchies**:
- ✅ Manufacturer → Distributor
- ✅ Manufacturer → Pharmacist
- ✅ Distributor → Pharmacist
- ❌ Distributor → Manufacturer (INVALID)
- ❌ Pharmacist → Distributor (INVALID)

**Solution**:
- Check the selected role matches the hierarchy
- Manufacturers can vouch for Distributors OR Pharmacists
- Distributors can only vouch for Pharmacists

---

### Using Fresh Test Accounts for Vouching

Accounts 6-19 are available as fresh accounts for testing. Here's the recommended usage:

**Testing Manufacturer → Distributor Vouching:**
1. Connect as Account 1 (Manufacturer)
2. Vouch for Account 6 as Distributor
3. Vouch for Account 7 as Distributor (different distributor)

**Testing Distributor → Pharmacist Vouching:**
1. Connect as Account 6 (Distributor - just vouched above)
2. Vouch for Account 10 as Pharmacist
3. Vouch for Account 11 as Pharmacist

**Testing Multiple Supply Chains:**
1. Manufacturer Account 2 vouches for Distributor Account 8
2. Distributor Account 8 vouches for Pharmacist Account 12
3. This creates a separate supply chain from Account 1's chain

**Quick Reference - Available Fresh Accounts:**
```
Account 6:  0x976EA74026E726554db657fA54763abd0C3a0aa9
Account 7:  0x14dC79964da2C08b23698B3D3cc7Ca32193d9955
Account 8:  0x23618e81E3f5cdF7f54C3d65f7FBc0aBf5B21E8f
Account 9:  0xa0Ee7A142d267C1f36714E4a8F75612F20a79720
Account 10: 0xBcd4042DE499D14e55001CcbB24a551F3b954096
Account 11: 0x71bE63f3384f5fb98995898A86b02Fb2426c5788
Account 12: 0xFABB0ac9d68B0B445fB7357272Ff202C5651694a
(See full list in Test Accounts Reference section)
```

---

### Emergency Kill Script

Create a script to quickly kill all processes:

**Create `kill-all.sh` in project root:**

```bash
#!/bin/bash

echo "🛑 Stopping all MedTrace processes..."

echo "Killing Hardhat node (port 8545)..."
lsof -ti:8545 | xargs kill -9 2>/dev/null || echo "No process on 8545"

echo "Killing Backend API (port 3001)..."
lsof -ti:3001 | xargs kill -9 2>/dev/null || echo "No process on 3001"

echo "Killing Frontend (port 5174)..."
lsof -ti:5174 | xargs kill -9 2>/dev/null || echo "No process on 5174"

echo "Killing any remaining hardhat/nodemon processes..."
pkill -9 -f "hardhat node" 2>/dev/null || echo "No hardhat processes"
pkill -9 -f "nodemon" 2>/dev/null || echo "No nodemon processes"

echo "✅ All processes stopped!"
echo ""
echo "Verify with: ps aux | grep -E '(hardhat|nodemon|vite)' | grep -v grep"
```

**Make it executable:**
```bash
chmod +x /home/tough/Blockchain_Project/kill-all.sh
```

**Usage:**
```bash
cd /home/tough/Blockchain_Project
./kill-all.sh
```

---

## ✅ Success Criteria

After setup, you should be able to:

- ✅ All 4 terminals running without errors
- ✅ Frontend loads at http://localhost:5174
- ✅ Backend API responds at http://localhost:3001
- ✅ MetaMask connects successfully to Chain ID 31337
- ✅ Role detected correctly for each account
- ✅ Manufacturer can apply for credentials
- ✅ Manufacturer can vouch for distributors
- ✅ Distributor can vouch for pharmacists (recursive trust)
- ✅ Manufacturer can mint batches with QR codes
- ✅ Manufacturer can log IoT sensor data with signatures
- ✅ Manufacturer can transfer custody directly to distributors
- ✅ Distributor can acknowledge receipt
- ✅ Distributor can transfer custody directly to pharmacists
- ✅ Pharmacist can log final events
- ✅ Public verification page works without wallet
- ✅ Real-time SSE updates work (no page refresh needed)
- ✅ Shipment history tracks status changes
- ✅ API returns correct data for all endpoints

---

## 📖 Reference

### Test Accounts

**See the comprehensive [Test Accounts Reference](#-test-accounts-reference)** section near the beginning of this guide for:
- All 20 Hardhat accounts with addresses and private keys
- Role assignments and company names
- Import instructions
- Recommended testing setup
- Role assignment flow diagrams

### Deployed Contracts (Current Session)

| Contract | Address |
|----------|---------|
| StakeholderRegistry | `0x5FbDB2315678afecb367f032d93F642f64180aa3` |
| DigitalBatch | `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512` |
| TrackAndTrace | `0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9` |
| SupplyChainEvents | `0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9` |
| PartnershipRegistry | `0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0` |

**Note:** Addresses will be different after each clean restart.

---

## 🎯 Next Steps

After successful local testing:

1. **Review Code:** Understand the smart contract logic
2. **Test Edge Cases:** Try invalid transfers, unauthorized actions
3. **Deploy to Testnet:** See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
4. **Security Audit:** Review contract security before mainnet

---

## 📞 Support

If you encounter issues:

1. Check all 4 terminals for error messages
2. Verify environment variables in `.env` files
3. Ensure all services are running (Hardhat, Backend, Frontend)
4. Try a clean restart (see above)
5. Check the troubleshooting section
6. Review Terminal 1 (Hardhat) logs for transaction details

---

Happy testing! 🚀

**Key Features Tested:**
- ✅ Verifiable Credentials & Recursive Trust Chain
- ✅ IoT Simulation with Cryptographic Signatures
- ✅ Direct Custody Transfers (No Multi-Signature Shippers)
- ✅ Real-Time Event Streaming (SSE)
- ✅ Public QR Code Verification
- ✅ Shipment History Tracking

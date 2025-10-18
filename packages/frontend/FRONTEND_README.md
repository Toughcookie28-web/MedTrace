# MedTrace Frontend Application

React-based frontend application for the MedTrace blockchain pharmaceutical supply chain tracking system.

## Features

- **Wallet Connection**: MetaMask integration with automatic network detection
- **Role-Based UI**: Different dashboards for Manufacturers, Distributors, and Pharmacists
- **QR Code Generation**: Generate QR codes for batch verification
- **QR Code Scanning**: Scan QR codes to verify batch authenticity
- **Public Verification Page**: Verify batches without wallet connection
- **Real-time Data**: Integrates with backend API for indexed blockchain data
- **Error Notifications**: Dashboard banners surface backend API errors via unified client handling

## Tech Stack

- **React 19.1.1** - UI framework
- **TypeScript 5.9** - Type safety
- **Vite 7.1.7** - Build tool and dev server
- **ethers.js 6.x** - Ethereum library
- **react-router-dom** - Client-side routing
- **qrcode.react** - QR code generation
- **html5-qrcode** - QR code scanning

## Project Structure

```
src/
├── components/
│   ├── Manufacturer/
│   │   └── ManufacturerDashboard.tsx    # Mint batches, view inventory
│   ├── Distributor/
│   │   └── DistributorDashboard.tsx     # Transfer custody, log events
│   ├── Pharmacist/
│   │   └── PharmacistDashboard.tsx      # View inventory, verify batches
│   └── common/
│       ├── QRCodeGenerator.tsx          # Generate QR codes
│       └── QRCodeScanner.tsx            # Scan QR codes
├── contexts/
│   ├── Web3Context.tsx                   # Wallet & contract management
│   └── AuthContext.tsx                   # Role-based authentication
├── pages/
│   ├── Dashboard.tsx                     # Main role-based dashboard
│   └── VerifyBatch.tsx                   # Public verification page
├── utils/
│   └── api.ts                            # Backend API client
├── types/
│   └── index.ts                          # TypeScript type definitions
├── contracts/                            # Contract ABIs (auto-copied)
│   ├── StakeholderRegistry.json
│   ├── DigitalBatch.json
│   └── TrackAndTrace.json
├── config.ts                             # App configuration
└── App.tsx                               # Root component with routing
```

## Environment Setup

1. **Copy environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Configure environment variables:**
   ```env
   VITE_API_BASE_URL=http://localhost:3001
   VITE_STAKEHOLDER_REGISTRY_ADDRESS=<deployed_address>
   VITE_DIGITAL_BATCH_ADDRESS=<deployed_address>
   VITE_TRACK_AND_TRACE_ADDRESS=<deployed_address>
   ```

   These addresses are output by the deployment script.

## Installation

```bash
cd packages/frontend
npm install
```

## Development

Start the development server:

```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Building for Production

```bash
npm run build
```

The built files will be in the `dist/` directory.

## Usage

### For Manufacturers

1. Connect your MetaMask wallet
2. Your role will be automatically detected
3. **Mint New Batch**:
   - Enter token URI (IPFS hash or URL)
   - Click "Mint Batch"
   - Save/print the generated QR code
4. View all minted batches with their QR codes

### For Distributors

1. Connect your MetaMask wallet
2. **Transfer Custody**:
   - Select a batch from your inventory
   - Enter recipient address (pharmacist)
   - Click "Transfer Custody"
3. **Log Events**:
   - Select batch token ID
   - Enter event data (temperature, location, etc.)
   - Click "Log Event"
4. **Scan QR Code**: Scan batch QR codes to view verification

### For Pharmacists

1. Connect your MetaMask wallet
2. **View Inventory**: See all batches in your custody
3. **Log Events**: Record dispensing, storage conditions, quality checks
4. **Verify Batch**: Scan QR codes to verify batch authenticity

### Public Verification (No Wallet Required)

1. Navigate to `/verify?tokenId=<ID>` or scan a QR code
2. View complete batch details:
   - Manufacturer information
   - Current owner
   - Full custody history
   - All supply chain events

## Role-Based Access Control

The application automatically detects your role from the StakeholderRegistry contract:

- **None (0)**: Shows registration instructions
- **Manufacturer (1)**: Shows minting interface
- **Distributor (2)**: Shows transfer and event logging
- **Pharmacist (3)**: Shows inventory and verification

## Integration with Backend

The frontend communicates with the backend API for indexed data:

- `GET /api/batches` - List all batches
- `GET /api/batches/:tokenId` - Batch details
- `GET /api/batches/:tokenId/events` - Batch events
- `GET /api/batches/:tokenId/custody` - Custody history
- `GET /api/stakeholders/:address/batches` - Owner's batches

All collection endpoints use the shared `api.ts` client, which unwraps the `{ success, data, pagination, timestamp }` envelope and throws native `Error` objects consumed by the dashboards' error banners.

## Network Support

The application supports multiple networks:

- **Localhost (31337)**: Hardhat local node
- **Sepolia (11155111)**: Ethereum testnet

Add network configurations in `src/config.ts`.

## QR Code Format

QR codes contain verification URLs in the format:
```
https://yourapp.com/verify?tokenId=42
```

Anyone can scan these QR codes to verify batch authenticity without a wallet.

## Troubleshooting

### MetaMask Not Detected

- Install MetaMask browser extension
- Refresh the page after installation

### Wrong Network

- The app will prompt you to switch networks
- Use the MetaMask UI to switch to the correct network

### Contract Not Initialized

- Ensure environment variables are set correctly
- Verify contract addresses match deployed contracts

### Transaction Failed

- Check that you have the correct role
- Ensure you have sufficient gas
- Verify the batch ID exists

## Development Notes

- Contract ABIs are copied from `packages/contracts/artifacts/`
- Update contract addresses in `.env` after deployment
- The backend API must be running for indexed data
- Use localhost network (chain ID 31337) for local development

## Testing Locally

1. **Terminal 1**: Start Hardhat node
   ```bash
   cd packages/contracts
   npx hardhat node
   ```

2. **Terminal 2**: Deploy contracts
   ```bash
   cd packages/contracts
   npm run deploy:localhost
   npm run setup-local
   ```

3. **Terminal 3**: Start backend
   ```bash
   cd packages/backend
   npm run dev
   ```

4. **Terminal 4**: Start frontend
   ```bash
   cd packages/frontend
   npm run dev
   ```

5. **Import test account to MetaMask**:
   - Use private key from Hardhat node output
   - Add Localhost 8545 network to MetaMask
   - Connect to the application

## License

MIT

/**
 * @title PharmaLedger Local Development Setup Script
 * @notice Comprehensive setup for local Hardhat network testing
 * @dev Creates a complete test environment with:
 *   - Deployed contracts
 *   - Test stakeholders with roles
 *   - Sample pharmaceutical batches
 *   - Pre-configured approvals for TrackAndTrace
 *
 * Usage:
 *   1. Start local node: npx hardhat node
 *   2. In another terminal: npx hardhat run scripts/setup-local.ts --network localhost
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

interface LocalSetupInfo {
  network: string;
  chainId: number;
  timestamp: string;
  contracts: {
    StakeholderRegistry: string;
    DigitalBatch: string;
    TrackAndTrace: string;
  };
  testAccounts: Array<{
    address: string;
    role: string;
    privateKey: string;
  }>;
  sampleBatches: Array<{
    tokenId: number;
    manufacturer: string;
    tokenURI: string;
  }>;
}

const main = async () => {
  const { ethers, network } = hre;

  console.log("\n========================================");
  console.log("  PharmaLedger Local Setup");
  console.log("========================================\n");

  const accounts = await ethers.getSigners();
  const resolvedNetwork = await ethers.provider.getNetwork();
  const networkName = network.name ?? resolvedNetwork.name ?? "unknown";

  console.log("Network:", networkName);
  console.log("Chain ID:", resolvedNetwork.chainId.toString());
  console.log("Available accounts:", accounts.length);
  console.log();

  // ==========================================
  // STEP 1: Deploy All Contracts
  // ==========================================
  console.log("Step 1: Deploying contracts...");

  const StakeholderRegistry = await ethers.getContractFactory("StakeholderRegistry");
  const stakeholderRegistry = await StakeholderRegistry.deploy();
  await stakeholderRegistry.waitForDeployment();
  const stakeholderRegistryAddress = await stakeholderRegistry.getAddress();
  console.log("  ✓ StakeholderRegistry:", stakeholderRegistryAddress);

  const DigitalBatch = await ethers.getContractFactory("DigitalBatch");
  const digitalBatch = await DigitalBatch.deploy(stakeholderRegistryAddress);
  await digitalBatch.waitForDeployment();
  const digitalBatchAddress = await digitalBatch.getAddress();
  console.log("  ✓ DigitalBatch:", digitalBatchAddress);

  const TrackAndTrace = await ethers.getContractFactory("TrackAndTrace");
  const trackAndTrace = await TrackAndTrace.deploy(stakeholderRegistryAddress, digitalBatchAddress);
  await trackAndTrace.waitForDeployment();
  const trackAndTraceAddress = await trackAndTrace.getAddress();
  console.log("  ✓ TrackAndTrace:", trackAndTraceAddress);

  // Set custody manager
  const setCustodyTx = await digitalBatch.updateCustodyManager(trackAndTraceAddress);
  await setCustodyTx.wait();
  console.log("  ✓ Custody manager configured");
  console.log();

  // ==========================================
  // STEP 2: Register Test Stakeholders
  // ==========================================
  console.log("Step 2: Registering test stakeholders...");

  const testAccounts: Array<{ address: string; role: string; privateKey: string }> = [];

  // Deployer (account 0) - remains admin
  testAccounts.push({
    address: accounts[0].address,
    role: "Admin",
    privateKey: "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80", // Hardhat account #0
  });

  // Manufacturers (accounts 1-2)
  console.log("  Registering Manufacturers...");
  for (let i = 1; i <= 2; i++) {
    const tx = await stakeholderRegistry.addStakeholder(accounts[i].address, 1);
    await tx.wait();
    testAccounts.push({
      address: accounts[i].address,
      role: "Manufacturer",
      privateKey: getHardhatPrivateKey(i),
    });
    console.log(`    ✓ Manufacturer ${i}: ${accounts[i].address}`);
  }

  // Distributors (accounts 3-4)
  console.log("  Registering Distributors...");
  for (let i = 3; i <= 4; i++) {
    const tx = await stakeholderRegistry.addStakeholder(accounts[i].address, 2);
    await tx.wait();
    testAccounts.push({
      address: accounts[i].address,
      role: "Distributor",
      privateKey: getHardhatPrivateKey(i),
    });
    console.log(`    ✓ Distributor ${i - 2}: ${accounts[i].address}`);
  }

  // Pharmacists (accounts 5-6)
  console.log("  Registering Pharmacists...");
  for (let i = 5; i <= 6; i++) {
    const tx = await stakeholderRegistry.addStakeholder(accounts[i].address, 3);
    await tx.wait();
    testAccounts.push({
      address: accounts[i].address,
      role: "Pharmacist",
      privateKey: getHardhatPrivateKey(i),
    });
    console.log(`    ✓ Pharmacist ${i - 4}: ${accounts[i].address}`);
  }
  console.log();

  // ==========================================
  // STEP 3: Mint Sample Batches
  // ==========================================
  console.log("Step 3: Minting sample pharmaceutical batches...");

  const sampleBatches: Array<{ tokenId: number; manufacturer: string; tokenURI: string }> = [];

  // Sample batch metadata
  const batchMetadata = [
    {
      name: "Aspirin 500mg",
      drugName: "Acetylsalicylic Acid",
      quantity: "10000 tablets",
      manufacturingDate: "2025-01-15",
      expiryDate: "2027-01-15",
      batchNumber: "ASP-2025-001",
    },
    {
      name: "Amoxicillin 250mg",
      drugName: "Amoxicillin",
      quantity: "5000 capsules",
      manufacturingDate: "2025-02-01",
      expiryDate: "2027-02-01",
      batchNumber: "AMX-2025-002",
    },
    {
      name: "Lisinopril 10mg",
      drugName: "Lisinopril",
      quantity: "8000 tablets",
      manufacturingDate: "2025-01-20",
      expiryDate: "2026-01-20",
      batchNumber: "LIS-2025-003",
    },
  ];

  for (let i = 0; i < batchMetadata.length; i++) {
    const manufacturer = accounts[1 + (i % 2)]; // Alternate between manufacturer 1 and 2
    const metadata = batchMetadata[i];

    // Create token URI (in production, this would be IPFS)
    const tokenURI = `https://pharmaledger-api.example.com/metadata/${metadata.batchNumber}`;

    // Connect as manufacturer to mint
    const digitalBatchAsManufacturer = digitalBatch.connect(manufacturer);

    const mintTx = await digitalBatchAsManufacturer.mintBatch(manufacturer.address, tokenURI);
    const receipt = await mintTx.wait();

    // Get tokenId from BatchMinted event
    const event = receipt?.logs.find((log: any) => {
      try {
        const parsed = digitalBatch.interface.parseLog(log);
        return parsed?.name === "BatchMinted";
      } catch {
        return false;
      }
    });

    let tokenId = i + 1; // Default sequential ID
    if (event) {
      const parsed = digitalBatch.interface.parseLog(event);
      tokenId = Number(parsed?.args[0]);
    }

    sampleBatches.push({
      tokenId,
      manufacturer: manufacturer.address,
      tokenURI,
    });

    console.log(`  ✓ Batch ${tokenId} (${metadata.name}) minted by ${manufacturer.address}`);
  }
  console.log();

  // ==========================================
  // STEP 4: Setup Approvals for TrackAndTrace
  // ==========================================
  console.log("Step 4: Setting up TrackAndTrace approvals...");

  // Approve TrackAndTrace for all manufacturers
  for (let i = 1; i <= 2; i++) {
    const digitalBatchAsManufacturer = digitalBatch.connect(accounts[i]);
    const approveTx = await digitalBatchAsManufacturer.setApprovalForAll(trackAndTraceAddress, true);
    await approveTx.wait();
    console.log(`  ✓ Manufacturer ${i} approved TrackAndTrace`);
  }

  // Approve TrackAndTrace for all distributors
  for (let i = 3; i <= 4; i++) {
    const digitalBatchAsDistributor = digitalBatch.connect(accounts[i]);
    const approveTx = await digitalBatchAsDistributor.setApprovalForAll(trackAndTraceAddress, true);
    await approveTx.wait();
    console.log(`  ✓ Distributor ${i - 2} approved TrackAndTrace`);
  }

  // Approve TrackAndTrace for all pharmacists
  for (let i = 5; i <= 6; i++) {
    const digitalBatchAsPharmacist = digitalBatch.connect(accounts[i]);
    const approveTx = await digitalBatchAsPharmacist.setApprovalForAll(trackAndTraceAddress, true);
    await approveTx.wait();
    console.log(`  ✓ Pharmacist ${i - 4} approved TrackAndTrace`);
  }
  console.log();

  // ==========================================
  // STEP 5: Create Sample Custody Transfers
  // ==========================================
  console.log("Step 5: Creating sample custody transfers...");

  // Transfer Batch 1: Manufacturer 1 -> Distributor 1 -> Pharmacist 1
  const trackAndTraceAsManufacturer1 = trackAndTrace.connect(accounts[1]);
  const transfer1Tx = await trackAndTraceAsManufacturer1.transferCustody(1, accounts[3].address);
  await transfer1Tx.wait();
  console.log(`  ✓ Batch 1: Manufacturer 1 -> Distributor 1`);

  const trackAndTraceAsDistributor1 = trackAndTrace.connect(accounts[3]);
  const transfer2Tx = await trackAndTraceAsDistributor1.transferCustody(1, accounts[5].address);
  await transfer2Tx.wait();
  console.log(`  ✓ Batch 1: Distributor 1 -> Pharmacist 1`);

  // Transfer Batch 2: Manufacturer 2 -> Distributor 2
  const trackAndTraceAsManufacturer2 = trackAndTrace.connect(accounts[2]);
  const transfer3Tx = await trackAndTraceAsManufacturer2.transferCustody(2, accounts[4].address);
  await transfer3Tx.wait();
  console.log(`  ✓ Batch 2: Manufacturer 2 -> Distributor 2`);

  console.log();

  // ==========================================
  // STEP 6: Log Sample Events
  // ==========================================
  console.log("Step 6: Logging sample supply chain events...");

  // Event for Batch 1 (at Pharmacist)
  const trackAndTraceAsPharmacist1 = trackAndTrace.connect(accounts[5]);
  const event1Data = JSON.stringify({
    eventType: "temperature_check",
    temperature: { value: 4.2, unit: "celsius", inRange: true },
    location: { facility: "Pharmacy Storage", city: "Boston" },
  });
  const logEvent1Tx = await trackAndTraceAsPharmacist1.logEvent(1, event1Data);
  await logEvent1Tx.wait();
  console.log(`  ✓ Batch 1: Temperature check logged`);

  // Event for Batch 2 (at Distributor)
  const trackAndTraceAsDistributor2 = trackAndTrace.connect(accounts[4]);
  const event2Data = JSON.stringify({
    eventType: "location_update",
    location: { facility: "Distribution Center B", city: "New York" },
    transitStatus: "in_storage",
  });
  const logEvent2Tx = await trackAndTraceAsDistributor2.logEvent(2, event2Data);
  await logEvent2Tx.wait();
  console.log(`  ✓ Batch 2: Location update logged`);

  console.log();

  // ==========================================
  // STEP 7: Save Configuration
  // ==========================================
  console.log("Step 7: Saving local setup configuration...");

  const setupInfo: LocalSetupInfo = {
    network: networkName,
    chainId: Number(resolvedNetwork.chainId),
    timestamp: new Date().toISOString(),
    contracts: {
      StakeholderRegistry: stakeholderRegistryAddress,
      DigitalBatch: digitalBatchAddress,
      TrackAndTrace: trackAndTraceAddress,
    },
    testAccounts,
    sampleBatches,
  };

  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const configPath = path.join(deploymentsDir, `${networkName}.json`);
  fs.writeFileSync(configPath, JSON.stringify(setupInfo, null, 2));

  console.log("✓ Configuration saved to:", configPath);
  console.log();

  // ==========================================
  // SETUP SUMMARY
  // ==========================================
  console.log("========================================");
  console.log("     LOCAL SETUP COMPLETE!");
  console.log("========================================\n");

  console.log("Contract Addresses:");
  console.log("  StakeholderRegistry:", stakeholderRegistryAddress);
  console.log("  DigitalBatch:       ", digitalBatchAddress);
  console.log("  TrackAndTrace:      ", trackAndTraceAddress);
  console.log();

  console.log("Test Environment:");
  console.log("  Stakeholders:        7 (1 Admin, 2 Manufacturers, 2 Distributors, 2 Pharmacists)");
  console.log("  Sample Batches:     ", sampleBatches.length);
  console.log("  Custody Transfers:   3");
  console.log("  Supply Chain Events: 2");
  console.log();

  console.log("Quick Test Commands:");
  console.log("  # Check batch ownership");
  console.log(`  await digitalBatch.ownerOf(1)`);
  console.log();
  console.log("  # View custody history");
  console.log(`  await trackAndTrace.getCustodyHistory(1)`);
  console.log();
  console.log("  # View batch events");
  console.log(`  await trackAndTrace.getBatchEvents(1)`);
  console.log();

  console.log("Next Steps:");
  console.log("  1. Update backend/.env with contract addresses");
  console.log("  2. Start backend: cd packages/backend && npm run dev");
  console.log("  3. Update frontend/.env with contract addresses");
  console.log("  4. Start frontend: cd packages/frontend && npm run dev");
  console.log();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Local setup failed:");
    console.error(error);
    process.exit(1);
  });

// Helper function to get Hardhat default private keys
function getHardhatPrivateKey(index: number): string {
  const keys = [
    "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a",
    "0x7c852118294e51e653712a81e05800f419141751be58f605c371e15141b007a6",
    "0x47e179ec197488593b187f80a00eb0da91f1b9d0b13f8733639f19c30a34926a",
    "0x8b3a350cf5c34c9194ca85829a2df0ec3153be0318b5e2d3348e872092edffba",
    "0x92db14e403b83dfe3df233f83dfa3a0d7096f21ca9b0d6d6b8d88b2b4ec1564e",
    "0x4bbbf85ce3377467afe5d46f804f221813b2bb87f24d81f60f1fcdbf7cbf4356",
    "0xdbda1821b80551c9d65939329250298aa3472ba22feea921c0cf5d620ea67b97",
    "0x2a871d0798f97d79848a013d4936a73bf4cc922c825d33c1cf7073dff6d409c6",
  ];

  return keys[index] || "0x0000000000000000000000000000000000000000000000000000000000000000";
}

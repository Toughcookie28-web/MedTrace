/**
 * Working deployment script using ethers directly
 * Workaround for Hardhat 3.x ethers plugin issue
 */

import { ethers as ethersLib } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  console.log("\n========================================");
  console.log("   PharmaLedger Contract Deployment");
  console.log("========================================\n");

  // Import Hardhat dynamically
  const { default: hre } = await import("hardhat");
  const { network } = hre;

  // Connect to network
  const connection = await network.connect();

  // Create provider and wallet
  const provider = new ethersLib.JsonRpcProvider("http://127.0.0.1:8545");
  const accounts = await provider.listAccounts();

  if (accounts.length === 0) {
    throw new Error("No accounts available. Make sure Hardhat node is running.");
  }

  // Get deployer signer
  const deployer = await provider.getSigner(0);
  console.log("Deploying with:", await deployer.getAddress());
  console.log("Balance:", ethersLib.formatEther(await provider.getBalance(await deployer.getAddress())), "ETH\n");

  // Read contract artifacts
  const stakeholderRegistryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/StakeholderRegistry.sol/StakeholderRegistry.json"),
      "utf8"
    )
  );

  const digitalBatchArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/DigitalBatch.sol/DigitalBatch.json"),
      "utf8"
    )
  );

  const trackAndTraceArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/TrackAndTrace.sol/TrackAndTrace.json"),
      "utf8"
    )
  );

  const supplyChainEventsArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/SupplyChainEvents.sol/SupplyChainEvents.json"),
      "utf8"
    )
  );

  const partnershipRegistryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/PartnershipRegistry.sol/PartnershipRegistry.json"),
      "utf8"
    )
  );


  // Deploy StakeholderRegistry
  console.log("Step 1: Deploying StakeholderRegistry...");
  const StakeholderRegistryFactory = new ethersLib.ContractFactory(
    stakeholderRegistryArtifact.abi,
    stakeholderRegistryArtifact.bytecode,
    deployer
  );
  const stakeholderRegistry = await StakeholderRegistryFactory.deploy();
  await stakeholderRegistry.waitForDeployment();
  const stakeholderRegistryAddress = await stakeholderRegistry.getAddress();
  console.log("✓ StakeholderRegistry deployed to:", stakeholderRegistryAddress);
  console.log();

  // Deploy DigitalBatch
  console.log("Step 2: Deploying DigitalBatch...");
  const DigitalBatchFactory = new ethersLib.ContractFactory(
    digitalBatchArtifact.abi,
    digitalBatchArtifact.bytecode,
    deployer
  );
  const digitalBatch = await DigitalBatchFactory.deploy(stakeholderRegistryAddress);
  await digitalBatch.waitForDeployment();
  const digitalBatchAddress = await digitalBatch.getAddress();
  console.log("✓ DigitalBatch deployed to:", digitalBatchAddress);
  console.log();

  // Deploy PartnershipRegistry
  console.log("Step 3: Deploying PartnershipRegistry...");
  const PartnershipRegistryFactory = new ethersLib.ContractFactory(
    partnershipRegistryArtifact.abi,
    partnershipRegistryArtifact.bytecode,
    deployer
  );
  const partnershipRegistry = await PartnershipRegistryFactory.deploy(stakeholderRegistryAddress);
  await partnershipRegistry.waitForDeployment();
  const partnershipRegistryAddress = await partnershipRegistry.getAddress();
  console.log("✓ PartnershipRegistry deployed to:", partnershipRegistryAddress);
  console.log();

  // Deploy TrackAndTrace
  console.log("Step 4: Deploying TrackAndTrace...");
  const TrackAndTraceFactory = new ethersLib.ContractFactory(
    trackAndTraceArtifact.abi,
    trackAndTraceArtifact.bytecode,
    deployer
  );
  const trackAndTrace = await TrackAndTraceFactory.deploy(
    stakeholderRegistryAddress,
    digitalBatchAddress
  );
  await trackAndTrace.waitForDeployment();
  const trackAndTraceAddress = await trackAndTrace.getAddress();
  console.log("✓ TrackAndTrace deployed to:", trackAndTraceAddress);
  console.log();

  // Deploy SupplyChainEvents
  console.log("Step 5: Deploying SupplyChainEvents...");
  const SupplyChainEventsFactory = new ethersLib.ContractFactory(
    supplyChainEventsArtifact.abi,
    supplyChainEventsArtifact.bytecode,
    deployer
  );
  const supplyChainEvents = await SupplyChainEventsFactory.deploy(digitalBatchAddress);
  await supplyChainEvents.waitForDeployment();
  const supplyChainEventsAddress = await supplyChainEvents.getAddress();
  console.log("✓ SupplyChainEvents deployed to:", supplyChainEventsAddress);
  console.log();

  // Set custody manager
  console.log("Step 6: Setting TrackAndTrace as custody manager...");
  const setCustodyTx = await digitalBatch.updateCustodyManager(trackAndTraceAddress);
  await setCustodyTx.wait();
  console.log("✓ Custody manager set");
  console.log();

  // Set PartnershipRegistry as role admin for Distributor and Pharmacist roles
  console.log("Step 7: Setting PartnershipRegistry as role admin...");
  const setDistributorAdminTx = await stakeholderRegistry.setRoleAdmin(2, partnershipRegistryAddress); // Role.Distributor = 2
  await setDistributorAdminTx.wait();
  console.log("✓ PartnershipRegistry set as Distributor role admin");

  const setPharmacistAdminTx = await stakeholderRegistry.setRoleAdmin(3, partnershipRegistryAddress); // Role.Pharmacist = 3
  await setPharmacistAdminTx.wait();
  console.log("✓ PartnershipRegistry set as Pharmacist role admin");
  console.log();

  // Save deployment info
  console.log("Step 8: Saving deployment information...");
  const deploymentsDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentsDir)) {
    fs.mkdirSync(deploymentsDir, { recursive: true });
  }

  const deploymentInfo = {
    network: network.name,
    chainId: (await provider.getNetwork()).chainId.toString(),
    deployer: await deployer.getAddress(),
    timestamp: new Date().toISOString(),
    contracts: {
      StakeholderRegistry: stakeholderRegistryAddress,
      DigitalBatch: digitalBatchAddress,
      TrackAndTrace: trackAndTraceAddress,
      SupplyChainEvents: supplyChainEventsAddress,
      PartnershipRegistry: partnershipRegistryAddress,
    },
  };

  fs.writeFileSync(
    path.join(deploymentsDir, `${network.name}.json`),
    JSON.stringify(deploymentInfo, null, 2)
  );
  console.log("✓ Deployment info saved");
  console.log();

  console.log("========================================");
  console.log("     DEPLOYMENT SUCCESSFUL!");
  console.log("========================================\n");

  console.log("Contract Addresses:");
  console.log("  StakeholderRegistry:       ", stakeholderRegistryAddress);
  console.log("  DigitalBatch:              ", digitalBatchAddress);
  console.log("  TrackAndTrace:             ", trackAndTraceAddress);
  console.log("  SupplyChainEvents:         ", supplyChainEventsAddress);
  console.log("  PartnershipRegistry:       ", partnershipRegistryAddress);
  console.log();

  console.log("Next Steps:");
  console.log("  1. Update backend/.env with contract addresses");
  console.log("  2. Update frontend/.env with contract addresses");
  console.log("  3. Start backend: cd packages/backend && npm run dev");
  console.log("  4. Start frontend: cd packages/frontend && npm run dev");
  console.log();

  await connection.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

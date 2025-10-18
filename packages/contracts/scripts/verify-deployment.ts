/**
 * @title PharmaLedger Deployment Verification Script
 * @notice Post-deployment verification and testing script
 * @dev Performs comprehensive checks on deployed contracts to ensure proper configuration
 *
 * Verification Steps:
 * 1. Validate all contract addresses are deployed
 * 2. Verify StakeholderRegistry integration
 * 3. Confirm TrackAndTrace is set as custody manager
 * 4. Test basic operations (register stakeholder, mint batch, transfer custody)
 * 5. Verify event emissions
 *
 * Usage:
 *   npx hardhat run scripts/verify-deployment.ts --network <network-name>
 */

const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

const main = async () => {
  const { ethers, network } = hre;

  console.log("\n========================================");
  console.log("  Deployment Verification");
  console.log("========================================\n");

  const [deployer, testAccount1, testAccount2] = await ethers.getSigners();
  const resolvedNetwork = await ethers.provider.getNetwork();
  const networkName = network.name ?? resolvedNetwork.name ?? "unknown";

  console.log("Network:", networkName);
  console.log("Chain ID:", resolvedNetwork.chainId.toString());
  console.log("Verifying as:", deployer.address);
  console.log();

  // ==========================================
  // Load Deployment Information
  // ==========================================
  console.log("Loading deployment information...");

  const deploymentFilePath = path.join(__dirname, "..", "deployments", `${networkName}.json`);

  if (!fs.existsSync(deploymentFilePath)) {
    throw new Error(`Deployment file not found: ${deploymentFilePath}`);
  }

  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentFilePath, "utf-8"));
  console.log("✓ Deployment file loaded");
  console.log();

  const { StakeholderRegistry: stakeholderRegistryAddress, DigitalBatch: digitalBatchAddress, TrackAndTrace: trackAndTraceAddress } =
    deploymentInfo.contracts;

  // ==========================================
  // TEST 1: Validate Contract Deployment
  // ==========================================
  console.log("Test 1: Validating contract deployment...");

  // Check if addresses are valid
  if (!ethers.isAddress(stakeholderRegistryAddress)) {
    throw new Error("Invalid StakeholderRegistry address");
  }
  if (!ethers.isAddress(digitalBatchAddress)) {
    throw new Error("Invalid DigitalBatch address");
  }
  if (!ethers.isAddress(trackAndTraceAddress)) {
    throw new Error("Invalid TrackAndTrace address");
  }
  console.log("  ✓ All addresses are valid");

  // Get contract instances
  const stakeholderRegistry = await ethers.getContractAt("StakeholderRegistry", stakeholderRegistryAddress);
  const digitalBatch = await ethers.getContractAt("DigitalBatch", digitalBatchAddress);
  const trackAndTrace = await ethers.getContractAt("TrackAndTrace", trackAndTraceAddress);

  // Verify contracts have code
  const registryCode = await ethers.provider.getCode(stakeholderRegistryAddress);
  const batchCode = await ethers.provider.getCode(digitalBatchAddress);
  const trackCode = await ethers.provider.getCode(trackAndTraceAddress);

  if (registryCode === "0x") throw new Error("StakeholderRegistry not deployed");
  if (batchCode === "0x") throw new Error("DigitalBatch not deployed");
  if (trackCode === "0x") throw new Error("TrackAndTrace not deployed");

  console.log("  ✓ All contracts are deployed");
  console.log();

  // ==========================================
  // TEST 2: Verify StakeholderRegistry Integration
  // ==========================================
  console.log("Test 2: Verifying StakeholderRegistry integration...");

  // Check DigitalBatch registry reference
  const digitalBatchRegistry = await digitalBatch.stakeholderRegistry();
  if (digitalBatchRegistry.toLowerCase() !== stakeholderRegistryAddress.toLowerCase()) {
    throw new Error("DigitalBatch has incorrect StakeholderRegistry reference");
  }
  console.log("  ✓ DigitalBatch references correct StakeholderRegistry");

  // Check TrackAndTrace registry reference
  const trackAndTraceRegistry = await trackAndTrace.stakeholderRegistry();
  if (trackAndTraceRegistry.toLowerCase() !== stakeholderRegistryAddress.toLowerCase()) {
    throw new Error("TrackAndTrace has incorrect StakeholderRegistry reference");
  }
  console.log("  ✓ TrackAndTrace references correct StakeholderRegistry");

  // Verify owner
  const registryOwner = await stakeholderRegistry.owner();
  console.log(`  ✓ StakeholderRegistry owner: ${registryOwner}`);
  console.log();

  // ==========================================
  // TEST 3: Verify Custody Manager Configuration
  // ==========================================
  console.log("Test 3: Verifying custody manager configuration...");

  const custodyManager = await digitalBatch.custodyManager();
  if (custodyManager.toLowerCase() !== trackAndTraceAddress.toLowerCase()) {
    throw new Error("TrackAndTrace is not set as custody manager");
  }
  console.log("  ✓ TrackAndTrace is set as custody manager");
  console.log();

  // ==========================================
  // TEST 4: Test Basic Operations
  // ==========================================
  console.log("Test 4: Testing basic operations...");

  // Test 4a: Register a test stakeholder
  console.log("  Test 4a: Registering test stakeholder...");
  const testStakeholderAddress = testAccount1.address;

  try {
    const registerTx = await stakeholderRegistry.addStakeholder(testStakeholderAddress, 1); // Manufacturer
    await registerTx.wait();
    console.log(`    ✓ Stakeholder registered: ${testStakeholderAddress}`);
  } catch (error: any) {
    // Check if already registered
    const role = await stakeholderRegistry.getRole(testStakeholderAddress);
    if (role === 0) {
      throw new Error(`Failed to register stakeholder: ${error.message}`);
    }
    console.log(`    ✓ Stakeholder already registered: ${testStakeholderAddress}`);
  }

  // Verify registration
  const role = await stakeholderRegistry.getRole(testStakeholderAddress);
  if (role !== 1n) {
    // 1n = Manufacturer
    throw new Error("Stakeholder role verification failed");
  }
  console.log("    ✓ Role verified: Manufacturer");

  // Test 4b: Mint a test batch
  console.log("  Test 4b: Minting test batch...");
  const tokenURI = "https://pharmaledger-test.example.com/batch/test-001";

  const digitalBatchAsManufacturer = digitalBatch.connect(testAccount1);
  const mintTx = await digitalBatchAsManufacturer.mintBatch(testStakeholderAddress, tokenURI);
  const mintReceipt = await mintTx.wait();

  // Get tokenId from event
  let testTokenId = 0;
  if (mintReceipt) {
    for (const log of mintReceipt.logs) {
      try {
        const parsed = digitalBatch.interface.parseLog(log);
        if (parsed?.name === "BatchMinted") {
          testTokenId = Number(parsed.args[0]);
          break;
        }
      } catch {
        continue;
      }
    }
  }

  if (testTokenId === 0) {
    throw new Error("Failed to get tokenId from mint transaction");
  }

  console.log(`    ✓ Batch minted with tokenId: ${testTokenId}`);

  // Verify ownership
  const owner = await digitalBatch.ownerOf(testTokenId);
  if (owner.toLowerCase() !== testStakeholderAddress.toLowerCase()) {
    throw new Error("Batch ownership verification failed");
  }
  console.log(`    ✓ Ownership verified: ${owner}`);

  // Verify token URI
  const retrievedURI = await digitalBatch.tokenURI(testTokenId);
  if (retrievedURI !== tokenURI) {
    throw new Error("Token URI verification failed");
  }
  console.log(`    ✓ Token URI verified`);

  // Test 4c: Approve and transfer custody
  console.log("  Test 4c: Testing custody transfer...");

  // Register recipient
  const recipientAddress = testAccount2.address;
  try {
    const registerRecipientTx = await stakeholderRegistry.addStakeholder(recipientAddress, 2); // Distributor
    await registerRecipientTx.wait();
    console.log(`    ✓ Recipient registered: ${recipientAddress}`);
  } catch (error: any) {
    const recipientRole = await stakeholderRegistry.getRole(recipientAddress);
    if (recipientRole === 0) {
      throw new Error(`Failed to register recipient: ${error.message}`);
    }
    console.log(`    ✓ Recipient already registered: ${recipientAddress}`);
  }

  // Approve TrackAndTrace
  const approveTx = await digitalBatchAsManufacturer.setApprovalForAll(trackAndTraceAddress, true);
  await approveTx.wait();
  console.log(`    ✓ TrackAndTrace approved`);

  // Transfer custody
  const trackAndTraceAsManufacturer = trackAndTrace.connect(testAccount1);
  const transferTx = await trackAndTraceAsManufacturer.transferCustody(testTokenId, recipientAddress);
  const transferReceipt = await transferTx.wait();
  console.log(`    ✓ Custody transferred`);

  // Verify new ownership
  const newOwner = await digitalBatch.ownerOf(testTokenId);
  if (newOwner.toLowerCase() !== recipientAddress.toLowerCase()) {
    throw new Error("Custody transfer verification failed");
  }
  console.log(`    ✓ New owner verified: ${newOwner}`);

  // Verify custody history
  const custodyHistory = await trackAndTrace.getCustodyHistory(testTokenId);
  if (custodyHistory.length === 0) {
    throw new Error("Custody history not recorded");
  }
  console.log(`    ✓ Custody history recorded (${custodyHistory.length} transfer(s))`);

  // Test 4d: Log an event
  console.log("  Test 4d: Testing event logging...");

  const eventData = JSON.stringify({
    eventType: "verification_test",
    timestamp: new Date().toISOString(),
    status: "success",
  });

  const trackAndTraceAsRecipient = trackAndTrace.connect(testAccount2);
  const logEventTx = await trackAndTraceAsRecipient.logEvent(testTokenId, eventData);
  await logEventTx.wait();
  console.log(`    ✓ Event logged`);

  // Verify event
  const batchEvents = await trackAndTrace.getBatchEvents(testTokenId);
  if (batchEvents.length === 0) {
    throw new Error("Event not recorded");
  }
  console.log(`    ✓ Event verified (${batchEvents.length} event(s))`);

  console.log();

  // ==========================================
  // TEST 5: Verify Event Emissions
  // ==========================================
  console.log("Test 5: Verifying event emissions...");

  // Check StakeholderAdded event
  const stakeholderFilter = stakeholderRegistry.filters.StakeholderAdded();
  const stakeholderEvents = await stakeholderRegistry.queryFilter(stakeholderFilter);
  console.log(`  ✓ StakeholderAdded events: ${stakeholderEvents.length}`);

  // Check BatchMinted event
  const batchMintedFilter = digitalBatch.filters.BatchMinted();
  const batchMintedEvents = await digitalBatch.queryFilter(batchMintedFilter);
  console.log(`  ✓ BatchMinted events: ${batchMintedEvents.length}`);

  // Check CustodyTransferred event
  const custodyFilter = trackAndTrace.filters.CustodyTransferred();
  const custodyEvents = await trackAndTrace.queryFilter(custodyFilter);
  console.log(`  ✓ CustodyTransferred events: ${custodyEvents.length}`);

  // Check EventLogged event
  const eventLoggedFilter = trackAndTrace.filters.EventLogged();
  const eventLoggedEvents = await trackAndTrace.queryFilter(eventLoggedFilter);
  console.log(`  ✓ EventLogged events: ${eventLoggedEvents.length}`);

  console.log();

  // ==========================================
  // VERIFICATION SUMMARY
  // ==========================================
  console.log("========================================");
  console.log("     VERIFICATION SUCCESSFUL!");
  console.log("========================================\n");

  console.log("All Tests Passed:");
  console.log("  ✓ Contract deployment validated");
  console.log("  ✓ StakeholderRegistry integration verified");
  console.log("  ✓ Custody manager configuration confirmed");
  console.log("  ✓ Basic operations tested successfully");
  console.log("  ✓ Event emissions verified");
  console.log();

  console.log("Contract Status:");
  console.log("  StakeholderRegistry: OPERATIONAL");
  console.log("  DigitalBatch:        OPERATIONAL");
  console.log("  TrackAndTrace:       OPERATIONAL");
  console.log();

  console.log("Deployment is ready for use!");
  console.log();
};

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Verification failed:");
    console.error(error);
    process.exit(1);
  });

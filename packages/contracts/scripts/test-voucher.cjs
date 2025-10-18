/**
 * Test script for voucher partner functionality
 */
const hre = require("hardhat");

async function main() {
  const { ethers } = hre;

  console.log("\n========================================");
  console.log("  Testing Voucher Partner Function");
  console.log("========================================\n");

  // Get contract instances
  const stakeholderRegistry = await ethers.getContractAt(
    "StakeholderRegistry",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  const partnershipRegistry = await ethers.getContractAt(
    "PartnershipRegistry",
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0"
  );

  // Get accounts
  const accounts = await ethers.getSigners();
  const manufacturer1 = accounts[1]; // 0x70997970C51812dc3A010C7d01b50e0d17dc79C8
  const distributor1 = accounts[3];  // 0x90F79bf6EB2c4f870365E785982E1f101E93b906
  const pharmacist1 = accounts[5];   // 0x9965507D1a55bcC2695C58ba16FB37d819B0A4dc

  console.log("Test accounts:");
  console.log("  Manufacturer 1:", manufacturer1.address);
  console.log("  Distributor 1:", distributor1.address);
  console.log("  Pharmacist 1:", pharmacist1.address);
  console.log();

  // Check manufacturer 1 status
  console.log("Step 1: Check Manufacturer 1 status");
  const role1 = await stakeholderRegistry.getRole(manufacturer1.address);
  console.log("  Role:", role1.toString(), "(1 = Manufacturer)");

  const hasCredential = await stakeholderRegistry.hasVerifiedCredential(manufacturer1.address);
  console.log("  Has verified credential:", hasCredential);
  console.log();

  // If manufacturer doesn't have credential, apply for one
  if (!hasCredential) {
    console.log("Step 2: Manufacturer 1 applying for credential...");
    try {
      const applyTx = await stakeholderRegistry.connect(manufacturer1).applyForCredential(
        "Test Pharma Inc",
        "License-123456",
        "USA",
        "ipfs://QmTest123..."
      );
      await applyTx.wait();
      console.log("  ✓ Credential application submitted");

      // Approve credential (as deployer/admin)
      const approveTx = await stakeholderRegistry.connect(accounts[0]).approveCredential(manufacturer1.address);
      await approveTx.wait();
      console.log("  ✓ Credential approved");
      console.log();
    } catch (error) {
      console.error("  ✗ Error:", error.message);
      console.log();
    }
  } else {
    console.log("Step 2: Manufacturer 1 already has credential ✓");
    console.log();
  }

  // Check distributor status before vouching
  console.log("Step 3: Check Distributor 1 status (before vouching)");
  const partnership1Before = await partnershipRegistry.partnerships(distributor1.address);
  console.log("  Has active partnership:", partnership1Before.isActive);
  console.log();

  // Manufacturer vouches for Distributor
  console.log("Step 4: Manufacturer 1 vouches for Distributor 1");
  try {
    const vouchTx = await partnershipRegistry.connect(manufacturer1).establishPartnership(
      distributor1.address,
      2 // Distributor role
    );
    const receipt = await vouchTx.wait();
    console.log("  ✓ Partnership established");
    console.log("  Transaction hash:", receipt.hash);
    console.log();
  } catch (error) {
    console.error("  ✗ Error establishing partnership:", error.message);
    console.log();
  }

  // Verify the partnership
  console.log("Step 5: Verify Distributor 1 partnership");
  const partnership1After = await partnershipRegistry.partnerships(distributor1.address);
  console.log("  Voucher:", partnership1After.voucher);
  console.log("  Is active:", partnership1After.isActive);
  console.log("  Voucher role:", partnership1After.voucherRole.toString());

  // Get trust chain
  const trustChain1 = await partnershipRegistry.getTrustChain(distributor1.address);
  console.log("  Trust chain length:", trustChain1.length);
  for (let i = 0; i < trustChain1.length; i++) {
    console.log(`    [${i}]:`, trustChain1[i]);
  }
  console.log();

  // Distributor vouches for Pharmacist (recursive vouching)
  console.log("Step 6: Distributor 1 vouches for Pharmacist 1 (recursive)");
  try {
    const vouchTx2 = await partnershipRegistry.connect(distributor1).establishPartnership(
      pharmacist1.address,
      3 // Pharmacist role
    );
    const receipt2 = await vouchTx2.wait();
    console.log("  ✓ Partnership established");
    console.log("  Transaction hash:", receipt2.hash);
    console.log();
  } catch (error) {
    console.error("  ✗ Error establishing partnership:", error.message);
    console.log();
  }

  // Verify pharmacist partnership
  console.log("Step 7: Verify Pharmacist 1 partnership");
  const partnership2After = await partnershipRegistry.partnerships(pharmacist1.address);
  console.log("  Voucher:", partnership2After.voucher);
  console.log("  Is active:", partnership2After.isActive);

  // Get full trust chain
  const trustChain2 = await partnershipRegistry.getTrustChain(pharmacist1.address);
  console.log("  Trust chain length:", trustChain2.length);
  for (let i = 0; i < trustChain2.length; i++) {
    console.log(`    [${i}]:`, trustChain2[i]);
  }

  // Verify trust chain back to manufacturer
  const [isValid, rootManufacturer] = await partnershipRegistry.verifyTrustChain(pharmacist1.address);
  console.log("  Trust chain valid:", isValid);
  console.log("  Root manufacturer:", rootManufacturer);
  console.log();

  console.log("========================================");
  console.log("  Test Complete!");
  console.log("========================================\n");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  });

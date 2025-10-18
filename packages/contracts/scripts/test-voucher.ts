/**
 * Test script for voucher partner functionality
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
  console.log("  Testing Voucher Partner Function");
  console.log("========================================\n");

  // Import Hardhat dynamically
  const { default: hre } = await import("hardhat");
  const { network } = hre;

  // Connect to network
  const connection = await network.connect();

  // Create provider
  const provider = new ethersLib.JsonRpcProvider("http://127.0.0.1:8545");

  // Get signers
  const deployer = await provider.getSigner(0);
  const manufacturer1 = await provider.getSigner(1);
  const distributor1 = await provider.getSigner(3);
  const pharmacist1 = await provider.getSigner(5);

  console.log("Test accounts:");
  console.log("  Manufacturer 1:", await manufacturer1.getAddress());
  console.log("  Distributor 1:", await distributor1.getAddress());
  console.log("  Pharmacist 1:", await pharmacist1.getAddress());
  console.log();

  // Load contract artifacts
  const stakeholderRegistryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/StakeholderRegistry.sol/StakeholderRegistry.json"),
      "utf8"
    )
  );

  const partnershipRegistryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/PartnershipRegistry.sol/PartnershipRegistry.json"),
      "utf8"
    )
  );

  // Connect to deployed contracts
  const stakeholderRegistry = new ethersLib.Contract(
    "0x5FbDB2315678afecb367f032d93F642f64180aa3",
    stakeholderRegistryArtifact.abi,
    provider
  );

  const partnershipRegistry = new ethersLib.Contract(
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    partnershipRegistryArtifact.abi,
    provider
  );

  // Check manufacturer 1 status
  console.log("Step 1: Check Manufacturer 1 status");
  const manufacturer1Address = await manufacturer1.getAddress();
  const role1 = await stakeholderRegistry.getRole(manufacturer1Address);
  console.log("  Role:", role1.toString(), "(1 = Manufacturer)");

  const hasCredential = await stakeholderRegistry.hasVerifiedCredential(manufacturer1Address);
  console.log("  Has verified credential:", hasCredential);
  console.log();

  // If manufacturer doesn't have credential, apply for one
  if (!hasCredential) {
    console.log("Step 2: Manufacturer 1 applying for credential...");
    try {
      const stakeholderRegistryWithSigner = stakeholderRegistry.connect(manufacturer1) as any;
      const applyTx = await stakeholderRegistryWithSigner.applyForCredential(
        "ipfs://QmTest123...",  // licenseHash
        "123456",               // businessRegNum
        "FDA"                   // issuingAuthority
      );
      await applyTx.wait();
      console.log("  ✓ Credential application submitted and auto-approved");
      console.log();
    } catch (error: any) {
      console.error("  ✗ Error:", error.message);
      console.log();
    }
  } else {
    console.log("Step 2: Manufacturer 1 already has credential ✓");
    console.log();
  }

  // Check distributor status before vouching
  console.log("Step 3: Check Distributor 1 status (before vouching)");
  const distributor1Address = await distributor1.getAddress();
  const partnership1Before = await partnershipRegistry.partnerships(distributor1Address);
  console.log("  Has active partnership:", partnership1Before.isActive);
  console.log();

  // Manufacturer vouches for Distributor
  console.log("Step 4: Manufacturer 1 vouches for Distributor 1");
  try {
    const partnershipRegistryWithManufacturer = partnershipRegistry.connect(manufacturer1) as any;
    const vouchTx = await partnershipRegistryWithManufacturer.establishPartnership(
      distributor1Address,
      2 // Distributor role
    );
    const receipt = await vouchTx.wait();
    console.log("  ✓ Partnership established");
    console.log("  Transaction hash:", receipt.hash);
    console.log();
  } catch (error: any) {
    console.error("  ✗ Error establishing partnership:", error.message);
    if (error.message.includes("Manufacturer lacks verified credential")) {
      console.error("  → Manufacturer needs to have a verified credential first");
    }
    console.log();
  }

  // Verify the partnership
  console.log("Step 5: Verify Distributor 1 partnership");
  const partnership1After = await partnershipRegistry.partnerships(distributor1Address);
  console.log("  Voucher:", partnership1After.voucher);
  console.log("  Is active:", partnership1After.isActive);
  console.log("  Voucher role:", partnership1After.voucherRole.toString());

  // Get trust chain
  const trustChain1 = await partnershipRegistry.getTrustChain(distributor1Address);
  console.log("  Trust chain length:", trustChain1.length);
  for (let i = 0; i < trustChain1.length; i++) {
    console.log(`    [${i}]:`, trustChain1[i]);
  }
  console.log();

  // Distributor vouches for Pharmacist (recursive vouching)
  console.log("Step 6: Distributor 1 vouches for Pharmacist 1 (recursive)");
  try {
    const partnershipRegistryWithDistributor = partnershipRegistry.connect(distributor1) as any;
    const pharmacist1Address = await pharmacist1.getAddress();
    const vouchTx2 = await partnershipRegistryWithDistributor.establishPartnership(
      pharmacist1Address,
      3 // Pharmacist role
    );
    const receipt2 = await vouchTx2.wait();
    console.log("  ✓ Partnership established");
    console.log("  Transaction hash:", receipt2.hash);
    console.log();
  } catch (error: any) {
    console.error("  ✗ Error establishing partnership:", error.message);
    if (error.message.includes("must be verified through trust chain")) {
      console.error("  → Distributor needs to be vouched for first");
    }
    console.log();
  }

  // Verify pharmacist partnership
  console.log("Step 7: Verify Pharmacist 1 partnership");
  const pharmacist1Address = await pharmacist1.getAddress();
  const partnership2After = await partnershipRegistry.partnerships(pharmacist1Address);
  console.log("  Voucher:", partnership2After.voucher);
  console.log("  Is active:", partnership2After.isActive);

  // Get full trust chain
  const trustChain2 = await partnershipRegistry.getTrustChain(pharmacist1Address);
  console.log("  Trust chain length:", trustChain2.length);
  for (let i = 0; i < trustChain2.length; i++) {
    console.log(`    [${i}]:`, trustChain2[i]);
  }

  // Verify trust chain back to manufacturer
  const [isValid, rootManufacturer] = await partnershipRegistry.verifyTrustChain(pharmacist1Address);
  console.log("  Trust chain valid:", isValid);
  console.log("  Root manufacturer:", rootManufacturer);
  console.log();

  console.log("========================================");
  console.log("  Test Complete!");
  console.log("========================================\n");

  await connection.close();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Test failed:");
    console.error(error);
    process.exit(1);
  });

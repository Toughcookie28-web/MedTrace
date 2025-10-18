/**
 * Script to pre-register manufacturer accounts with the Manufacturer role
 *
 * This script ONLY assigns the Manufacturer role to accounts, it does NOT:
 * - Apply for credentials (done via UI)
 * - Vouch for partners (done via UI)
 *
 * Purpose: Bootstrap the system so the UI knows which accounts are manufacturers
 * and should see the "Apply for Credential" button
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
  console.log('\n========================================');
  console.log('  Pre-Registering Manufacturer Roles');
  console.log('========================================\n');

  // Connect to local Hardhat node
  const provider = new ethersLib.JsonRpcProvider("http://127.0.0.1:8545");

  // Get signers
  const deployer = await provider.getSigner(0);
  const account1 = await provider.getSigner(1);
  const account2 = await provider.getSigner(2);
  const account3 = await provider.getSigner(3);

  const deployerAddress = await deployer.getAddress();
  const account1Address = await account1.getAddress();
  const account2Address = await account2.getAddress();
  const account3Address = await account3.getAddress();

  console.log('Admin (deployer):', deployerAddress);
  console.log('\nAccounts to pre-register as Manufacturers:');
  console.log('  Account 1:', account1Address);
  console.log('  Account 2:', account2Address);
  console.log('  Account 3:', account3Address);

  // Read deployment info
  const deploymentInfoPath = path.join(__dirname, "..", "deployments", "undefined.json");
  const deploymentInfo = JSON.parse(fs.readFileSync(deploymentInfoPath, "utf8"));

  const stakeholderRegistryAddress = deploymentInfo.contracts.StakeholderRegistry;
  console.log('\nStakeholderRegistry:', stakeholderRegistryAddress);

  // Read StakeholderRegistry artifact
  const artifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "../artifacts/contracts/StakeholderRegistry.sol/StakeholderRegistry.json"),
      "utf8"
    )
  );

  // Create contract instance
  const registry = new ethersLib.Contract(
    stakeholderRegistryAddress,
    artifact.abi,
    deployer
  );

  // Define manufacturers
  const manufacturers = [
    { address: account1Address, name: 'PharmaCorp' },
    { address: account2Address, name: 'MediTech Labs' },
    { address: account3Address, name: 'Global Pharma Inc' },
  ];

  console.log('\nPre-registering manufacturer roles...\n');

  for (const manufacturer of manufacturers) {
    try {
      const tx = await registry.addStakeholder(
        manufacturer.address,
        1 // Manufacturer role
      );
      await tx.wait();
      console.log(`✓ Pre-registered: ${manufacturer.name} (${manufacturer.address})`);
    } catch (error: any) {
      console.error(`✗ Failed to pre-register ${manufacturer.name}:`, error.message);
    }
  }

  console.log('\n========================================');
  console.log('  Pre-Registration Complete!');
  console.log('========================================\n');

  // Verify registrations
  console.log('Verifying role assignments...\n');
  for (const manufacturer of manufacturers) {
    const role = await registry.getRole(manufacturer.address);
    const roleName = role === 1n ? '✓ Manufacturer' : '✗ Wrong role';
    console.log(`  ${manufacturer.address}: Role = ${role} ${roleName}`);
  }

  console.log('\n📝 Important Notes:');
  console.log('  - These accounts now have the Manufacturer ROLE assigned');
  console.log('  - They still need to APPLY FOR CREDENTIALS via the frontend');
  console.log('  - The "Apply for Credential" button will now appear for these accounts');
  console.log('  - After applying for credentials, they can vouch for distributors/pharmacists');
  console.log('\n✅ Next steps:');
  console.log('  1. Open frontend at http://localhost:5174');
  console.log('  2. Connect MetaMask with Account 1, 2, or 3');
  console.log('  3. Click "Apply for Credential" button');
  console.log('  4. Fill out the credential form and submit');
  console.log('  5. Once approved, you can vouch for partners\n');
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

// Check credential and role status
const hre = require("hardhat");

async function main() {
  const address = process.argv[2];

  if (!address) {
    console.log("Usage: npx hardhat run scripts/check-status.js --network localhost <address>");
    process.exit(1);
  }

  // Get contract
  const stakeholderRegistry = await hre.ethers.getContractAt(
    "StakeholderRegistry",
    "0x5FbDB2315678afecb367f032d93F642f64180aa3"
  );

  // Check role
  const role = await stakeholderRegistry.getRole(address);
  const roleNames = ['None', 'Manufacturer', 'Distributor', 'Pharmacist'];

  // Check credential
  const hasCredential = await stakeholderRegistry.hasVerifiedCredential(address);

  console.log("\n========================================");
  console.log("Account Status Check");
  console.log("========================================");
  console.log("Address:", address);
  console.log("Role:", roleNames[Number(role)], `(${role})`);
  console.log("Has Verified Credential:", hasCredential);
  console.log("========================================\n");

  if (Number(role) === 1 && !hasCredential) {
    console.log("⚠️  WARNING: You are a Manufacturer but need to apply for credentials!");
    console.log("Go to the app and click '📜 Apply for Credential'\n");
  } else if (Number(role) === 1 && hasCredential) {
    console.log("✅ All good! You can vouch for partners.\n");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

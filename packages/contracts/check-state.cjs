const hre = require("hardhat");

async function main() {
  const { ethers } = hre;
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  const registryAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Read ABI
  const fs = require("fs");
  const path = require("path");
  const artifact = JSON.parse(fs.readFileSync(
    path.join(__dirname, "artifacts/contracts/StakeholderRegistry.sol/StakeholderRegistry.json"),
    "utf8"
  ));
  
  const registry = new ethers.Contract(registryAddress, artifact.abi, provider);
  
  console.log("\n=== Checking Manufacturer Accounts ===\n");
  
  const manufacturers = [
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8",
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC"
  ];
  
  for (const addr of manufacturers) {
    console.log("Address:", addr);
    try {
      const role = await registry.getRole(addr);
      console.log("  Role:", role.toString());
      
      const hasCred = await registry.hasVerifiedCredential(addr);
      console.log("  Has Credential:", hasCred);
      
      const isStakeholder = await registry.isStakeholder(addr);
      console.log("  Is Stakeholder:", isStakeholder);
    } catch (err) {
      console.log("  Error:", err.message);
    }
    console.log("");
  }
}

main().then(() => process.exit(0)).catch(console.error);

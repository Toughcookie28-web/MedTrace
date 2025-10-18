const { ethers } = require("hardhat");

async function main() {
  const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");
  
  console.log("\n=== Checking Hardhat Node Accounts ===\n");
  
  // Get the default Hardhat accounts
  const accounts = await provider.listAccounts();
  console.log("Number of accounts:", accounts.length);
  
  // Check first 5 accounts
  for (let i = 0; i < Math.min(5, accounts.length); i++) {
    const address = accounts[i].address;
    const balance = await provider.getBalance(address);
    console.log(`Account ${i}: ${address}`);
    console.log(`Balance: ${ethers.formatEther(balance)} ETH\n`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

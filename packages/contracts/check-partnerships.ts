import { ethers as ethersLib } from "ethers";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function main() {
  const provider = new ethersLib.JsonRpcProvider("http://127.0.0.1:8545");
  
  const partnershipRegistryArtifact = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "artifacts/contracts/PartnershipRegistry.sol/PartnershipRegistry.json"),
      "utf8"
    )
  );
  
  const partnershipRegistry = new ethersLib.Contract(
    "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
    partnershipRegistryArtifact.abi,
    provider
  );
  
  console.log("\n=== Checking Partnership Status ===\n");
  
  const distributor1 = "0x90F79bf6EB2c4f870365E785982E1f101E93b906";
  const distributor2 = "0x15d34AAf54267DB7D7c367839AAf71A00a2C6A65";
  
  console.log("Distributor #1:", distributor1);
  const p1 = await partnershipRegistry.partnerships(distributor1);
  console.log("  Voucher:", p1.voucher);
  console.log("  Is Active:", p1.isActive);
  console.log("  Already vouched:", p1.voucher !== "0x0000000000000000000000000000000000000000" && p1.isActive);
  console.log("");
  
  console.log("Distributor #2:", distributor2);
  const p2 = await partnershipRegistry.partnerships(distributor2);
  console.log("  Voucher:", p2.voucher);
  console.log("  Is Active:", p2.isActive);
  console.log("  Already vouched:", p2.voucher !== "0x0000000000000000000000000000000000000000" && p2.isActive);
}

main().then(() => process.exit(0)).catch(console.error);

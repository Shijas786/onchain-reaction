// Helper script to get the oracle wallet address from ORACLE_PRIVATE_KEY
// Usage: npx tsx scripts/getOracleAddress.ts

import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";

const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;

if (!ORACLE_PK) {
  console.error("❌ Error: ORACLE_PRIVATE_KEY not found in environment variables");
  console.log("\nPlease add ORACLE_PRIVATE_KEY to your .env file");
  process.exit(1);
}

try {
  const account = privateKeyToAccount(ORACLE_PK);
  console.log("✅ Oracle wallet address:");
  console.log(account.address);
  console.log("\n📝 Use this address when calling setOracle() on your contract");
  console.log("   Example: contract.setOracle('" + account.address + "')");
} catch (error) {
  console.error("❌ Error deriving address from private key:", error);
  process.exit(1);
}




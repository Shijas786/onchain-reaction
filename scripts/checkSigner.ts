import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
import { privateKeyToAccount } from "viem/accounts";

const PRIVATE_KEY = process.env.PRIVATE_KEY as `0x${string}`;
const ORACLE_PK = process.env.ORACLE_PRIVATE_KEY as `0x${string}`;

console.log("Checking Signer Addresses:");

if (PRIVATE_KEY) {
    try {
        const account = privateKeyToAccount(PRIVATE_KEY);
        console.log(`PRIVATE_KEY Address: ${account.address}`);
    } catch (e) {
        console.log(`PRIVATE_KEY: Invalid (${e.message})`);
    }
} else {
    console.log("PRIVATE_KEY: Not set");
}

if (ORACLE_PK) {
    try {
        const oracleAccount = privateKeyToAccount(ORACLE_PK);
        console.log(`ORACLE_PRIVATE_KEY Address: ${oracleAccount.address}`);
    } catch (e) {
        console.log(`ORACLE_PRIVATE_KEY: Invalid (${e.message})`);
    }
} else {
    console.log("ORACLE_PRIVATE_KEY: Not set");
}

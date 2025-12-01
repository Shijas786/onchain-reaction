import "dotenv/config";
import { privateKeyToAccount } from "viem/accounts";
import path from "path";
import dotenv from "dotenv";

// Load .env from parent directory
dotenv.config({ path: path.resolve(process.cwd(), "../.env") });

const pk = process.env.ORACLE_PRIVATE_KEY;
if (!pk) {
    console.log("No ORACLE_PRIVATE_KEY found in .env");
} else {
    try {
        const formattedPk = pk.startsWith("0x") ? pk : "0x" + pk;
        const account = privateKeyToAccount(formattedPk);
        console.log("Oracle Address:", account.address);
    } catch (e) {
        console.error("Error deriving address:", e.message);
    }
}

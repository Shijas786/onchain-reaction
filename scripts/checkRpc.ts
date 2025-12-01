import "dotenv/config";
import { createPublicClient, http } from "viem";
import { base } from "viem/chains";

const RPC_URL = process.env.RPC_URL_BASE;

console.log(`Checking RPC URL for Base:`);
console.log(`URL: ${RPC_URL ? RPC_URL.replace(/key=[^&]+/, "key=HIDDEN") : "Not Set"}`);

if (!RPC_URL) {
    console.error("❌ RPC_URL_BASE is not set!");
    process.exit(1);
}

const client = createPublicClient({
    chain: base,
    transport: http(RPC_URL),
});

async function main() {
    try {
        const blockNumber = await client.getBlockNumber();
        console.log(`✅ RPC Connection Successful! Block Number: ${blockNumber}`);
    } catch (error: any) {
        console.error("❌ RPC Connection Failed:", error.message);
    }
}

main();

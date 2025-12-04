import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ARENA_ADDRESSES, CHAIN_IDS, USDC_ADDRESSES } from "../lib/contracts";
import { onchainReactionAbi } from "../lib/onchainReaction";

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
    });

    const arenaAddress = ARENA_ADDRESSES[CHAIN_IDS.BASE];
    const usdcAddress = USDC_ADDRESSES[CHAIN_IDS.BASE];

    console.log("Checking allowed tokens on Base Arena:", arenaAddress);
    console.log("USDC Address:", usdcAddress);

    try {
        const isAllowed = await publicClient.readContract({
            address: arenaAddress,
            abi: ChainOrbArenaAbi,
            functionName: "allowedTokens",
            args: [usdcAddress],
        });
        console.log("Is USDC Allowed?", isAllowed);
    } catch (e: any) {
        console.error("Error checking allowed tokens:", e.message);
    }
}

main();

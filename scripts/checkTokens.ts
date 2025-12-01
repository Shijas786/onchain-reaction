import { createPublicClient, http } from "viem";
import { base } from "viem/chains";
import { ARENA_ADDRESSES, CHAIN_IDS, USDC_ADDRESSES } from "../lib/contracts";
import ChainOrbArenaAbi from "../abi/ChainOrbArena.json";
import ERC20Abi from "../abi/ERC20.json";

async function main() {
    const rpcUrl = "https://mainnet.base.org";
    console.log("Using RPC:", rpcUrl);

    const publicClient = createPublicClient({
        chain: base,
        transport: http(rpcUrl),
    });

    const chainId = await publicClient.getChainId();
    console.log("Connected to Chain ID:", chainId);

    const arenaAddress = ARENA_ADDRESSES[CHAIN_IDS.BASE];
    const usdcAddress = USDC_ADDRESSES[CHAIN_IDS.BASE];
    const userAddress = "0x6C31212a23040998E1D1c157ACe3982aBDBE3154";

    console.log("Checking contract state on Base...");
    console.log("Arena:", arenaAddress);
    console.log("USDC:", usdcAddress);
    console.log("User:", userAddress);

    try {
        // Simulate createMatch
        console.log("Simulating createMatch...");
        const entryFee = 1000000n; // 1 USDC
        const maxPlayers = 2n;

        try {
            const { result } = await publicClient.simulateContract({
                address: arenaAddress,
                abi: ChainOrbArenaAbi,
                functionName: "createMatch",
                args: [usdcAddress, entryFee, maxPlayers],
                account: userAddress,
            });
            console.log("Simulation Success! Result:", result);
        } catch (simError: any) {
            console.error("Simulation Failed:", simError.message || simError);
            if (simError.cause) {
                console.error("Cause:", simError.cause);
            }
            if (simError.data) {
                console.error("Data:", simError.data);
            }
        }

    } catch (error) {
        console.error("Error checking state:", error);
    }
}

main();

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

    const userCode = await publicClient.getBytecode({ address: userAddress });
    console.log("User Code Length:", userCode ? userCode.length : 0);


    try {
        const isAllowed = await publicClient.readContract({
            address: arenaAddress,
            abi: ChainOrbArenaAbi,
            functionName: "allowedTokens",
            args: [usdcAddress],
        });
        console.log(`Is USDC allowed? ${isAllowed}`);

        const feeRecipient = await publicClient.readContract({
            address: arenaAddress,
            abi: ChainOrbArenaAbi,
            functionName: "feeRecipient",
        });
        console.log("Fee Recipient:", feeRecipient);

        const feeBps = await publicClient.readContract({
            address: arenaAddress,
            abi: ChainOrbArenaAbi,
            functionName: "feeBps",
        });
        console.log("Fee BPS:", feeBps);

        try {
            const balance = await publicClient.readContract({
                address: usdcAddress,
                abi: ERC20Abi,
                functionName: "balanceOf",
                args: [userAddress],
            });
            console.log(`User Balance: ${balance}`);
        } catch (e) {
            console.error("Error checking balance:", e);
        }

        try {
            const allowance = await publicClient.readContract({
                address: usdcAddress,
                abi: ERC20Abi,
                functionName: "allowance",
                args: [userAddress, arenaAddress],
            });
            console.log(`User Allowance: ${allowance}`);
        } catch (e) {
            console.error("Error checking allowance:", e);
        }

    } catch (error) {
        console.error("Error checking state:", error);
    }
}

main();

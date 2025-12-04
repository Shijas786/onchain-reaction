import { finishMatch } from "../oracle.js";

/**
 * POST /finish
 * Body: { chainId: number, matchId: number, winner: address }
 * 
 * Called by frontend when game ends.
 * Oracle backend finalizes the match on-chain.
 */
export default async function finishHandler(req, res) {
    // Only accept POST
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    try {
        const { chainId, matchId, winner } = req.body;

        // Validate inputs
        if (!chainId || !matchId || !winner) {
            return res.status(400).json({
                error: "Missing required fields: chainId, matchId, winner"
            });
        }

        // Validate chain ID
        if (chainId !== 8453 && chainId !== 42161) {
            return res.status(400).json({
                error: "Invalid chainId. Must be 8453 (Base) or 42161 (Arbitrum)"
            });
        }

        // Validate winner address
        if (!/^0x[a-fA-F0-9]{40}$/.test(winner)) {
            return res.status(400).json({
                error: "Invalid winner address format"
            });
        }

        console.log(`[FINISH] Received request: Chain ${chainId}, Match ${matchId}, Winner ${winner}`);

        // Call oracle to finalize match
        const result = await finishMatch(chainId, matchId, winner);

        if (result.success) {
            console.log(`[FINISH] ✅ Match ${matchId} finalized successfully. Tx: ${result.txHash}`);
            return res.status(200).json({
                success: true,
                txHash: result.txHash,
                message: `Match ${matchId} finalized on chain ${chainId}`
            });
        } else {
            console.error(`[FINISH] ❌ Failed to finalize match ${matchId}:`, result.error);
            return res.status(500).json({
                success: false,
                error: result.error || "Failed to finalize match"
            });
        }

    } catch (error) {
        console.error("[FINISH] Error:", error);
        return res.status(500).json({
            success: false,
            error: error.message || "Internal server error"
        });
    }
}

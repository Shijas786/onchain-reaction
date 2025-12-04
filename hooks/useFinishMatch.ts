import { useState } from 'react';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://onchain-reaction.onrender.com';

interface FinishMatchParams {
    chainId: number;
    matchId: number;
    winner: string;
}

interface FinishMatchResult {
    success: boolean;
    txHash?: string;
    error?: string;
    message?: string;
}

export function useFinishMatch() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const finishMatch = async ({ chainId, matchId, winner }: FinishMatchParams): Promise<FinishMatchResult> => {
        setIsLoading(true);
        setError(null);
        setTxHash(null);

        try {
            console.log(`[useFinishMatch] Calling backend to finalize match ${matchId} on chain ${chainId}`);
            console.log(`[useFinishMatch] Winner: ${winner}`);

            const response = await fetch(`${BACKEND_URL}/finish`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chainId,
                    matchId,
                    winner,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            if (data.success) {
                console.log(`[useFinishMatch] ✅ Match finalized! Tx: ${data.txHash}`);
                setTxHash(data.txHash);
                return {
                    success: true,
                    txHash: data.txHash,
                    message: data.message,
                };
            } else {
                throw new Error(data.error || 'Failed to finalize match');
            }
        } catch (err: any) {
            console.error('[useFinishMatch] Error:', err);
            const errorMessage = err.message || 'Failed to finalize match';
            setError(errorMessage);
            return {
                success: false,
                error: errorMessage,
            };
        } finally {
            setIsLoading(false);
        }
    };

    return {
        finishMatch,
        isLoading,
        error,
        txHash,
    };
}

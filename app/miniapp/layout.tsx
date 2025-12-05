import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Onchain Reaction - Explosive Onchain Strategy",
    description: "A fast, real-time Chain Reaction strategy game played onchain with USDC stakes. Create rooms, compete in explosive orb battles, and claim the winner-takes-all pot.",
    other: {
        "fc:miniapp": JSON.stringify({
            version: "next",
            imageUrl: "https://onchainreaction.vercel.app/hero.png",
            button: {
                title: "Open App",
                action: {
                    type: "launch_frame",
                    url: "https://onchainreaction.vercel.app/miniapp",
                    name: "OnchainReaction",
                    splashImageUrl: "https://onchainreaction.vercel.app/splash.gif",
                    splashBackgroundColor: "#FFFFFF"
                }
            }
        })
    }
};

export default function MiniappLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}

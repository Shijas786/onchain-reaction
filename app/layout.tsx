import type { Metadata } from "next";
import { Fredoka, Schoolbell } from "next/font/google";
import "./globals.css";

import { headers } from "next/headers"; // Import headers function
import ContextProvider from "@/context"; // Adjust import path if needed

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["300", "400", "500", "600", "700"],
});

const schoolbell = Schoolbell({
  subsets: ["latin"],
  variable: "--font-schoolbell",
  weight: ["400"],
});

export const metadata: Metadata = {
  title: "Onchain Reaction",
  description: "A fast, real-time Chain Reaction strategy game played onchain with USDC stakes. Create rooms, compete in explosive orb battles, and claim the winner-takes-all pot.",
  openGraph: {
    title: "Explosive Onchain Strategy",
    description: "Play Chain Reaction with real stakes. Join rooms, make moves, and win USDC",
    images: [
      {
        url: "https://onchainreaction.vercel.app/og.png",
        width: 1200,
        height: 630,
        alt: "Onchain Reaction Game"
      }
    ],
    type: "website",
    url: "https://onchainreaction.vercel.app"
  },
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


// ATTENTION!!! RootLayout must be an async function to use headers()
export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Retrieve cookies from request headers on the server
  const headersObj = await headers(); // IMPORTANT: await the headers() call
  const cookies = headersObj.get("cookie");

  return (
    <html lang="en">
      <body
        className={`${fredoka.variable} ${schoolbell.variable} antialiased font-sans text-slate-900 select-none`}
      >
        {/* Wrap children with ContextProvider, passing cookies */}
        <ContextProvider cookies={cookies}>
          {children}
        </ContextProvider>
      </body>
    </html>
  );
}

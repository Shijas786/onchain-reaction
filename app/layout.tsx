import type { Metadata } from "next";
import { Fredoka } from "next/font/google";
import "./globals.css";

import { headers } from "next/headers"; // Import headers function
import ContextProvider from "@/context"; // Adjust import path if needed

const fredoka = Fredoka({
  subsets: ["latin"],
  variable: "--font-fredoka",
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Chain Reaction: Orbs Edition",
  description: "A cute and explosive chain reaction game!",
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
        className={`${fredoka.variable} antialiased font-sans text-slate-900 overflow-hidden select-none touch-none`}
      >
        {/* Wrap children with ContextProvider, passing cookies */}
        <ContextProvider cookies={cookies}>{children}</ContextProvider>
      </body>
    </html>
  );
}

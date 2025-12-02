import type { Metadata } from "next";
import { Fredoka, Schoolbell } from "next/font/google";
import "./globals.css";

import { headers } from "next/headers"; // Import headers function
import ContextProvider from "@/context"; // Adjust import path if needed
import FarcasterProvider from "@/components/providers/FarcasterProvider";

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
        className={`${fredoka.variable} ${schoolbell.variable} antialiased font-sans text-slate-900 select-none`}
      >
        {/* Wrap children with ContextProvider, passing cookies */}
        <ContextProvider cookies={cookies}>
          <FarcasterProvider>
            {children}
          </FarcasterProvider>
        </ContextProvider>
      </body>
    </html>
  );
}

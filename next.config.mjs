/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "ui-avatars.com",
      },
    ],
  },
  transpilePackages: ['spacetimedb'], // Fix TypeScript compilation
};

export default nextConfig;

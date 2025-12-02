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
  async headers() {
    return [
      {
        source: "/miniapp",
        headers: [
          {
            key: "Farcaster-Miniapp",
            value: "v1",
          },
        ]
      }
    ]
  }
};

export default nextConfig;

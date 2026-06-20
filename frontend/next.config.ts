import type { NextConfig } from "next";

const nextConfig = {
  devIndicators: {
    appIsrStatus: false,
    buildActivity: false,
  },
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8080";
    // Trim trailing slash if present to avoid duplicate slashes in destination
    const formattedBackendUrl = backendUrl.endsWith("/") ? backendUrl.slice(0, -1) : backendUrl;
    return [
      {
        source: "/api/:path*",
        destination: `${formattedBackendUrl}/api/:path*`,
      },
    ];
  },
} as any;

export default nextConfig;

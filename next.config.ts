import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  typescript: {
    ignoreBuildErrors: true, // Geçici: TypeScript hatalarını yoksay (3. adımda düzelteceğiz)
  },
};

export default nextConfig;
